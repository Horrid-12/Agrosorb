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
}

export interface WaterQuality {
  /** Nephelometric turbidity units (simulated). */
  turbidity: number
  /** Model contaminant concentration, mg/L (simulated, non-real compound). */
  contaminant: number
  /** Acidity / alkalinity indicator (simulated). */
  pH: number
}

/** Per-layer water quality after passing through a single bed. */
export interface LayerBreakdown {
  material: FilterMaterial
  thickness: number
  turbidityAfter: number
  contaminantAfter: number
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
  overallEfficiency: number
  /** Relative contact time unit produced by the engine. */
  contactTime: number
  breakdown: LayerBreakdown[]
}

export interface ConfigValidation {
  valid: boolean
  errors: string[]
  warnings: string[]
  tips: string[]
}

export type SimPhase = 'idle' | 'raining' | 'runoff' | 'complete'

export type HudPanel = 'config' | 'results' | 'learn' | 'experiments' | null

/* ------------------------------------------------------------------ *
 * Experiment Mode
 * ------------------------------------------------------------------ */

export type ScenarioId = 'muddy-river' | 'chemical-runoff' | 'filter-optimization'

/** 'free' is the sandbox mode with no objectives. */
export type GameMode = 'free' | ScenarioId

export type ObjectiveMetric =
  | 'turbidityRemoval'
  | 'contaminantRemoval'
  | 'overallEfficiency'
  | 'finalTurbidity'
  | 'finalContaminant'
  | 'finalPH'
  | 'totalDepth'
  | 'contactTime'
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
  start: { rainIntensity: number; flowRate: number }
  /** Illustrative influent composition (simulated, overrides storm baseline). */
  water: Partial<WaterQuality>
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
