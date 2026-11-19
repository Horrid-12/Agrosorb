import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type {
  ConfigValidation,
  FilterLayer,
  FilterMaterial,
  HudPanel,
  PollutionScenarioId,
  SimPhase,
  SimResult,
  WaterQuality,
} from '@/types'
import {
  COLUMN_LIMITS,
  CONDITION_MIN,
  DEFAULT_FLOW_RATE,
  DESIGN_FLOW_RATE,
  INITIAL_WATER,
  RAIN,
  TREATMENT,
} from '@/simulation/models/constants'
import {
  estimateMaterialCost,
  evaluateObjectives,
  initialWaterForScenario,
} from '@/simulation/calculations/metrics'
import {
  isLayerEnabled,
  simulateFiltration,
  totalDepth,
  validateConfig,
  validateConfigCached,
} from '@/simulation/engine/filtrationEngine'
import { SCENARIOS } from '@/data/scenarios'
import {
  INFLUENT_LIMITS,
  POLLUTION_SCENARIOS,
  deriveScenarioInfluent,
  isPollutionScenarioId,
} from '@/data/pollutionScenarios'
import type { GameMode, ObjectiveResult, SavedExperiment } from '@/types'

let nextLayerId = 1
const makeLayerId = () => `layer-${nextLayerId++}`

/** Environmental scenario shown on first load and after leaving a challenge. */
const DEFAULT_POLLUTION_SCENARIO: PollutionScenarioId = 'mixed-contamination'

/** Default starter column: a classic sand-over-carbon-over-gravel train. */
function defaultConfig(): FilterLayer[] {
  return [
    { id: makeLayerId(), material: 'sand', thickness: 3, enabled: true, condition: 1 },
    { id: makeLayerId(), material: 'carbon', thickness: 3, enabled: true, condition: 1 },
    { id: makeLayerId(), material: 'gravel', thickness: 2, enabled: true, condition: 1 },
  ]
}

function initialInfluent(
  scenarioId: PollutionScenarioId = DEFAULT_POLLUTION_SCENARIO,
  rain = RAIN.defaultIntensity,
  erosion = POLLUTION_SCENARIOS[DEFAULT_POLLUTION_SCENARIO].start.erosionIntensity,
): WaterQuality {
  return deriveScenarioInfluent(POLLUTION_SCENARIOS[scenarioId], rain, erosion)
}

function clamp01(v: number) {
  return Math.max(0, Math.min(1, v))
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
  erosionIntensity: number
  timeOfDay: number
  runoffTriggered: boolean

  /* Environmental scenario + controlled influent chemistry */
  pollutionScenario: PollutionScenarioId
  influent: WaterQuality
  /** True while chemistry follows the scenario's rain/erosion response. */
  autoChemistry: boolean

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
  setErosionIntensity: (v: number) => void
  setTimeOfDay: (v: number) => void
  startRain: () => void
  stopRain: () => void
  triggerRunoff: () => void
  resetEnvironment: () => void

  /* Actions — environmental scenario + influent chemistry */
  setPollutionScenario: (id: PollutionScenarioId) => void
  setInfluentParam: (key: keyof WaterQuality, value: number) => void
  resetInfluentToScenario: () => void

  /* Actions — column */
  addLayer: (material: FilterMaterial) => void
  removeLayer: (id: string) => void
  setLayerThickness: (id: string, thickness: number) => void
  setLayerEnabled: (id: string, enabled: boolean) => void
  setLayerCondition: (id: string, condition: number) => void
  setAllLayerConditions: (condition: number) => void
  moveLayer: (id: string, direction: -1 | 1) => void
  clearColumn: () => void
  loadDefaultColumn: () => void
  setFlowRate: (v: number) => void

  /* Actions — simulation */
  runSimulation: () => void
  /** Re-run the current configuration and chemistry. */
  replaySimulation: () => void
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
      erosionIntensity: POLLUTION_SCENARIOS[DEFAULT_POLLUTION_SCENARIO].start.erosionIntensity,
      timeOfDay: POLLUTION_SCENARIOS[DEFAULT_POLLUTION_SCENARIO].start.timeOfDay,
      runoffTriggered: false,

      pollutionScenario: DEFAULT_POLLUTION_SCENARIO,
      influent: initialInfluent(),
      autoChemistry: true,

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
      setRainIntensity: (v) => {
        const s = get()
        const rainIntensity = clamp01(v)
        // While chemistry is in "auto", rainfall genuinely re-derives the
        // scenario influent. Manual chemistry edits switch auto off.
        const influent = s.autoChemistry
          ? deriveScenarioInfluent(
              POLLUTION_SCENARIOS[s.pollutionScenario],
              rainIntensity,
              s.erosionIntensity,
            )
          : s.influent
        set({ rainIntensity, influent })
      },
      setErosionIntensity: (v) => {
        const s = get()
        const erosionIntensity = clamp01(v)
        const influent = s.autoChemistry
          ? deriveScenarioInfluent(
              POLLUTION_SCENARIOS[s.pollutionScenario],
              s.rainIntensity,
              erosionIntensity,
            )
          : s.influent
        set({ erosionIntensity, influent })
      },
      setTimeOfDay: (v) => set({ timeOfDay: Math.max(0, Math.min(24, v)) }),
      startRain: () => set({ phase: 'raining' }),
      stopRain: () =>
        set({ phase: 'idle', runoffTriggered: false }),
      triggerRunoff: () => {
        const s = get()
        const rainIntensity = Math.max(s.rainIntensity, RAIN.runoffThreshold)
        set({
          phase: 'runoff',
          runoffTriggered: true,
          rainIntensity,
          influent: s.autoChemistry
            ? deriveScenarioInfluent(
                POLLUTION_SCENARIOS[s.pollutionScenario],
                rainIntensity,
                s.erosionIntensity,
              )
            : s.influent,
        })
      },
      resetEnvironment: () => {
        const s = get()
        const scenario = POLLUTION_SCENARIOS[s.pollutionScenario]
        const rainIntensity = scenario.start.rainIntensity
        const erosionIntensity = scenario.start.erosionIntensity
        set({
          phase: 'idle',
          runoffTriggered: false,
          rainIntensity,
          erosionIntensity,
          autoChemistry: true,
          influent: deriveScenarioInfluent(scenario, rainIntensity, erosionIntensity),
        })
      },

      /* ------------------------------------------------------------ */
      setPollutionScenario: (id) => {
        const scenario = POLLUTION_SCENARIOS[id]
        const { rainIntensity, erosionIntensity } = scenario.start
        set({
          // Choosing an environmental scenario leaves any Experiment Lab
          // challenge, keeping influent chemistry in one source of truth.
          activeScenario: 'free',
          pollutionScenario: id,
          phase: 'idle',
          runoffTriggered: false,
          rainIntensity,
          erosionIntensity,
          timeOfDay: scenario.start.timeOfDay,
          flowRate: scenario.start.flowRate,
          autoChemistry: true,
          influent: deriveScenarioInfluent(scenario, rainIntensity, erosionIntensity),
          simStatus: 'idle',
          treatmentStage: 'idle',
          stageElapsed: 0,
          simError: null,
          pendingResult: null,
          result: null,
          lastEvaluation: null,
        })
      },

      setInfluentParam: (key, value) => {
        const s = get()
        const limit = INFLUENT_LIMITS[key]
        const next = clamp(value, limit.min, limit.max)
        set({
          autoChemistry: false,
          influent: { ...s.influent, [key]: next },
        })
      },

      resetInfluentToScenario: () => {
        const s = get()
        // In Experiment Lab challenges the chemistry is part of the
        // challenge brief, so Baseline restores that composition rather
        // than the environmental scenario's rain/erosion curve.
        if (s.activeScenario !== 'free') {
          set({
            autoChemistry: false,
            influent: initialWaterForScenario(SCENARIOS[s.activeScenario], s.rainIntensity),
          })
          return
        }
        set({
          autoChemistry: true,
          influent: deriveScenarioInfluent(
            POLLUTION_SCENARIOS[s.pollutionScenario],
            s.rainIntensity,
            s.erosionIntensity,
          ),
        })
      },

      /* ------------------------------------------------------------ */
      addLayer: (material) => {
        const { layers } = get()
        if (layers.length >= COLUMN_LIMITS.maxLayers) return
        if (totalDepth(layers) + COLUMN_LIMITS.defaultThickness > COLUMN_LIMITS.maxTotalThickness) return
        set({
          layers: [
            ...layers,
            {
              id: makeLayerId(),
              material,
              thickness: COLUMN_LIMITS.defaultThickness,
              enabled: true,
              condition: 1,
            },
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
      setLayerEnabled: (id, enabled) =>
        set({
          layers: get().layers.map((l) => (l.id === id ? { ...l, enabled } : l)),
        }),
      setLayerCondition: (id, condition) =>
        set({
          layers: get().layers.map((l) =>
            l.id === id
              ? { ...l, condition: clamp(condition, CONDITION_MIN, 1) }
              : l,
          ),
        }),
      setAllLayerConditions: (condition) => {
        const c = clamp(condition, CONDITION_MIN, 1)
        set({ layers: get().layers.map((l) => ({ ...l, condition: c })) })
      },
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
        const { layers, flowRate, influent, simStatus, pollutionScenario } = get()
        if (simStatus === 'running') return

        const validation = validateConfig(layers)
        if (!validation.valid) {
          set({ simStatus: 'error', simError: validation.errors, treatmentStage: 'idle', stageElapsed: 0 })
          return
        }

        const pendingResult = simulateFiltration(
          layers,
          flowRate,
          influent,
          { id: `sim-${Date.now()}-${Math.floor(Math.random() * 1e4)}`, timestamp: Date.now() },
        )
        pendingResult.pollutionScenario = pollutionScenario
        set({
          pendingResult,
          simStatus: 'running',
          simError: null,
          treatmentStage: 'filling',
          stageElapsed: 0,
        })
      },

      replaySimulation: () => {
        const s = get()
        if (s.simStatus === 'running') return
        // Re-use the current configuration and chemistry unchanged.
        s.runSimulation()
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
        if (s.activeScenario !== 'free') {
          const scenario = SCENARIOS[s.activeScenario]
          const pollutionScenario = scenario.pollutionScenario
          const environmental = POLLUTION_SCENARIOS[pollutionScenario]
          const rainIntensity = scenario.start.rainIntensity
          const erosionIntensity =
            scenario.start.erosionIntensity ?? environmental.start.erosionIntensity
          set({
            phase: 'idle',
            rainIntensity,
            erosionIntensity,
            timeOfDay: environmental.start.timeOfDay,
            runoffTriggered: false,
            layers: defaultConfig(),
            flowRate: scenario.start.flowRate,
            pollutionScenario,
            autoChemistry: false,
            influent: initialWaterForScenario(scenario, rainIntensity),
            simStatus: 'idle',
            treatmentStage: 'idle',
            stageElapsed: 0,
            simError: null,
            pendingResult: null,
            result: null,
            lastEvaluation: null,
          })
          return
        }

        const environmental = POLLUTION_SCENARIOS[s.pollutionScenario]
        const rainIntensity = environmental.start.rainIntensity
        const erosionIntensity = environmental.start.erosionIntensity
        set({
          phase: 'idle',
          rainIntensity,
          erosionIntensity,
          timeOfDay: environmental.start.timeOfDay,
          runoffTriggered: false,
          layers: defaultConfig(),
          flowRate: environmental.start.flowRate,
          autoChemistry: true,
          influent: deriveScenarioInfluent(
            environmental,
            rainIntensity,
            erosionIntensity,
          ),
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
        if (id === 'free') {
          const s = get()
          const environmental = POLLUTION_SCENARIOS[s.pollutionScenario]
          const rainIntensity = environmental.start.rainIntensity
          const erosionIntensity = environmental.start.erosionIntensity
          set({
            activeScenario: 'free',
            phase: 'idle',
            runoffTriggered: false,
            rainIntensity,
            erosionIntensity,
            timeOfDay: environmental.start.timeOfDay,
            flowRate: environmental.start.flowRate,
            autoChemistry: true,
            influent: deriveScenarioInfluent(
              environmental,
              rainIntensity,
              erosionIntensity,
            ),
            simStatus: 'idle',
            treatmentStage: 'idle',
            stageElapsed: 0,
            simError: null,
            pendingResult: null,
            result: null,
            lastEvaluation: null,
          })
          return
        }

        const scenario = SCENARIOS[id]
        const environmental = POLLUTION_SCENARIOS[scenario.pollutionScenario]
        const rainIntensity = scenario.start.rainIntensity
        const erosionIntensity =
          scenario.start.erosionIntensity ?? environmental.start.erosionIntensity
        set({
          activeScenario: id,
          pollutionScenario: scenario.pollutionScenario,
          phase: 'idle',
          runoffTriggered: false,
          rainIntensity,
          erosionIntensity,
          timeOfDay: environmental.start.timeOfDay,
          flowRate: scenario.start.flowRate,
          autoChemistry: false,
          influent: initialWaterForScenario(scenario, rainIntensity),
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
      version: 2,
      // Only persist user-authored state; transient treatment state stays in memory.
      partialize: (s) => ({
        layers: s.layers,
        flowRate: s.flowRate,
        history: s.history,
        rainIntensity: s.rainIntensity,
        erosionIntensity: s.erosionIntensity,
        timeOfDay: s.timeOfDay,
        pollutionScenario: s.pollutionScenario,
        influent: s.influent,
        autoChemistry: s.autoChemistry,
        activeScenario: s.activeScenario,
        savedExperiments: s.savedExperiments,
      }),
      // V1 persisted no nutrient fields / layer condition. Fill them with
      // documented defaults instead of letting old records crash the UI.
      migrate: (persisted) => migratePersistedState(persisted),
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

function normalizeWaterQuality(
  value: Partial<WaterQuality> | undefined,
  fallback: WaterQuality,
): WaterQuality {
  const num = (v: unknown, f: number) => (typeof v === 'number' && Number.isFinite(v) ? v : f)
  return {
    turbidity: num(value?.turbidity, fallback.turbidity),
    contaminant: num(value?.contaminant, fallback.contaminant),
    nitrate: num(value?.nitrate, fallback.nitrate),
    phosphate: num(value?.phosphate, fallback.phosphate),
    pH: num(value?.pH, fallback.pH),
  }
}

function normalizeResult(value: unknown): SimResult | null {
  if (!value || typeof value !== 'object') return null
  const r = value as Partial<SimResult> & Record<string, unknown>
  const initial = normalizeWaterQuality(r.initial, INITIAL_WATER)
  const final = normalizeWaterQuality(r.final, initial)
  const config = Array.isArray(r.config) ? (r.config as FilterLayer[]) : []
  const breakdown = Array.isArray(r.breakdown)
    ? r.breakdown.map((raw) => {
        const b = raw as Partial<SimResult['breakdown'][number]>
        return {
          material: b.material ?? 'gravel',
          thickness: b.thickness ?? 0,
          turbidityAfter: b.turbidityAfter ?? initial.turbidity,
          contaminantAfter: b.contaminantAfter ?? initial.contaminant,
          nitrateAfter: b.nitrateAfter ?? initial.nitrate,
          phosphateAfter: b.phosphateAfter ?? initial.phosphate,
          loading: b.loading ?? 0,
          saturation: b.saturation ?? 0,
        }
      })
    : []
  return {
    id: typeof r.id === 'string' ? r.id : `legacy-${Date.now()}`,
    timestamp: typeof r.timestamp === 'number' ? r.timestamp : Date.now(),
    config,
    flowRate: typeof r.flowRate === 'number' ? r.flowRate : DEFAULT_FLOW_RATE,
    initial,
    final,
    turbidityRemoval: typeof r.turbidityRemoval === 'number' ? r.turbidityRemoval : 0,
    contaminantRemoval: typeof r.contaminantRemoval === 'number' ? r.contaminantRemoval : 0,
    nitrateRemoval: typeof r.nitrateRemoval === 'number' ? r.nitrateRemoval : 0,
    phosphateRemoval: typeof r.phosphateRemoval === 'number' ? r.phosphateRemoval : 0,
    overallEfficiency: typeof r.overallEfficiency === 'number' ? r.overallEfficiency : 0,
    contactTime: typeof r.contactTime === 'number' ? r.contactTime : 0,
    filterLoading: typeof r.filterLoading === 'number' ? r.filterLoading : 0,
    hydraulicLoad:
      typeof r.hydraulicLoad === 'number'
        ? r.hydraulicLoad
        : (typeof r.flowRate === 'number' ? r.flowRate : DEFAULT_FLOW_RATE) / DESIGN_FLOW_RATE,
    overflow: r.overflow === true,
    pollutionScenario: isPollutionScenarioId(String(r.pollutionScenario))
      ? (r.pollutionScenario as PollutionScenarioId)
      : undefined,
    breakdown,
  }
}

function migratePersistedState(persisted: unknown): unknown {
  if (!persisted || typeof persisted !== 'object') return persisted
  const state = persisted as Record<string, unknown>

  const pollutionScenario =
    typeof state.pollutionScenario === 'string' && isPollutionScenarioId(state.pollutionScenario)
      ? state.pollutionScenario
      : DEFAULT_POLLUTION_SCENARIO
  const environmental = POLLUTION_SCENARIOS[pollutionScenario]

  const rainIntensity =
    typeof state.rainIntensity === 'number' ? state.rainIntensity : environmental.start.rainIntensity
  const erosionIntensity =
    typeof state.erosionIntensity === 'number'
      ? state.erosionIntensity
      : environmental.start.erosionIntensity

  state.pollutionScenario = pollutionScenario
  state.rainIntensity = rainIntensity
  state.erosionIntensity = erosionIntensity
  state.timeOfDay =
    typeof state.timeOfDay === 'number' ? state.timeOfDay : environmental.start.timeOfDay
  state.autoChemistry = typeof state.autoChemistry === 'boolean' ? state.autoChemistry : true
  state.influent = normalizeWaterQuality(
    state.influent as Partial<WaterQuality> | undefined,
    deriveScenarioInfluent(environmental, rainIntensity, erosionIntensity),
  )

  state.layers = Array.isArray(state.layers)
    ? (state.layers as FilterLayer[]).map((l) => ({
        ...l,
        enabled: l.enabled !== false,
        condition: typeof l.condition === 'number' ? l.condition : 1,
      }))
    : defaultConfig()

  state.history = Array.isArray(state.history)
    ? state.history.map(normalizeResult).filter(Boolean)
    : []

  state.savedExperiments = Array.isArray(state.savedExperiments)
    ? (state.savedExperiments as SavedExperiment[]).map((exp) => ({
        ...exp,
        result: normalizeResult(exp.result) ?? exp.result,
      }))
    : []

  return state
}

/** Selector: validation for the current column (identity-cached — stable reference). */
export const selectValidation = (s: SimulationState): ConfigValidation =>
  validateConfigCached(s.layers)

/** Selector: total active bed depth in cm. */
export const selectTotalDepth = (s: SimulationState): number => totalDepth(s.layers)

/** Selector: number of beds that currently participate in treatment. */
export const selectActiveLayerCount = (s: SimulationState): number =>
  s.layers.filter(isLayerEnabled).length

/** Selector: current hydraulic load relative to the design flow. */
export const selectHydraulicLoad = (s: SimulationState): number =>
  s.flowRate / DESIGN_FLOW_RATE

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
