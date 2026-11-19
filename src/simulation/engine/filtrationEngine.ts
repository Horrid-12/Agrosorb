import type {
  ConfigValidation,
  FilterLayer,
  LayerBreakdown,
  SimResult,
  WaterQuality,
} from '@/types'
import {
  ADSORPTION_CAPACITY_PER_CM,
  ADSORPTION_FOULING,
  BYPASS_PER_EXCESS_LPM,
  COLUMN_LIMITS,
  CONDITION_MIN,
  CONDITION_WARN,
  CONTAMINANT_REFRACTORY_FRACTION,
  CONTACT_TIME_SCALE,
  DESIGN_FLOW_RATE,
  INITIAL_WATER,
  MATERIAL_PARAMS,
  MAX_BYPASS_FRACTION,
  SOLIDS_CAPACITY_PER_CM,
} from '../models/constants'
import { MATERIALS } from '@/data/materials'

/* ------------------------------------------------------------------ *
 * AgroSorb educational filtration model
 * ------------------------------------------------------------------ *
 *
 * The model is deterministic: the same configuration, order, thicknesses
 * and flow rate always produce the same result.
 *
 * Water flows top-to-bottom through the layer stack, in array order.
 *
 * 1. TURBIDITY (suspended particles)
 *    Beer–Lambert style exponential attenuation per bed:
 *        T_out = T_in · e^(−k_turb · d)
 *    where k_turb is the material's turbidity coefficient and d the bed
 *    depth in cm. Finer media (sand) attenuate far more than coarse
 *    gravel. Activated carbon granules are coarse, so they contribute
 *    little to particle removal — a deliberate teaching point.
 *
 * 2. DISSOLVED MODEL CONTAMINANT (adsorption)
 *    Pseudo-first-order uptake against contact time:
 *        C_out = C_in · e^(−K_ads · d_eff · t)
 *    where d_eff is the adsorbent depth and t the contact-time factor
 *    (total bed depth ÷ flow rate). Higher flow → shorter contact time
 *    → less adsorption. Physical turbidity removal is unaffected by
 *    flow in this simplified model.
 *
 * 3. NUTRIENTS
 *    - Phosphate is attenuated by media contact (a simplified mixture of
 *      particle-bound settling and surface retention):
 *        P_out = P_in · e^(−k_P · d · t)
 *    - Nitrate is only weakly attenuated by the modelled media. Real
 *      nitrate control usually needs biological denitrification or ion
 *      exchange, which this column does not contain; the small coefficients
 *      deliberately keep nitrate removal modest.
 *
 * 4. pH
 *    Each bed nudges pH slightly toward 7, proportional to depth:
 *        pH += (7 − pH) · (1 − e^(−f · d))
 *
 * 5. HYDRAULIC OVERLOAD & LOADING
 *    Flow above the design rate shortens contact time and forces a modelled
 *    fraction of untreated bypass. Captured solids and contaminant loads are
 *    compared with illustrative per-centimetre bed capacities to report
 *    loading / saturation.
 *
 * All coefficients live in `simulation/models/constants.ts`.
 * ------------------------------------------------------------------ */

/** A bed participates unless it has been explicitly disabled. */
export function isLayerEnabled(layer: FilterLayer): boolean {
  return layer.enabled !== false
}

/** Only enabled beds are part of the hydraulic path. */
export function activeLayers(layers: FilterLayer[]): FilterLayer[] {
  return layers.filter(isLayerEnabled)
}

/** Depth (cm) of a layer, derived from material quantity. */
export function layerDepth(layer: FilterLayer): number {
  return layer.thickness
}

/** Total active bed depth of the column (cm). */
export function totalDepth(layers: FilterLayer[]): number {
  return activeLayers(layers).reduce((sum, l) => sum + layerDepth(l), 0)
}

/** Relative contact-time factor: deeper bed + lower flow = more contact. */
export function contactTimeFactor(layers: FilterLayer[], flowRate: number): number {
  const depth = totalDepth(layers)
  return (depth / Math.max(flowRate, 0.1)) * CONTACT_TIME_SCALE
}

/** Media condition in the documented 0.05..1 range. */
export function layerCondition(layer: FilterLayer): number {
  const raw = layer.condition ?? 1
  return Math.max(CONDITION_MIN, Math.min(1, raw))
}

/** Beer–Lambert style turbidity decay through one bed. */
function turbidityThrough(tIn: number, kTurb: number, depth: number): number {
  return tIn * Math.exp(-kTurb * depth)
}

/** Pseudo-first-order adsorption decay through one bed. */
function contaminantThrough(
  cIn: number,
  kAds: number,
  depth: number,
  tFactor: number,
  fouling: number,
  condition: number,
): number {
  return cIn * Math.exp(-kAds * fouling * condition * depth * tFactor)
}

/** Dissolved nutrient attenuation through one bed. */
function nutrientThrough(
  cIn: number,
  k: number,
  depth: number,
  tFactor: number,
  condition: number,
): number {
  return cIn * Math.exp(-k * (0.25 + 0.75 * condition) * depth * tFactor)
}

/** pH drift toward neutral through one bed. */
function pHThrough(pH: number, f: number, depth: number): number {
  return pH + (7 - pH) * (1 - Math.exp(-f * depth))
}

/** Clamp a value into [0, 100]. */
const pct = (x: number) => Math.max(0, Math.min(100, x))

/**
 * Storm-driven simulation input. A heavy-rain event mobilizes soil and
 * dissolved model contaminant proportionally to rainfall intensity:
 *
 *   turbidity    30 → 100 NTU   (bare-soil erosion assumption)
 *   contaminant   5 →  14 mg/L  (wash-off assumption, model compound)
 *   nitrate       1 →   8 mg/L  (nutrient wash-off assumption)
 *   phosphate   0.4 → 3.0 mg/L  (partly sediment-bound assumption)
 *   pH            fixed 6.4     (slightly acidic farmland assumption)
 *
 * These couplings are MODEL ASSUMPTIONS chosen for teaching — they are
 * not experimentally verified relationships.
 */
export function initialWaterFromStorm(intensity: number): WaterQuality {
  const i = Math.max(0, Math.min(1, intensity))
  return {
    turbidity: round(30 + 70 * i, 1),
    contaminant: round(5 + 9 * i, 2),
    nitrate: round(1 + 7 * i, 2),
    phosphate: round(0.4 + 2.6 * i, 2),
    pH: 6.4,
  }
}

/**
 * Validate a filter configuration before running the engine.
 * Returns actionable errors, warnings and teaching tips for the UI.
 */
export function validateConfig(layers: FilterLayer[]): ConfigValidation {
  const errors: string[] = []
  const warnings: string[] = []
  const tips: string[] = []
  const active = activeLayers(layers)

  if (layers.length === 0) {
    errors.push('Add at least one filter layer before running the simulation.')
  } else if (active.length === 0) {
    errors.push('Every layer is disabled — enable at least one bed to treat water.')
  }
  if (layers.length > COLUMN_LIMITS.maxLayers) {
    errors.push(`A column can hold at most ${COLUMN_LIMITS.maxLayers} layers.`)
  }
  for (const layer of active) {
    if (layer.thickness < COLUMN_LIMITS.minThickness) {
      errors.push(`Every layer needs at least ${COLUMN_LIMITS.minThickness} cm of media.`)
      break
    }
  }
  if (totalDepth(layers) > COLUMN_LIMITS.maxTotalThickness) {
    errors.push(`Total bed depth must not exceed ${COLUMN_LIMITS.maxTotalThickness} cm.`)
  }

  if (active.length > 0 && active.every((l) => l.material === 'gravel')) {
    warnings.push('A gravel-only column drains fast but barely removes particles or dissolved contaminants.')
  }

  const first = active[0]?.material
  if (first === 'gravel' && active.length > 1) {
    warnings.push('Coarse gravel on top lets particles pass through to deeper layers — try fine media first.')
  }

  const carbonIndex = active.findIndex((l) => l.material === 'carbon')
  const sandIndex = active.findIndex((l) => l.material === 'sand')
  if (carbonIndex !== -1 && sandIndex !== -1 && carbonIndex < sandIndex) {
    tips.push('Tip: placing sand above activated carbon protects the carbon pores from clogging by particles.')
  }
  if (carbonIndex === -1 && active.length > 0) {
    tips.push('Tip: dissolved contaminants need activated carbon — physical filters alone cannot capture them.')
  }
  if (active.length > 0 && totalDepth(layers) < 4) {
    tips.push('Tip: shallow beds treat little water — try increasing layer depth for more contact time.')
  }
  if (active.some((l) => layerCondition(l) < CONDITION_WARN)) {
    warnings.push('One or more beds are heavily exhausted — condition reduces both filtration and adsorption performance.')
  }
  if (layers.some((l) => !isLayerEnabled(l))) {
    tips.push('Disabled beds are bypassed by the engine. Re-enable a layer to include it in the treatment train.')
  }

  return { valid: errors.length === 0, errors, warnings, tips }
}

/**
 * Identity-cached wrapper around `validateConfig`.
 *
 * Zustand selectors must return stable references (Object.is) or every
 * store read looks "changed" and React re-renders forever. Layer arrays
 * are replaced (never mutated) on each edit, so caching by array identity
 * is safe and keeps selectors pure.
 */
const validationCache = new WeakMap<object, ConfigValidation>()
export function validateConfigCached(layers: FilterLayer[]): ConfigValidation {
  const cached = validationCache.get(layers)
  if (cached) return cached
  const result = validateConfig(layers)
  validationCache.set(layers, result)
  return result
}

/**
 * Run the educational filtration model for a given column configuration.
 * Pure function — no side effects, no randomness. The caller supplies
 * `id` and `timestamp` (identity metadata), keeping the model itself
 * fully deterministic.
 */
export function simulateFiltration(
  layers: FilterLayer[],
  flowRate: number,
  initial: WaterQuality = INITIAL_WATER,
  meta: { id: string; timestamp: number } = {
    id: `sim-${Date.now()}-${Math.floor(Math.random() * 1e4)}`,
    timestamp: Date.now(),
  },
): SimResult {
  const { id, timestamp } = meta
  const active = activeLayers(layers)
  const tFactor = contactTimeFactor(layers, flowRate)

  // Hydraulic overload: flow above the design rate forces a modelled
  // fraction of untreated water around the media.
  const hydraulicLoad = flowRate / DESIGN_FLOW_RATE
  const excessFlow = Math.max(0, flowRate - DESIGN_FLOW_RATE)
  const bypass = Math.min(MAX_BYPASS_FRACTION, excessFlow * BYPASS_PER_EXCESS_LPM)

  let turbidity = initial.turbidity
  let contaminant = initial.contaminant
  let nitrate = initial.nitrate
  let phosphate = initial.phosphate
  let pH = initial.pH

  let loadAccum = 0
  let loadWeight = 0
  let clogAccum = 0
  let clogWeight = 0

  const breakdown: LayerBreakdown[] = active.map((layer) => {
    const params = MATERIAL_PARAMS[layer.material]
    const depth = layerDepth(layer)
    const condition = layerCondition(layer)

    const turbidityIn = turbidity
    const contaminantIn = contaminant

    // Adsorption fouling: the dirtier the water when it reaches this bed
    // (relative to the column inlet), the less effective adsorption is.
    // This makes the order of media layers matter.
    const fouling =
      1 - ADSORPTION_FOULING * Math.min(1, turbidityIn / Math.max(initial.turbidity, 1e-6))

    // A clogged upstream bed reduces hydraulic contact in downstream beds.
    const upstreamClog = clogWeight > 0 ? clogAccum / clogWeight : 0
    const clogFactor = 1 - 0.2 * upstreamClog

    // Exhausted media filter less effectively.
    const effectiveTurbK =
      params.turbidityK * (0.4 + 0.6 * condition) * Math.max(0.55, clogFactor)

    turbidity = turbidityThrough(turbidity, effectiveTurbK, depth)
    contaminant = contaminantThrough(
      contaminant,
      params.adsorptionK,
      depth,
      tFactor,
      fouling,
      condition,
    )
    nitrate = nutrientThrough(nitrate, params.nitrateK, depth, tFactor, condition)
    phosphate = nutrientThrough(phosphate, params.phosphateK, depth, tFactor, condition)
    pH = pHThrough(pH, params.pHFactor, depth)

    // Illustrative loading / saturation accounting.
    const capturedSolids = Math.max(0, turbidityIn - turbidity)
    const solidsCapacity =
      SOLIDS_CAPACITY_PER_CM[layer.material] * depth * (0.35 + 0.65 * condition)
    const loading = clamp01((capturedSolids * flowRate) / Math.max(solidsCapacity, 1e-6))

    const capturedContaminant = Math.max(0, contaminantIn - contaminant)
    const adsorptionCapacity =
      ADSORPTION_CAPACITY_PER_CM[layer.material] * depth * (0.25 + 0.75 * condition)
    const saturation = clamp01(
      (capturedContaminant * flowRate) / Math.max(adsorptionCapacity, 1e-6),
    )

    loadAccum += loading * depth
    loadWeight += depth
    clogAccum += loading * depth
    clogWeight += depth

    return {
      material: layer.material,
      thickness: depth,
      turbidityAfter: round(turbidity),
      contaminantAfter: round(contaminant, 2),
      nitrateAfter: round(nitrate, 2),
      phosphateAfter: round(phosphate, 2),
      loading: round(loading, 3),
      saturation: round(saturation, 3),
    }
  })

  // Apply hydraulic bypass: a fraction of the raw influent leaves untreated.
  const mixBypass = (treated: number, raw: number) => treated * (1 - bypass) + raw * bypass
  const finalTurbidity = mixBypass(turbidity, initial.turbidity)
  const finalNitrate = mixBypass(nitrate, initial.nitrate)
  const finalPhosphate = mixBypass(phosphate, initial.phosphate)
  // Leave a small refractory residual: the model never claims 100% removal
  // of the dissolved model contaminant.
  const finalContaminant = Math.max(
    mixBypass(contaminant, initial.contaminant),
    initial.contaminant * CONTAMINANT_REFRACTORY_FRACTION,
  )

  const turbidityRemoval = removalPct(initial.turbidity, finalTurbidity)
  const contaminantRemoval = removalPct(initial.contaminant, finalContaminant)
  const nitrateRemoval = removalPct(initial.nitrate, finalNitrate)
  const phosphateRemoval = removalPct(initial.phosphate, finalPhosphate)

  // The headline efficiency deliberately stays the mean of the two original
  // teaching targets (particles + model contaminant) so existing challenges
  // remain comparable. Nutrient removals are reported separately.
  const overallEfficiency = pct((turbidityRemoval + contaminantRemoval) / 2)

  return {
    id,
    timestamp,
    config: layers.map((l) => ({ ...l })),
    flowRate,
    initial: { ...initial },
    final: {
      turbidity: round(finalTurbidity),
      contaminant: round(finalContaminant, 2),
      nitrate: round(finalNitrate, 2),
      phosphate: round(finalPhosphate, 2),
      pH: round(pH, 2),
    },
    turbidityRemoval: round(turbidityRemoval, 1),
    contaminantRemoval: round(contaminantRemoval, 1),
    nitrateRemoval: round(nitrateRemoval, 1),
    phosphateRemoval: round(phosphateRemoval, 1),
    overallEfficiency: round(overallEfficiency, 1),
    contactTime: round(tFactor, 2),
    filterLoading: round(loadWeight > 0 ? loadAccum / loadWeight : 0, 3),
    hydraulicLoad: round(hydraulicLoad, 2),
    overflow: bypass > 0.001,
    breakdown,
  }
}

function removalPct(before: number, after: number): number {
  if (before <= 0) return 0
  return pct(((before - after) / before) * 100)
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v))
}

function round(value: number, decimals = 1): number {
  const f = 10 ** decimals
  return Math.round(value * f) / f
}

/** Human-readable summary of a configuration, e.g. "Sand 3cm → Carbon 5cm → Gravel 2cm". */
export function describeConfig(layers: FilterLayer[]): string {
  if (layers.length === 0) return 'Empty column'
  return layers
    .map(
      (l) =>
        `${MATERIALS[l.material].name} ${l.thickness}cm${isLayerEnabled(l) ? '' : ' (off)'}`,
    )
    .join(' → ')
}
