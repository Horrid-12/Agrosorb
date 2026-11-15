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

export type HudPanel = 'config' | 'results' | 'learn' | null
