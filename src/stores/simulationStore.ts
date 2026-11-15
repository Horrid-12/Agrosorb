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
  INITIAL_WATER,
  MATERIAL_PARAMS,
  RAIN,
} from '@/simulation/models/constants'
import { simulateFiltration, validateConfig, validateConfigCached } from '@/simulation/engine/filtrationEngine'

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

interface SimulationState {
  /* Environment / game phase */
  phase: SimPhase
  rainIntensity: number
  runoffTriggered: boolean

  /* Column configuration */
  layers: FilterLayer[]
  flowRate: number

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
      runSimulation: () => {
        const { layers, flowRate, history } = get()
        const validation = validateConfig(layers)
        if (!validation.valid) return
        const result = simulateFiltration(layers, flowRate, INITIAL_WATER)
        set({
          result,
          history: [result, ...history].slice(0, 12),
          phase: 'complete',
        })
      },

      /* ------------------------------------------------------------ */
      setPanel: (panel) => set({ panel }),
      setStationInspecting: (v) => set({ stationInspecting: v }),
    }),
    {
      name: 'agrosorb-simulation',
      // Only persist user-authored state; transient game phase stays in memory.
      partialize: (s) => ({
        layers: s.layers,
        flowRate: s.flowRate,
        history: s.history,
        rainIntensity: s.rainIntensity,
      }),
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

/** Selector: can the simulation run right now? */
export const selectCanRun = (s: SimulationState): boolean =>
  validateConfig(s.layers).valid && s.layers.length > 0

/** Exposed for the 3D scene color mapping. */
export const MATERIAL_COLOR_BY_ID = {
  gravel: MATERIAL_PARAMS.gravel,
  sand: MATERIAL_PARAMS.sand,
  carbon: MATERIAL_PARAMS.carbon,
}
