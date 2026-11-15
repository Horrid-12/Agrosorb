import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  ConfigValidation,
  FilterLayer,
  FilterMaterial,
  HudPanel,
  SimPhase,
  SimResult,
} from '@/types'
import {
  COLUMN_LIMITS,
  DEFAULT_FLOW_RATE,
  RAIN,
  TREATMENT,
} from '@/simulation/models/constants'
import {
  estimateMaterialCost,
  evaluateObjectives,
  initialWaterForScenario,
} from '@/simulation/calculations/metrics'
import {
  initialWaterFromStorm,
  simulateFiltration,
  validateConfig,
  validateConfigCached,
} from '@/simulation/engine/filtrationEngine'
import { SCENARIOS } from '@/data/scenarios'
import type { GameMode, ObjectiveResult, SavedExperiment } from '@/types'

let nextLayerId = 1
const makeLayerId = () => `layer-${nextLayerId++}`

/** Default starter column: a classic sand-over-carbon-over-gravel train. */
function defaultConfig(): FilterLayer[] {
  return [
    { id: makeLayerId(), material: 'sand', thickness: 3 },
    { id: makeLayerId(), material: 'carbon', thickness: 3 },
    { id: makeLayerId(), material: 'gravel', thickness: 2 },
  ]
}

/**
 * Visual treatment stages. The engine math is instant and deterministic;
 * these stages only sequence the in-scene animation before the result is
 * committed (see `TREATMENT` in constants).
 */
export type TreatmentStage = 'idle' | 'filling' | 'filtering' | 'draining' | 'done'
export type SimStatus = 'idle' | 'running' | 'complete' | 'error'

const NEXT_STAGE: Record<string, TreatmentStage> = {
  filling: 'filtering',
  filtering: 'draining',
  draining: 'done',
}

interface SimulationState {
  /* Environment / game phase */
  phase: SimPhase
  rainIntensity: number
  runoffTriggered: boolean

  /* Column configuration */
  layers: FilterLayer[]
  flowRate: number

  /* Treatment process */
  simStatus: SimStatus
  treatmentStage: TreatmentStage
  /** Seconds elapsed inside the current treatment stage. */
  stageElapsed: number
  simError: string[] | null
  pendingResult: SimResult | null

  /* Results */
  result: SimResult | null
  history: SimResult[]

  /* Experiment Mode */
  activeScenario: GameMode
  /** Objectives evaluated against the last committed result (null in free mode). */
  lastEvaluation: ObjectiveResult[] | null
  savedExperiments: SavedExperiment[]

  /* HUD */
  panel: HudPanel
  stationInspecting: boolean

  /* Actions — environment */
  setRainIntensity: (v: number) => void
  startRain: () => void
  stopRain: () => void
  triggerRunoff: () => void
  resetEnvironment: () => void

  /* Actions — column */
  addLayer: (material: FilterMaterial) => void
  removeLayer: (id: string) => void
  setLayerThickness: (id: string, thickness: number) => void
  moveLayer: (id: string, direction: -1 | 1) => void
  clearColumn: () => void
  loadDefaultColumn: () => void
  setFlowRate: (v: number) => void

  /* Actions — simulation */
  runSimulation: () => void
  /** Called every frame while the treatment animation plays. */
  advanceTreatment: (dt: number) => void
  /** Full reset: weather, flow, filter config, status and visual water. History is preserved. */
  resetSimulation: () => void
  clearHistory: () => void

  /* Actions — Experiment Mode */
  startScenario: (id: GameMode) => void
  exitScenario: () => void
  saveExperiment: (name: string) => void
  deleteExperiment: (id: string) => void

  /* Actions — HUD */
  setPanel: (panel: HudPanel) => void
  setStationInspecting: (v: boolean) => void
}

export const useSimulationStore = create<SimulationState>()(
  persist(
    (set, get) => ({
      phase: 'idle',
      rainIntensity: RAIN.defaultIntensity,
      runoffTriggered: false,

      layers: defaultConfig(),
      flowRate: DEFAULT_FLOW_RATE,

      simStatus: 'idle',
      treatmentStage: 'idle',
      stageElapsed: 0,
      simError: null,
      pendingResult: null,

      result: null,
      history: [],

      activeScenario: 'free',
      lastEvaluation: null,
      savedExperiments: [],

      panel: null,
      stationInspecting: false,

      /* ------------------------------------------------------------ */
      setRainIntensity: (v) => set({ rainIntensity: v }),
      startRain: () => set({ phase: 'raining' }),
      stopRain: () =>
        set({ phase: 'idle', runoffTriggered: false }),
      triggerRunoff: () =>
        set({ phase: 'runoff', runoffTriggered: true, rainIntensity: Math.max(get().rainIntensity, RAIN.runoffThreshold) }),
      resetEnvironment: () =>
        set({ phase: 'idle', runoffTriggered: false, rainIntensity: RAIN.defaultIntensity }),

      /* ------------------------------------------------------------ */
      addLayer: (material) => {
        const { layers } = get()
        if (layers.length >= COLUMN_LIMITS.maxLayers) return
        if (totalDepthOf(layers) + COLUMN_LIMITS.defaultThickness > COLUMN_LIMITS.maxTotalThickness) return
        set({
          layers: [
            ...layers,
            { id: makeLayerId(), material, thickness: COLUMN_LIMITS.defaultThickness },
          ],
        })
      },
      removeLayer: (id) =>
        set({ layers: get().layers.filter((l) => l.id !== id) }),
      setLayerThickness: (id, thickness) =>
        set({
          layers: get().layers.map((l) =>
            l.id === id
              ? {
                  ...l,
                  thickness: clamp(thickness, COLUMN_LIMITS.minThickness, COLUMN_LIMITS.maxThickness),
                }
              : l,
          ),
        }),
      moveLayer: (id, direction) => {
        const layers = [...get().layers]
        const i = layers.findIndex((l) => l.id === id)
        const j = i + direction
        if (i === -1 || j < 0 || j >= layers.length) return
        ;[layers[i], layers[j]] = [layers[j], layers[i]]
        set({ layers })
      },
      clearColumn: () => set({ layers: [] }),
      loadDefaultColumn: () => set({ layers: defaultConfig() }),
      setFlowRate: (v) => set({ flowRate: v }),

      /* ------------------------------------------------------------ */
      /**
       * Validate → generate storm input → compute result (deterministic
       * engine) → hand off to the animated treatment sequence. The result
       * is only committed to `result`/`history` when the animation ends.
       */
      runSimulation: () => {
        const { layers, flowRate, rainIntensity, simStatus, activeScenario } = get()
        if (simStatus === 'running') return

        const validation = validateConfig(layers)
        if (!validation.valid) {
          set({ simStatus: 'error', simError: validation.errors, treatmentStage: 'idle', stageElapsed: 0 })
          return
        }

        // Scenario mode uses the scenario's illustrative influent
        // composition; free mode scales with the current storm.
        const initial =
          activeScenario !== 'free'
            ? initialWaterForScenario(SCENARIOS[activeScenario], rainIntensity)
            : initialWaterFromStorm(rainIntensity)

        const pendingResult = simulateFiltration(
          layers,
          flowRate,
          initial,
          { id: `sim-${Date.now()}-${Math.floor(Math.random() * 1e4)}`, timestamp: Date.now() },
        )
        set({
          pendingResult,
          simStatus: 'running',
          simError: null,
          treatmentStage: 'filling',
          stageElapsed: 0,
        })
      },

      /** Frame driver: advances the visual treatment sequence. */
      advanceTreatment: (dt) => {
        const s = get()
        if (s.simStatus !== 'running' || !s.pendingResult) return
        const duration = TREATMENT.stageDurations[s.treatmentStage as keyof typeof TREATMENT.stageDurations]
        if (!duration) return

        let elapsed = s.stageElapsed + dt
        let stage: TreatmentStage = s.treatmentStage
        while (elapsed >= duration) {
          elapsed -= duration
          const next = NEXT_STAGE[stage]
          if (!next || next === 'done') {
            // Sequence finished — commit the pending result and evaluate
            // the active scenario's objectives against the ACTUAL output.
            const result = s.pendingResult
            const evaluation =
              s.activeScenario !== 'free'
                ? evaluateObjectives(result, SCENARIOS[s.activeScenario])
                : null
            set({
              treatmentStage: 'done',
              stageElapsed: 0,
              simStatus: 'complete',
              simError: null,
              result,
              lastEvaluation: evaluation,
              history: [result, ...s.history].slice(0, 12),
              phase: 'complete',
            })
            return
          }
          stage = next
        }
        set({ treatmentStage: stage, stageElapsed: elapsed })
      },

      /**
       * Full reset: weather, water flow state, filter configuration back
       * to its default, simulation status and in-scene water visuals.
       * In scenario mode, conditions return to the scenario's START
       * values instead of free-mode defaults. History and saved
       * experiments are preserved.
       */
      resetSimulation: () => {
        const s = get()
        const scenario = s.activeScenario !== 'free' ? SCENARIOS[s.activeScenario] : null
        set({
          phase: 'idle',
          rainIntensity: scenario?.start.rainIntensity ?? RAIN.defaultIntensity,
          runoffTriggered: false,
          layers: defaultConfig(),
          flowRate: scenario?.start.flowRate ?? DEFAULT_FLOW_RATE,
          simStatus: 'idle',
          treatmentStage: 'idle',
          stageElapsed: 0,
          simError: null,
          pendingResult: null,
          result: null,
          lastEvaluation: null,
        })
      },

      clearHistory: () => set({ history: [] }),

      /* ------------------------------------------------------------ */
      /** Enter a scenario (or 'free' mode) and apply its start conditions. */
      startScenario: (id) => {
        const scenario = id !== 'free' ? SCENARIOS[id] : null
        set({
          activeScenario: id,
          phase: 'idle',
          runoffTriggered: false,
          rainIntensity: scenario?.start.rainIntensity ?? RAIN.defaultIntensity,
          flowRate: scenario?.start.flowRate ?? DEFAULT_FLOW_RATE,
          simStatus: 'idle',
          treatmentStage: 'idle',
          stageElapsed: 0,
          simError: null,
          pendingResult: null,
          result: null,
          lastEvaluation: null,
        })
      },

      exitScenario: () => get().startScenario('free'),

      /** Save the committed result as a named experiment. */
      saveExperiment: (name) => {
        const { result, lastEvaluation, activeScenario, savedExperiments } = get()
        if (!result) return
        const experiment: SavedExperiment = {
          id: `exp-${Date.now()}-${Math.floor(Math.random() * 1e4)}`,
          name: name.trim() || `Run ${savedExperiments.length + 1}`,
          timestamp: Date.now(),
          scenarioId: activeScenario,
          result,
          cost: estimateMaterialCost(result.config),
          evaluation: lastEvaluation,
          passed: !!lastEvaluation && lastEvaluation.every((o) => o.passed),
        }
        set({ savedExperiments: [experiment, ...savedExperiments].slice(0, 30) })
      },

      deleteExperiment: (id) =>
        set({ savedExperiments: get().savedExperiments.filter((e) => e.id !== id) }),

      /* ------------------------------------------------------------ */
      setPanel: (panel) => set({ panel }),
      setStationInspecting: (v) => set({ stationInspecting: v }),
    }),
    {
      name: 'agrosorb-simulation',
      // Only persist user-authored state; transient treatment state stays in memory.
      partialize: (s) => ({
        layers: s.layers,
        flowRate: s.flowRate,
        history: s.history,
        rainIntensity: s.rainIntensity,
        activeScenario: s.activeScenario,
        savedExperiments: s.savedExperiments,
      }),
      // Rehydration must never resurrect a mid-treatment state.
      onRehydrateStorage: () => (state) => {
        if (state && state.simStatus === 'running') {
          useSimulationStore.setState({
            simStatus: 'idle',
            treatmentStage: 'idle',
            stageElapsed: 0,
            pendingResult: null,
          })
        }
      },
    },
  ),
)

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v))
}

function totalDepthOf(layers: FilterLayer[]) {
  return layers.reduce((s, l) => s + l.thickness, 0)
}

/** Selector: validation for the current column (identity-cached — stable reference). */
export const selectValidation = (s: SimulationState): ConfigValidation =>
  validateConfigCached(s.layers)

/** Selector: total bed depth in cm. */
export const selectTotalDepth = (s: SimulationState): number =>
  s.layers.reduce((sum, l) => sum + l.thickness, 0)

/** Selector: can a new simulation be started right now? */
export const selectCanRun = (s: SimulationState): boolean =>
  s.layers.length > 0 && validateConfigCached(s.layers).valid && s.simStatus !== 'running'

/**
 * Selector: overall treatment progress 0..1 across all three stages,
 * for progress bars in the HUD.
 */
export function selectTreatmentProgress(s: SimulationState): number {
  if (s.simStatus === 'complete') return 1
  if (s.simStatus !== 'running') return 0
  const d = TREATMENT.stageDurations
  const idx = TREATMENT.stageOrder.indexOf(s.treatmentStage as (typeof TREATMENT.stageOrder)[number])
  if (idx < 0) return 0
  const done = TREATMENT.stageOrder
    .slice(0, idx)
    .reduce((sum: number, k) => sum + d[k], 0)
  const current = Math.min(s.stageElapsed, d[TREATMENT.stageOrder[idx]])
  const total = d.filling + d.filtering + d.draining
  return Math.min(1, (done + current) / total)
}

/** Human-readable label for the current treatment stage. */
export const STAGE_LABEL: Record<TreatmentStage, string> = {
  idle: 'Standby',
  filling: 'Filling column…',
  filtering: 'Water passing through filter…',
  draining: 'Draining to collection tank…',
  done: 'Treatment complete',
}
