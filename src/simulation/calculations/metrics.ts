import type {
  FilterLayer,
  FilterMaterial,
  Objective,
  ObjectiveResult,
  Scenario,
  SimResult,
  WaterQuality,
} from '@/types'
import { initialWaterFromStorm } from '../engine/filtrationEngine'

/* ------------------------------------------------------------------ *
 * Illustrative material cost model (Experiment Mode)
 * ------------------------------------------------------------------ *
 * "Credits" are a teaching currency, NOT real market prices. Deeper
 * beds and activated carbon cost more, mirroring the intuition that
 * adsorbent media is the expensive part of a treatment train.
 */
export const MATERIAL_COST_PER_CM: Record<FilterMaterial, number> = {
  gravel: 2,
  sand: 3,
  carbon: 8,
}

/** Illustrative material cost of a configuration, in credits. */
export function estimateMaterialCost(layers: FilterLayer[]): number {
  const total = layers.reduce(
    (sum, l) => sum + l.thickness * MATERIAL_COST_PER_CM[l.material],
    0,
  )
  return Math.round(total * 10) / 10
}

/** Total bed depth per material (cm) — used in comparison tables. */
export function materialTotals(layers: FilterLayer[]): Record<FilterMaterial, number> {
  const totals: Record<FilterMaterial, number> = { gravel: 0, sand: 0, carbon: 0 }
  for (const l of layers) totals[l.material] += l.thickness
  return totals
}

/* ------------------------------------------------------------------ *
 * Objective evaluation against ACTUAL simulation outputs
 * ------------------------------------------------------------------ */

function objectiveValue(result: SimResult, metric: Objective['metric']): number {
  switch (metric) {
    case 'turbidityRemoval':
      return result.turbidityRemoval
    case 'contaminantRemoval':
      return result.contaminantRemoval
    case 'overallEfficiency':
      return result.overallEfficiency
    case 'finalTurbidity':
      return result.final.turbidity
    case 'finalContaminant':
      return result.final.contaminant
    case 'finalPH':
      return result.final.pH
    case 'totalDepth':
      return result.config.reduce((sum, l) => sum + l.thickness, 0)
    case 'contactTime':
      return result.contactTime
    case 'cost':
      return estimateMaterialCost(result.config)
  }
}

function compare(actual: number, op: Objective['op'], target: number): boolean {
  switch (op) {
    case '<':
      return actual < target
    case '<=':
      return actual <= target
    case '>':
      return actual > target
    case '>=':
      return actual >= target
  }
}

/**
 * Evaluate a scenario's objectives against an actual SimResult.
 * Pure function — challenge outcomes are never hardcoded; the pass/fail
 * here IS the challenge feedback.
 */
export function evaluateObjectives(result: SimResult, scenario: Scenario): ObjectiveResult[] {
  return scenario.objectives.map((objective) => {
    const actual = objectiveValue(result, objective.metric)
    return { ...objective, actual, passed: compare(actual, objective.op, objective.target) }
  })
}

/* ------------------------------------------------------------------ *
 * Scenario starting water
 * ------------------------------------------------------------------ */

/**
 * Influent composition for a scenario: the storm baseline scaled by rain
 * intensity, overridden by the scenario's illustrative composition.
 * All values are simulated model assumptions.
 */
export function initialWaterForScenario(scenario: Scenario, intensity: number): WaterQuality {
  const base = initialWaterFromStorm(intensity)
  return { ...base, ...scenario.water }
}
