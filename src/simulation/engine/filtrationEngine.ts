import type {
  ConfigValidation,
  FilterLayer,
  LayerBreakdown,
  SimResult,
  WaterQuality,
} from '@/types'
import {
  COLUMN_LIMITS,
  CONTACT_TIME_SCALE,
  INITIAL_WATER,
  MATERIAL_PARAMS,
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
 * 3. pH
 *    Each bed nudges pH slightly toward 7, proportional to depth:
 *        pH += (7 − pH) · (1 − e^(−f · d))
 *
 * All coefficients live in `simulation/models/constants.ts`.
 * ------------------------------------------------------------------ */

/** Depth (cm) of a layer, derived from material quantity. */
export function layerDepth(layer: FilterLayer): number {
  return layer.thickness
}

/** Total bed depth of the column (cm). */
export function totalDepth(layers: FilterLayer[]): number {
  return layers.reduce((sum, l) => sum + layerDepth(l), 0)
}

/** Relative contact-time factor: deeper bed + lower flow = more contact. */
export function contactTimeFactor(layers: FilterLayer[], flowRate: number): number {
  const depth = totalDepth(layers)
  return (depth / Math.max(flowRate, 0.1)) * CONTACT_TIME_SCALE
}

/** Beer–Lambert style turbidity decay through one bed. */
function turbidityThrough(tIn: number, kTurb: number, depth: number): number {
  return tIn * Math.exp(-kTurb * depth)
}

/** Pseudo-first-order adsorption decay through one bed. */
function contaminantThrough(cIn: number, kAds: number, depth: number, tFactor: number): number {
  return cIn * Math.exp(-kAds * depth * tFactor)
}

/** pH drift toward neutral through one bed. */
function pHThrough(pH: number, f: number, depth: number): number {
  return pH + (7 - pH) * (1 - Math.exp(-f * depth))
}

/** Clamp a value into [0, 100]. */
const pct = (x: number) => Math.max(0, Math.min(100, x))

/**
 * Validate a filter configuration before running the engine.
 * Returns actionable errors, warnings and teaching tips for the UI.
 */
export function validateConfig(layers: FilterLayer[]): ConfigValidation {
  const errors: string[] = []
  const warnings: string[] = []
  const tips: string[] = []

  if (layers.length === 0) {
    errors.push('Add at least one filter layer before running the simulation.')
  }
  if (layers.length > COLUMN_LIMITS.maxLayers) {
    errors.push(`A column can hold at most ${COLUMN_LIMITS.maxLayers} layers.`)
  }
  for (const layer of layers) {
    if (layer.thickness < COLUMN_LIMITS.minThickness) {
      errors.push(`Every layer needs at least ${COLUMN_LIMITS.minThickness} cm of media.`)
      break
    }
  }
  if (totalDepth(layers) > COLUMN_LIMITS.maxTotalThickness) {
    errors.push(`Total bed depth must not exceed ${COLUMN_LIMITS.maxTotalThickness} cm.`)
  }

  if (layers.length > 0 && layers.every((l) => l.material === 'gravel')) {
    warnings.push('A gravel-only column drains fast but barely removes particles or dissolved contaminants.')
  }

  const first = layers[0]?.material
  if (first === 'gravel' && layers.length > 1) {
    warnings.push('Coarse gravel on top lets particles pass through to deeper layers — try fine media first.')
  }

  const carbonIndex = layers.findIndex((l) => l.material === 'carbon')
  const sandIndex = layers.findIndex((l) => l.material === 'sand')
  if (carbonIndex !== -1 && sandIndex !== -1 && carbonIndex < sandIndex) {
    tips.push('Tip: placing sand above activated carbon protects the carbon pores from clogging by particles.')
  }
  if (carbonIndex === -1 && layers.length > 0) {
    tips.push('Tip: dissolved contaminants need activated carbon — physical filters alone cannot capture them.')
  }
  if (layers.length > 0 && totalDepth(layers) < 4) {
    tips.push('Tip: shallow beds treat little water — try increasing layer depth for more contact time.')
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
 * Pure function — no side effects, no randomness.
 */
export function simulateFiltration(
  layers: FilterLayer[],
  flowRate: number,
  initial: WaterQuality = INITIAL_WATER,
): SimResult {
  const tFactor = contactTimeFactor(layers, flowRate)

  let turbidity = initial.turbidity
  let contaminant = initial.contaminant
  let pH = initial.pH

  const breakdown: LayerBreakdown[] = layers.map((layer) => {
    const params = MATERIAL_PARAMS[layer.material]
    const depth = layerDepth(layer)

    turbidity = turbidityThrough(turbidity, params.turbidityK, depth)
    contaminant = contaminantThrough(contaminant, params.adsorptionK, depth, tFactor)
    pH = pHThrough(pH, params.pHFactor, depth)

    return {
      material: layer.material,
      thickness: depth,
      turbidityAfter: round(turbidity),
      contaminantAfter: round(contaminant),
    }
  })

  const turbidityRemoval = pct(
    ((initial.turbidity - turbidity) / initial.turbidity) * 100,
  )
  const contaminantRemoval = pct(
    ((initial.contaminant - contaminant) / initial.contaminant) * 100,
  )
  const overallEfficiency = pct((turbidityRemoval + contaminantRemoval) / 2)

  return {
    id: `sim-${Date.now()}-${Math.floor(Math.random() * 1e4)}`,
    timestamp: Date.now(),
    config: layers.map((l) => ({ ...l })),
    flowRate,
    initial: { ...initial },
    final: {
      turbidity: round(turbidity),
      contaminant: round(contaminant),
      pH: round(pH, 2),
    },
    turbidityRemoval: round(turbidityRemoval, 1),
    contaminantRemoval: round(contaminantRemoval, 1),
    overallEfficiency: round(overallEfficiency, 1),
    contactTime: round(tFactor, 2),
    breakdown,
  }
}

function round(value: number, decimals = 1): number {
  const f = 10 ** decimals
  return Math.round(value * f) / f
}

/** Human-readable summary of a configuration, e.g. "Sand 3cm → Carbon 5cm → Gravel 2cm". */
export function describeConfig(layers: FilterLayer[]): string {
  if (layers.length === 0) return 'Empty column'
  return layers
    .map((l) => `${MATERIALS[l.material].name} ${l.thickness}cm`)
    .join(' → ')
}
