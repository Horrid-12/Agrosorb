/**
 * Shared domain types for the AgroSorb simulator.
 * These types are used by the simulation engine, the Zustand store
 * and the UI layer alike — keeping rendering and simulation decoupled.
 */

export type FilterMaterial = 'gravel' | 'sand' | 'carbon'

/** Ordered top-to-bottom as the water passes through the column. */
export interface FilterLayer {
  id: string
  material: FilterMaterial
  /** Bed thickness in centimetres. */
  thickness: number
  /**
   * Whether this bed participates in the treatment run. Disabled beds stay
   * in the stack (so they can be re-enabled) but are bypassed by the engine.
   * Missing means enabled, keeping older persisted configurations valid.
   */
  enabled?: boolean
  /**
   * Remaining media condition, 0..1 (1 = fresh, >0.05 = heavily exhausted).
   * Exhausted media filters less and has less remaining adsorption capacity.
   */
  condition?: number
}

export interface WaterQuality {
  /** Nephelometric turbidity units (simulated). */
  turbidity: number
  /** Model contaminant concentration, mg/L (simulated, non-real compound). */
  contaminant: number
  /** Nitrate-nitrogen concentration, mg/L (simulated). */
  nitrate: number
  /** Phosphate concentration, mg/L (simulated). */
  phosphate: number
  /** Acidity / alkalinity indicator (simulated). */
  pH: number
}

/** Per-layer water quality after passing through a single bed. */
export interface LayerBreakdown {
  material: FilterMaterial
  thickness: number
  turbidityAfter: number
  contaminantAfter: number
  nitrateAfter: number
  phosphateAfter: number
  /** Normalised trapped-solids load, 0..1 (illustrative capacity model). */
  loading: number
  /** Normalised adsorbent saturation, 0..1 (0 for non-adsorbing beds). */
  saturation: number
}

export interface SimResult {
  id: string
  /** Unix ms timestamp. */
  timestamp: number
  config: FilterLayer[]
  flowRate: number
  initial: WaterQuality
  final: WaterQuality
  /** Percent removals, 0–100. */
  turbidityRemoval: number
  contaminantRemoval: number
  nitrateRemoval: number
  phosphateRemoval: number
  overallEfficiency: number
  /** Relative contact time unit produced by the engine. */
  contactTime: number
  /** Normalised trapped-solids load of the whole column, 0..1. */
  filterLoading: number
  /** Flow ÷ design flow. Values above 1 indicate hydraulic overload. */
  hydraulicLoad: number
  /** True when excessive flow forces untreated bypass in the model. */
  overflow: boolean
  /** Pollution scenario in effect when the run was committed. */
  pollutionScenario?: PollutionScenarioId
  breakdown: LayerBreakdown[]
}

export interface ConfigValidation {
  valid: boolean
  errors: string[]
  warnings: string[]
  tips: string[]
}

export type SimPhase = 'idle' | 'raining' | 'runoff' | 'complete'

export type HudPanel =
  | 'scenario'
  | 'config'
  | 'inspection'
  | 'results'
  | 'learn'
  | null

/* ------------------------------------------------------------------ *
 * Environmental / pollution scenarios
 * ------------------------------------------------------------------ */

export type PollutionScenarioId =
  | 'soil-erosion'
  | 'pesticide-runoff'
  | 'fertilizer-pollution'
  | 'mixed-contamination'
  | 'extreme-rainfall'

/**
 * Art-direction hints for a pollution scenario. These describe how the
 * scenario is *illustrated*; they never override the simulation numbers.
 */
export interface ScenarioVisuals {
  /** Base channel/river tint before turbidity blending. */
  waterTint: string
  /** Suspended-soil particle colour. */
  sedimentColor: string
  /** Dissolved model-contaminant tracer colour (visual only). */
  tracerColor: string
  /** Nutrient tracer colour (visual only). */
  nutrientColor: string
  /** Whether nutrient tracers / algae effects are relevant. */
  nutrients: boolean
  /** Whether suspended soil particles should be visible. */
  sediment: boolean
  /** Algae-bloom potential in receiving water, 0..1. */
  algaePotential: number
  /** Flood / channel-overflow susceptibility, 0..1. */
  floodPotential: number
}

/**
 * A selectable environmental scenario. `baseline` is the illustrative
 * influent at full rainfall + full erosion; the scenario response curves
 * scale it down for gentler conditions. All values are simulated.
 */
export interface PollutionScenario {
  id: PollutionScenarioId
  name: string
  tagline: string
  brief: string
  icon: 'erosion' | 'pesticide' | 'fertilizer' | 'mixed' | 'storm'
  baseline: WaterQuality
  /** Multiplier curves applied to the baseline at current rain/erosion. */
  response: {
    turbidityRain: number
    turbidityErosion: number
    contaminantRain: number
    nitrateRain: number
    phosphateRain: number
    phosphateErosion: number
  }
  start: {
    rainIntensity: number
    erosionIntensity: number
    flowRate: number
    timeOfDay: number
  }
  visuals: ScenarioVisuals
  /** Short teaching notes shown in the scenario panel. */
  notes: string[]
}

/* ------------------------------------------------------------------ *
 * Experiment Mode
 * ------------------------------------------------------------------ */

export type ScenarioId = 'muddy-river' | 'chemical-runoff' | 'filter-optimization'

/** 'free' is the sandbox mode with no objectives. */
export type GameMode = 'free' | ScenarioId

export type ObjectiveMetric =
  | 'turbidityRemoval'
  | 'contaminantRemoval'
  | 'nitrateRemoval'
  | 'phosphateRemoval'
  | 'overallEfficiency'
  | 'finalTurbidity'
  | 'finalContaminant'
  | 'finalNitrate'
  | 'finalPhosphate'
  | 'finalPH'
  | 'totalDepth'
  | 'contactTime'
  | 'filterLoading'
  | 'cost'

export interface Objective {
  id: string
  text: string
  metric: ObjectiveMetric
  op: '<' | '<=' | '>' | '>='
  target: number
  /** Display unit for the measured value (%, NTU, mg/L, cm, credits…). */
  unit: string
}

/** An objective evaluated against an ACTUAL simulation result. */
export interface ObjectiveResult extends Objective {
  passed: boolean
  actual: number
}

export interface Scenario {
  id: ScenarioId
  name: string
  tagline: string
  brief: string
  /** Conditions applied when the scenario starts. */
  start: { rainIntensity: number; flowRate: number; erosionIntensity?: number }
  /** Illustrative influent composition (simulated, overrides storm baseline). */
  water: Partial<WaterQuality>
  /** Environmental scenario used for the scene and tracer art direction. */
  pollutionScenario: PollutionScenarioId
  /** Optional material budget (total bed depth, cm). */
  budget?: number
  objectives: Objective[]
}

export interface SavedExperiment {
  id: string
  name: string
  timestamp: number
  scenarioId: GameMode
  result: SimResult
  /** Illustrative material cost (credits). */
  cost: number
  /** Objectives evaluated against the actual result (null in free mode). */
  evaluation: ObjectiveResult[] | null
  passed: boolean
}
