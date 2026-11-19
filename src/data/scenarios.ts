import type { Scenario, ScenarioId, GameMode } from '@/types'

/**
 * Experiment Mode scenarios. Every value here is an ILLUSTRATIVE model
 * assumption for teaching purposes — none of the starting conditions or
 * objective targets represent experimentally verified data.
 *
 * Objectives are evaluated against ACTUAL simulation outputs by
 * `evaluateObjectives` (simulation/calculations/metrics.ts) — outcomes
 * are never hardcoded.
 */
export const SCENARIOS: Record<ScenarioId, Scenario> = {
  'muddy-river': {
    id: 'muddy-river',
    name: 'Muddy River',
    tagline: 'Heavy storm over bare soil',
    brief:
      'A violent storm has stripped topsoil from the fields. The river runs thick with suspended sediment. Physical filtration is your weapon — stack deep fine media to settle the water down.',
    start: { rainIntensity: 0.9, flowRate: 2, erosionIntensity: 0.85 },
    water: { turbidity: 95, contaminant: 4, nitrate: 2, phosphate: 2.5, pH: 6.2 },
    pollutionScenario: 'soil-erosion',
    objectives: [
      { id: 't1', text: 'Reduce turbidity by at least 65%', metric: 'turbidityRemoval', op: '>=', target: 65, unit: '%' },
      { id: 't2', text: 'Final turbidity below 25 NTU', metric: 'finalTurbidity', op: '<', target: 25, unit: 'NTU' },
    ],
  },
  'chemical-runoff': {
    id: 'chemical-runoff',
    name: 'Chemical Runoff',
    tagline: 'Dissolved threat at high flow',
    brief:
      'Fields were recently treated and the wash-off carries an elevated load of the dissolved model contaminant. The pump runs fast (4 L/min), cutting contact time — you will need serious activated carbon.',
    start: { rainIntensity: 0.7, flowRate: 4, erosionIntensity: 0.35 },
    water: { turbidity: 45, contaminant: 14, nitrate: 3, phosphate: 1.5, pH: 6.4 },
    pollutionScenario: 'pesticide-runoff',
    objectives: [
      { id: 'c1', text: 'Remove at least 65% of the model contaminant', metric: 'contaminantRemoval', op: '>=', target: 65, unit: '%' },
      { id: 'c2', text: 'Final concentration below 5 mg/L', metric: 'finalContaminant', op: '<', target: 5, unit: 'mg/L' },
    ],
  },
  'filter-optimization': {
    id: 'filter-optimization',
    name: 'Filter Optimization',
    tagline: 'Limited material budget',
    brief:
      'Media is scarce this season. Build the best treatment train you can with at most 14 cm of bed depth and 70 credits of material. Every centimetre counts.',
    start: { rainIntensity: 0.6, flowRate: 2, erosionIntensity: 0.55 },
    water: { turbidity: 70, contaminant: 10, nitrate: 6, phosphate: 3, pH: 6.4 },
    pollutionScenario: 'mixed-contamination',
    budget: 14,
    objectives: [
      { id: 'o1', text: 'Reach at least 55% overall efficiency', metric: 'overallEfficiency', op: '>=', target: 55, unit: '%' },
      { id: 'o2', text: 'Stay within the 14 cm material budget', metric: 'totalDepth', op: '<=', target: 14, unit: 'cm' },
      { id: 'o3', text: 'Spend at most 70 credits of media', metric: 'cost', op: '<=', target: 70, unit: 'credits' },
    ],
  },
}

export const SCENARIO_ORDER: ScenarioId[] = ['muddy-river', 'chemical-runoff', 'filter-optimization']

/** Display name for any game mode ('free' included). */
export function gameModeName(id: GameMode): string {
  return id === 'free' ? 'Free run' : SCENARIOS[id].name
}
