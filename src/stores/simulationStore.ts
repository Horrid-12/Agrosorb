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
  initialWaterFromStorm,
  simulateFiltration,
  validateConfig,
  validateConfigCached,
} from '@/simulation/engine/filtrationEngine'

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
        const { layers, flowRate, rainIntensity, simStatus } = get()
        if (simStatus === 'running') return

        const validation = validateConfig(layers)
        if (!validation.valid) {
          set({ simStatus: 'error', simError: validation.errors, treatmentStage: 'idle', stageElapsed: 0 })
          return
        }

        const pendingResult = simulateFiltration(
          layers,
          flowRate,
          initialWaterFromStorm(rainIntensity),
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
            // Sequence finished — commit the pending result.
            const result = s.pendingResult
            set({
              treatmentStage: 'done',
              stageElapsed: 0,
              simStatus: 'complete',
              simError: null,
              result,
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
       * Historical results are preserved.
       */
      resetSimulation: () =>
        set({
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
        }),

      clearHistory: () => set({ history: [] }),

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
