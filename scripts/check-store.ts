/**
 * Store / transition harness (temporary dev check, not shipped).
 * Exercises scenario switching, auto vs manual chemistry, the treatment
 * sequence, hydraulic overload and layer bypass.
 */
import assert from 'node:assert/strict'

// Minimal persistence shim so the Zustand store can run under Node.
const memory = new Map<string, string>()
Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  value: {
    getItem: (key: string) => memory.get(key) ?? null,
    setItem: (key: string, value: string) => {
      memory.set(key, value)
    },
    removeItem: (key: string) => {
      memory.delete(key)
    },
    clear: () => memory.clear(),
    key: (index: number) => [...memory.keys()][index] ?? null,
    get length() {
      return memory.size
    },
  } satisfies Storage,
})

// zustand's default persistence reads `window.localStorage`.
Object.defineProperty(globalThis, 'window', {
  configurable: true,
  value: globalThis,
})

const { useSimulationStore } = await import('../src/stores/simulationStore')

const store = () => useSimulationStore.getState()

function completeRun() {
  store().runSimulation()
  for (let i = 0; i < 20; i++) store().advanceTreatment(1)
  assert.equal(store().simStatus, 'complete', 'treatment sequence should complete')
  return store().result!
}

// 1. Scenario selection resets to idle, restores auto chemistry and leaves
//    any Experiment Lab challenge.
store().startScenario('muddy-river')
assert.equal(store().activeScenario, 'muddy-river')
// Baseline in a challenge restores the challenge water, not the
// environmental rain/erosion curve.
store().setInfluentParam('turbidity', 40)
store().resetInfluentToScenario()
assert.equal(store().influent.turbidity, 95, 'challenge baseline restores challenge water')
assert.equal(store().autoChemistry, false)
store().setPollutionScenario('fertilizer-pollution')
assert.equal(store().activeScenario, 'free', 'scenario selection exits challenge mode')
assert.equal(store().autoChemistry, true)
assert.ok(store().influent.nitrate > 10, 'fertilizer runoff raises nitrate')
assert.ok(store().influent.phosphate > 3, 'fertilizer runoff raises phosphate')

// 2. Manual chemistry edits freeze the auto derivation.
store().setInfluentParam('nitrate', 21)
assert.equal(store().autoChemistry, false)
store().setRainIntensity(0.2)
assert.equal(store().influent.nitrate, 21, 'rain must not overwrite manual chemistry')
store().resetInfluentToScenario()
assert.equal(store().autoChemistry, true)
assert.ok(store().influent.nitrate < 21, 'baseline restores scenario-derived nitrate')

// 3. Normal run commits a result, history and nutrient removal.
const first = completeRun()
assert.equal(store().history.length, 1, 'committed run enters history')
assert.ok(first.final.turbidity <= first.initial.turbidity, 'turbidity must not increase')
assert.ok(first.final.nitrate <= first.initial.nitrate, 'nitrate must not increase')
assert.ok(first.final.phosphate <= first.initial.phosphate, 'phosphate must not increase')
assert.ok(first.contaminantRemoval < 100, 'refractory residual prevents 100% claim')

// 4. Extreme rainfall exceeds the design flow and reports overflow.
store().setPollutionScenario('extreme-rainfall')
assert.equal(store().flowRate, 6)
const storm = completeRun()
assert.ok(storm.hydraulicLoad > 1, 'extreme rainfall overloads the design flow')
assert.equal(storm.overflow, true, 'hydraulic overload reports untreated bypass')

// 5. Disabled layers are bypassed by the engine.
store().setPollutionScenario('mixed-contamination')
const before = store().layers.length
store().setLayerEnabled(store().layers[1].id, false)
const bypassed = completeRun()
assert.equal(bypassed.breakdown.length, before - 1, 'disabled bed is excluded from the path')

// 6. Reset restores the scenario start conditions and clears the run.
store().resetSimulation()
assert.equal(store().result, null)
assert.equal(store().simStatus, 'idle')
assert.equal(store().autoChemistry, true)
assert.equal(store().layers.length, 3)

console.log('STORE CHECKS PASSED')
