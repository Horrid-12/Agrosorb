/**
 * Scenario feasibility checks (temporary dev harness, not shipped).
 * For each Experiment Mode scenario, a reasonable candidate
 * configuration must satisfy ALL objectives when evaluated against the
 * real engine output — proving challenges are winnable, not hardcoded.
 */
import { simulateFiltration } from '../src/simulation/engine/filtrationEngine'
import { evaluateObjectives, initialWaterForScenario, estimateMaterialCost } from '../src/simulation/calculations/metrics'
import { SCENARIOS } from '../src/data/scenarios'
import type { FilterLayer, ScenarioId } from '../src/types'

const assert = (cond: boolean, msg: string) => {
  if (!cond) {
    console.error('FAIL:', msg)
    process.exit(1)
  }
}

const META = { id: 'test', timestamp: 0 }

const CANDIDATES: Record<ScenarioId, FilterLayer[]> = {
  'muddy-river': [
    { id: '1', material: 'sand', thickness: 8 },
    { id: '2', material: 'sand', thickness: 8 },
    { id: '3', material: 'gravel', thickness: 2 },
  ],
  'chemical-runoff': [
    { id: '1', material: 'sand', thickness: 3 },
    { id: '2', material: 'carbon', thickness: 8 },
    { id: '3', material: 'carbon', thickness: 8 },
    { id: '4', material: 'gravel', thickness: 2 },
  ],
  'filter-optimization': [
    { id: '1', material: 'sand', thickness: 6 },
    { id: '2', material: 'carbon', thickness: 6 },
    { id: '3', material: 'gravel', thickness: 2 },
  ],
}

for (const id of Object.keys(SCENARIOS) as ScenarioId[]) {
  const scenario = SCENARIOS[id]
  const initial = initialWaterForScenario(scenario, scenario.start.rainIntensity)
  const config = CANDIDATES[id]
  const result = simulateFiltration(config, scenario.start.flowRate, initial, META)
  const evaluation = evaluateObjectives(result, scenario)
  const passed = evaluation.filter((o) => o.passed).length

  console.log(
    `\n[${scenario.name}] initial:`, initial,
    '\n  final:', result.final,
    '\n  removals:', result.turbidityRemoval, '% /', result.contaminantRemoval,
    '% | contact:', result.contactTime, '| cost:', estimateMaterialCost(config),
    '\n  objectives:', evaluation.map((o) => `${o.passed ? 'PASS' : 'FAIL'}(${o.actual}${o.unit})`).join(' '),
  )

  assert(
    passed === scenario.objectives.length,
    `${scenario.name}: candidate config must meet ALL objectives`,
  )

  // Budget scenarios must also reject an over-budget config via objectives
  if (scenario.budget) {
    const overBudget = [...config, { id: 'x', material: 'carbon' as const, thickness: 8 }]
    const r2 = simulateFiltration(overBudget, scenario.start.flowRate, initial, META)
    const ev2 = evaluateObjectives(r2, scenario)
    assert(
      ev2.some((o) => !o.passed),
      `${scenario.name}: over-budget config must fail at least one objective`,
    )
  }
}

console.log('\nSCENARIO CHECKS PASSED')
