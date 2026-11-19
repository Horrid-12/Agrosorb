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
export const INITIAL_WATER = {
  turbidity: 85, // NTU — muddy surface runoff
  contaminant: 12, // mg/L — generic model compound (no real pesticide implied)
  nitrate: 6, // mg/L — simulated nitrate-nitrogen
  phosphate: 2.4, // mg/L — simulated phosphate
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
  gravel: {
    turbidityK: 0.055,
    adsorptionK: 0.015,
    nitrateK: 0.002,
    phosphateK: 0.015,
    pHFactor: 0.02,
  },
  sand: {
    turbidityK: 0.14,
    adsorptionK: 0.05,
    nitrateK: 0.004,
    phosphateK: 0.035,
    pHFactor: 0.05,
  },
  carbon: {
    turbidityK: 0.035,
    adsorptionK: 0.24,
    nitrateK: 0.01,
    phosphateK: 0.05,
    pHFactor: 0.08,
  },
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

/**
 * Adsorption fouling (documented assumption). Suspended particles that
 * reach an adsorbent bed before finer media clog its pores, reducing
 * effective adsorption capacity. Multiplier applied to a bed's
 * adsorption coefficient:
 *
 *     m = 1 − ADSORPTION_FOULING · (T_entering / T_initial)
 *
 * This is what makes layer ORDER educationally meaningful: sand above
 * activated carbon shields it and preserves its capacity.
 */
export const ADSORPTION_FOULING = 0.4

/**
 * Hydraulic overload (documented model assumption).
 *
 * The column is designed for `DESIGN_FLOW_RATE` L/min. Above that, the
 * educational model assumes a growing fraction of influent bypasses the
 * media: contact time already falls with flow, and excess flow also
 * carries untreated water around the beds. This is deliberately a simple
 * teaching rule, not a hydraulic calibration.
 */
export const DESIGN_FLOW_RATE = 4 // L/min
export const MAX_BYPASS_FRACTION = 0.45
export const BYPASS_PER_EXCESS_LPM = 0.11

/**
 * Illustrative media capacity model.
 *
 * `solidsCapacity` has units of NTU·L/min per cm of bed and represents
 * how much suspended material a bed can hold before it is considered
 * loaded. `adsorptionCapacity` has units of mg/L·L/min per cm and
 * represents remaining adsorbent capacity. These are teaching values:
 * they make loading/saturation visible and comparable, but are not
 * bench-measured media constants.
 */
export const SOLIDS_CAPACITY_PER_CM = {
  gravel: 55,
  sand: 42,
  carbon: 50,
} as const

export const ADSORPTION_CAPACITY_PER_CM = {
  gravel: 8,
  sand: 18,
  carbon: 120,
} as const

/**
 * Small non-adsorbable fraction of the model contaminant. The educational
 * model deliberately leaves a residual so the UI never claims complete
 * removal of a dissolved contaminant (especially important for the
 * pesticide-runoff scenario, whose "contaminant" is only a generic model
 * compound, not a real pesticide).
 */
export const CONTAMINANT_REFRACTORY_FRACTION = 0.02

/** Media condition is clamped into this range (0 = not allowed). */
export const CONDITION_MIN = 0.05

/** Condition below which the UI warns that media is heavily exhausted. */
export const CONDITION_WARN = 0.45

/**
 * Animated treatment sequence. When a simulation runs, water visually
 * passes through three stages before the result is committed:
 *
 *   filling   — influent water rises in the filter column
 *   filtering — water percolates through the media beds (layers wet up)
 *   draining  — treated water flows through the outlet into the tank
 *
 * Durations are in seconds. The engine math itself is instantaneous and
 * deterministic; these stages only sequence the *visualization*.
 */
export const TREATMENT = {
  stageOrder: ['filling', 'filtering', 'draining'] as const,
  stageDurations: {
    filling: 2.4,
    filtering: 3.6,
    draining: 2.8,
  },
} as const
