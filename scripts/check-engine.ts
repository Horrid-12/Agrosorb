/**
 * Engine sanity checks (temporary dev harness, not shipped).
 * Verifies: determinism, storm-coupled input, order/flow effects,
 * adsorption behavior and validation.
 */
import {
  simulateFiltration,
  validateConfig,
  initialWaterFromStorm,
} from '../src/simulation/engine/filtrationEngine'
import type { FilterLayer } from '../src/types'

const assert = (cond: boolean, msg: string) => {
  if (!cond) {
    console.error('FAIL:', msg)
    process.exit(1)
  }
}

const base: FilterLayer[] = [
  { id: 'a', material: 'sand', thickness: 3 },
  { id: 'b', material: 'carbon', thickness: 3 },
  { id: 'c', material: 'gravel', thickness: 2 },
]
const storm = initialWaterFromStorm(0.8)

const META = { id: 'test', timestamp: 0 }

// 1. Determinism
const r1 = simulateFiltration(base, 2, storm, META)
const r2 = simulateFiltration(base, 2, storm, META)
assert(JSON.stringify(r1) === JSON.stringify(r2), 'same input must produce identical output')

// 2. Storm coupling: heavier rain → dirtier input
const calm = initialWaterFromStorm(0.2)
assert(storm.turbidity > calm.turbidity, 'heavier storm raises turbidity')
assert(storm.contaminant > calm.contaminant, 'heavier storm raises contaminant')

// 3. Layer order matters
const flipped = simulateFiltration([base[2], base[1], base[0]], 2, storm)
assert(
  Math.abs(flipped.overallEfficiency - r1.overallEfficiency) > 0.01,
  'layer order affects efficiency',
)

// 4. Flow rate affects adsorption (contact time), not turbidity mechanics
const fast = simulateFiltration(base, 6, storm)
const slow = simulateFiltration(base, 1, storm)
assert(fast.contaminantRemoval < r1.contaminantRemoval, 'higher flow reduces adsorption')
assert(slow.contaminantRemoval > r1.contaminantRemoval, 'lower flow increases adsorption')
assert(fast.contactTime < r1.contactTime, 'contact time shrinks with flow')

// 5. More carbon → more adsorption
const moreCarbon: FilterLayer[] = [
  { id: 'a', material: 'sand', thickness: 3 },
  { id: 'b', material: 'carbon', thickness: 8 },
  { id: 'c', material: 'gravel', thickness: 2 },
]
assert(
  simulateFiltration(moreCarbon, 2, storm).contaminantRemoval > r1.contaminantRemoval,
  'thicker carbon bed adsorbs more',
)

// 6. Gravel-only column barely removes anything (long contact time still
//    yields a few percent via gravel's tiny adsorption coefficient).
const gravelOnly: FilterLayer[] = [{ id: 'g', material: 'gravel', thickness: 5 }]
const g = simulateFiltration(gravelOnly, 2, storm)
assert(g.contaminantRemoval < 25, 'gravel alone cannot adsorb much')
assert(g.turbidityRemoval < 40, 'gravel alone filters few particles')

// 7. Validation
assert(!validateConfig([]).valid, 'empty column is invalid')
assert(
  !validateConfig([{ id: 'x', material: 'sand', thickness: 0.1 }]).valid,
  'too-thin layer is invalid',
)
assert(validateConfig(base).valid, 'starter column is valid')

// 8. Output is always well-formed
assert(r1.final.turbidity >= 0 && r1.final.contaminant >= 0, 'non-negative outputs')
assert(r1.overallEfficiency <= 100, 'efficiency capped at 100')

console.log('Initial (storm 0.8):', storm)
console.log('Final:', r1.final, '| removals:', r1.turbidityRemoval, r1.contaminantRemoval, '| eff:', r1.overallEfficiency, '| contact:', r1.contactTime)
console.log('ENGINE CHECKS PASSED')
