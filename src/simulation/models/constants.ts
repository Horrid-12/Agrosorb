/**
 * Centralized simulation constants.
 *
 * IMPORTANT CONTEXT
 * -----------------
 * AgroSorb is an *educational* simulator. The parameters below define a
 * deterministic, illustrative mathematical model — they are NOT calibrated
 * against laboratory data and must not be presented as real-world removal
 * performance. All water-quality values shown in the UI are simulated.
 */

/** Influent water quality produced by a heavy runoff event (simulated). */
export const INITIAL_WATER: { turbidity: number; contaminant: number; pH: number } = {
  turbidity: 85, // NTU — muddy surface runoff
  contaminant: 12, // mg/L — generic model compound (no real pesticide implied)
  pH: 6.4,
}

/**
 * Per-material behaviour parameters of the educational model:
 *
 *  - `turbidityK`: exponential attenuation coefficient for suspended
 *    particles (Beer–Lambert style decay per cm of bed depth).
 *  - `adsorptionK`: pseudo-first-order adsorption capacity coefficient,
 *    applied against the contact-time factor.
 *  - `pHFactor`: how strongly the bed nudges pH toward neutral.
 */
export const MATERIAL_PARAMS = {
  gravel: { turbidityK: 0.055, adsorptionK: 0.015, pHFactor: 0.02 },
  sand: { turbidityK: 0.14, adsorptionK: 0.05, pHFactor: 0.05 },
  carbon: { turbidityK: 0.035, adsorptionK: 0.24, pHFactor: 0.08 },
} as const

/** Column design limits enforced by the configurator. */
export const COLUMN_LIMITS = {
  maxLayers: 6,
  minThickness: 0.5, // cm
  maxThickness: 8, // cm
  maxTotalThickness: 24, // cm
  defaultThickness: 3, // cm
} as const

/** Allowed influent flow rates (L/min). Higher flow = less contact time. */
export const FLOW_RATES = [1, 2, 4, 6] as const
export const DEFAULT_FLOW_RATE = 2

/**
 * Contact-time model. Contact time factor = total bed depth / flow rate.
 * `CONTACT_TIME_SCALE` converts that ratio into the engine's relative
 * contact-time unit.
 */
export const CONTACT_TIME_SCALE = 1.6

/** Rainfall presets for the environment controls. */
export const RAIN = {
  /** Rain slider default (0 = drought, 1 = storm). */
  defaultIntensity: 0.5,
  /** Intensity above which surface runoff becomes visible. */
  runoffThreshold: 0.65,
} as const
