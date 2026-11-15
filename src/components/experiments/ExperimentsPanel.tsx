import { useState } from 'react'
import {
  Award,
  Beaker,
  Check,
  ChevronRight,
  Layers,
  Play,
  Target,
  Trash2,
  X,
  XCircle,
} from 'lucide-react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { SimTooltip } from '@/components/dashboard/SimTooltip'
import { useSimulationStore } from '@/stores/simulationStore'
import { SCENARIOS, SCENARIO_ORDER, gameModeName } from '@/data/scenarios'
import { MATERIAL_COST_PER_CM, materialTotals } from '@/simulation/calculations/metrics'
import { MATERIALS } from '@/data/materials'
import { describeConfig } from '@/simulation/engine/filtrationEngine'
import type { Scenario, SavedExperiment } from '@/types'

type LabTab = 'scenarios' | 'saved' | 'compare'

/**
 * Experiment Lab: scenario selection, challenge progress, saved
 * experiments and configuration comparison.
 *
 * Everything shown is derived from ACTUAL simulation outputs stored in
 * the Zustand store — outcomes are never hardcoded. All figures are
 * simulated model values, not laboratory measurements.
 */
export function ExperimentsPanel() {
  const [tab, setTab] = useState<LabTab>('scenarios')
  const setPanel = useSimulationStore((s) => s.setPanel)

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center justify-between border-b border-ag-ui-border/70 px-4 py-3">
        <div className="flex items-center gap-2">
          <Beaker size={16} className="text-ag-fresh" />
          <h2 className="font-display text-sm font-bold tracking-wide text-ag-text">Experiment Lab</h2>
        </div>
        <button
          onClick={() => setPanel(null)}
          aria-label="Close panel"
          className="rounded-lg p-1.5 text-ag-text-dim transition hover:bg-ag-ui-light hover:text-ag-text"
        >
          <X size={16} />
        </button>
      </header>

      {/* Sub-tabs */}
      <div className="grid grid-cols-3 gap-1 border-b border-ag-ui-border/70 p-2" role="tablist">
        {(
          [
            ['scenarios', 'Scenarios'],
            ['saved', 'Saved'],
            ['compare', 'Compare'],
          ] as Array<[LabTab, string]>
        ).map(([id, label]) => (
          <button
            key={id}
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={`rounded-lg py-1.5 text-[11px] font-semibold transition ${
              tab === id
                ? 'bg-ag-fresh/20 text-ag-fresh'
                : 'text-ag-text-dim hover:bg-ag-ui-light hover:text-ag-text'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3">
        {tab === 'scenarios' && <ScenariosTab />}
        {tab === 'saved' && <SavedTab />}
        {tab === 'compare' && <CompareTab />}
      </div>

      <footer className="border-t border-ag-ui-border/70 px-4 py-2">
        <p className="text-center text-[9px] leading-snug text-ag-text-dim">
          All values simulated by the AgroSorb educational model — illustrative, not
          laboratory measurements.
        </p>
      </footer>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Scenarios                                                           */
/* ------------------------------------------------------------------ */

function ScenariosTab() {
  const activeScenario = useSimulationStore((s) => s.activeScenario)
  const startScenario = useSimulationStore((s) => s.startScenario)
  const lastEvaluation = useSimulationStore((s) => s.lastEvaluation)

  return (
    <div className="space-y-2">
      {/* Challenge progress for the active scenario */}
      {activeScenario !== 'free' && (
        <ChallengeCard scenario={SCENARIOS[activeScenario]} evaluation={lastEvaluation} />
      )}

      <button
        onClick={() => startScenario('free')}
        aria-pressed={activeScenario === 'free'}
        className={`w-full rounded-xl border p-3 text-left transition ${
          activeScenario === 'free'
            ? 'border-ag-fresh bg-ag-fresh/10'
            : 'border-ag-ui-border bg-ag-ui-light/50 hover:border-ag-fresh/50'
        }`}
      >
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-ag-text">Free Mode</span>
          {activeScenario === 'free' && <Chip tone="good">Active</Chip>}
        </div>
        <p className="mt-1 text-[10px] text-ag-text-dim">
          Sandbox — no objectives, any configuration, storm-based inputs.
        </p>
      </button>

      {SCENARIO_ORDER.map((id) => (
        <ScenarioCard
          key={id}
          scenario={SCENARIOS[id]}
          active={activeScenario === id}
          onStart={() => startScenario(id)}
        />
      ))}
    </div>
  )
}

function ScenarioCard({
  scenario,
  active,
  onStart,
}: {
  scenario: Scenario
  active: boolean
  onStart: () => void
}) {
  return (
    <div
      className={`rounded-xl border p-3 transition ${
        active ? 'border-ag-fresh bg-ag-fresh/10' : 'border-ag-ui-border bg-ag-ui-light/50'
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h3 className="truncate text-xs font-bold text-ag-text">{scenario.name}</h3>
          <p className="truncate text-[10px] italic text-ag-fresh">{scenario.tagline}</p>
        </div>
        {active ? (
          <Chip tone="good">Active</Chip>
        ) : (
          <button
            onClick={onStart}
            className="flex shrink-0 items-center gap-1 rounded-lg border border-ag-fresh/50 bg-ag-fresh/15 px-2.5 py-1.5 text-[10px] font-bold text-ag-fresh transition hover:bg-ag-fresh/25"
          >
            <Play size={11} /> Start
          </button>
        )}
      </div>

      <p className="mt-1.5 text-[10px] leading-relaxed text-ag-text-dim">{scenario.brief}</p>

      <ul className="mt-2 space-y-1">
        {scenario.objectives.map((o) => (
          <li key={o.id} className="flex items-start gap-1.5 text-[10px] text-ag-text">
            <Target size={11} className="mt-0.5 shrink-0 text-ag-sand" />
            {o.text}
          </li>
        ))}
      </ul>

      <div className="mt-2 flex flex-wrap gap-1 text-[9px] font-mono text-ag-text-dim">
        <span className="rounded bg-ag-ui/60 px-1.5 py-0.5">
          Rain {Math.round(scenario.start.rainIntensity * 100)}%
        </span>
        <span className="rounded bg-ag-ui/60 px-1.5 py-0.5">Flow {scenario.start.flowRate} L/min</span>
        {scenario.budget && (
          <span className="rounded bg-ag-ui/60 px-1.5 py-0.5">Budget {scenario.budget} cm</span>
        )}
      </div>
    </div>
  )
}

/**
 * Challenge feedback, evaluated from the ACTUAL last simulation result.
 */
function ChallengeCard({
  scenario,
  evaluation,
}: {
  scenario: Scenario
  evaluation: ReturnType<typeof useSimulationStore.getState>['lastEvaluation']
}) {
  const met = evaluation?.filter((o) => o.passed).length ?? 0
  const total = scenario.objectives.length
  const allPassed = evaluation != null && met === total

  return (
    <div
      className={`rounded-xl border p-3 ${
        allPassed ? 'border-ag-good/50 bg-ag-good/10' : 'border-ag-ui-border bg-ag-ui-light/50'
      }`}
    >
      <div className="mb-2 flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-xs font-bold text-ag-text">
          {allPassed ? <Award size={14} className="text-ag-good" /> : <Target size={14} className="text-ag-sand" />}
          {scenario.name}
        </span>
        <span className={`font-mono text-[10px] font-bold ${allPassed ? 'text-ag-good' : 'text-ag-text-dim'}`}>
          {met}/{total} objectives
        </span>
      </div>

      {allPassed && (
        <p className="mb-2 rounded-lg bg-ag-good/15 px-2.5 py-1.5 text-[10px] font-bold text-ag-good">
          Challenge complete — every objective met. Save this run in the Saved tab.
        </p>
      )}

      {evaluation == null ? (
        <p className="text-[10px] text-ag-text-dim">
          Run a simulation to see challenge progress. Objectives are scored on your
          actual results.
        </p>
      ) : (
        <ul className="space-y-1.5">
          {evaluation.map((o) => (
            <li key={o.id} className="flex items-center gap-2">
              {o.passed ? (
                <Check size={12} className="shrink-0 text-ag-good" />
              ) : (
                <XCircle size={12} className="shrink-0 text-ag-danger" />
              )}
              <span className={`flex-1 text-[10px] ${o.passed ? 'text-ag-text' : 'text-ag-text-dim'}`}>
                {o.text}
              </span>
              <span className={`font-mono text-[10px] ${o.passed ? 'text-ag-good' : 'text-ag-danger'}`}>
                {o.actual}
                {o.unit}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Saved experiments                                                   */
/* ------------------------------------------------------------------ */

function SavedTab() {
  const savedExperiments = useSimulationStore((s) => s.savedExperiments)
  const deleteExperiment = useSimulationStore((s) => s.deleteExperiment)
  const result = useSimulationStore((s) => s.result)
  const [name, setName] = useState('')

  return (
    <div className="space-y-2">
      {result ? (
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            useSimulationStore.getState().saveExperiment(name)
            setName('')
          }}
        >
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Name this run…"
            aria-label="Experiment name"
            maxLength={28}
            className="min-w-0 flex-1 rounded-xl border border-ag-ui-border bg-ag-ui-light/70 px-3 py-2 text-xs text-ag-text placeholder:text-ag-text-dim/60 focus:border-ag-fresh focus:outline-none"
          />
          <button
            type="submit"
            className="shrink-0 rounded-xl border border-ag-fresh/50 bg-ag-fresh/15 px-3 py-2 text-[11px] font-bold text-ag-fresh transition hover:bg-ag-fresh/25"
          >
            Save
          </button>
        </form>
      ) : (
        <p className="rounded-xl border border-dashed border-ag-ui-border p-3 text-center text-[10px] text-ag-text-dim">
          Run a simulation first — completed runs can be saved here.
        </p>
      )}

      {savedExperiments.length === 0 ? (
        <p className="rounded-xl border border-ag-ui-border bg-ag-ui-light/40 p-3 text-center text-[10px] text-ag-text-dim">
          No saved experiments yet.
        </p>
      ) : (
        savedExperiments.map((exp) => <SavedRow key={exp.id} exp={exp} onDelete={() => deleteExperiment(exp.id)} />)
      )}
    </div>
  )
}

function SavedRow({ exp, onDelete }: { exp: SavedExperiment; onDelete: () => void }) {
  return (
    <div className="rounded-xl border border-ag-ui-border bg-ag-ui-light/50 p-2.5">
      <div className="flex items-center gap-2">
        <span
          className={`h-2 w-2 shrink-0 rounded-full ${exp.passed ? 'bg-ag-good' : exp.evaluation ? 'bg-ag-danger' : 'bg-ag-sand'}`}
          title={exp.passed ? 'All objectives met' : exp.evaluation ? 'Objectives not met' : 'Free run'}
        />
        <span className="min-w-0 flex-1 truncate text-xs font-bold text-ag-text">{exp.name}</span>
        <span className="font-mono text-[10px] text-ag-text-dim">
          {new Date(exp.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' })}
        </span>
        <button
          onClick={onDelete}
          aria-label={`Delete experiment ${exp.name}`}
          className="rounded p-1 text-ag-text-dim transition hover:text-ag-danger"
        >
          <Trash2 size={13} />
        </button>
      </div>
      <div className="mt-1 flex items-center gap-2 text-[10px] text-ag-text-dim">
        <Chip tone={exp.scenarioId === 'free' ? 'neutral' : 'fresh'}>{gameModeName(exp.scenarioId)}</Chip>
        <span className="font-mono">{exp.result.overallEfficiency}% eff</span>
        <span className="font-mono">{exp.cost} cr</span>
      </div>
      <p className="mt-1 truncate font-mono text-[9px] text-ag-text-dim" title={describeConfig(exp.result.config)}>
        {describeConfig(exp.result.config)} · {exp.result.flowRate} L/min
      </p>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* Comparison                                                          */
/* ------------------------------------------------------------------ */

function CompareTab() {
  const savedExperiments = useSimulationStore((s) => s.savedExperiments)
  const selected = savedExperiments.slice(0, 6)

  if (selected.length < 2) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
        <Layers size={32} className="text-ag-ui-border" />
        <p className="text-xs font-semibold text-ag-text">Need two saved experiments</p>
        <p className="max-w-[220px] text-[10px] text-ag-text-dim">
          Save at least two runs (any scenario) to compare turbidity reduction, contaminant
          reduction, media quantities and cost.
        </p>
      </div>
    )
  }

  const chartData = selected.map((exp) => ({
    name: exp.name,
    Turbidity: exp.result.turbidityRemoval,
    Contaminant: exp.result.contaminantRemoval,
  }))

  return (
    <div className="space-y-3">
      <div>
        <p className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-ag-text-dim">
          Removal efficiency (simulated %)
        </p>
        <div className="h-48 rounded-xl border border-ag-ui-border bg-ag-ui-light/50 p-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} barGap={3}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2e4a3a" vertical={false} />
              <XAxis dataKey="name" tick={{ fill: '#9db8a8', fontSize: 9 }} interval={0} axisLine={{ stroke: '#2e4a3a' }} tickLine={false} />
              <YAxis domain={[0, 100]} tick={{ fill: '#9db8a8', fontSize: 9 }} axisLine={false} tickLine={false} width={26} unit="%" />
              <Tooltip content={<SimTooltip />} cursor={{ fill: 'rgba(46, 74, 58, 0.25)' }} />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              <Bar dataKey="Turbidity" name="Turbidity removal" fill="#5c8a47" radius={[3, 3, 0, 0]} />
              <Bar dataKey="Contaminant" name="Contaminant removal" fill="#7fc98a" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Configuration details table */}
      <p className="text-[10px] font-bold uppercase tracking-widest text-ag-text-dim">
        Configuration details (simulated)
      </p>
      <div className="overflow-hidden rounded-xl border border-ag-ui-border">
        <table className="w-full text-left text-[9px]">
          <thead>
            <tr className="bg-ag-ui-light text-ag-text-dim">
              <th className="px-2 py-1.5 font-semibold">Experiment</th>
              <th className="px-1 py-1.5 text-center font-semibold">Flow</th>
              <th className="px-1 py-1.5 text-center font-semibold">Contact</th>
              <th className="px-1 py-1.5 text-center font-semibold">Media (cm)</th>
              <th className="px-2 py-1.5 text-center font-semibold">Cost</th>
            </tr>
          </thead>
          <tbody>
            {selected.map((exp) => {
              const totals = materialTotals(exp.result.config)
              return (
                <tr key={exp.id} className="border-t border-ag-ui-border/60">
                  <td className="max-w-[80px] truncate px-2 py-1.5 font-semibold text-ag-text" title={exp.name}>
                    {exp.name}
                  </td>
                  <td className="px-1 py-1.5 text-center font-mono text-ag-text">{exp.result.flowRate}</td>
                  <td className="px-1 py-1.5 text-center font-mono text-ag-text">{exp.result.contactTime}</td>
                  <td className="px-1 py-1.5">
                    <div className="flex justify-center gap-1">
                      {(['sand', 'carbon', 'gravel'] as const).map((m) => (
                        <span
                          key={m}
                          title={`${MATERIALS[m].name} total`}
                          className="flex h-4 w-4 items-center justify-center rounded-sm font-mono text-[8px] font-bold text-black/70"
                          style={{ background: MATERIALS[m].color }}
                        >
                          {totals[m]}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-2 py-1.5 text-center font-mono text-ag-sand">{exp.cost}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <p className="flex items-center gap-1.5 text-[9px] text-ag-text-dim">
        <ChevronRight size={10} /> Media cells: sand / carbon / gravel totals in cm. Cost is an
        illustrative credit estimate (
        {Object.entries(MATERIAL_COST_PER_CM)
          .map(([m, c]) => `${MATERIALS[m as keyof typeof MATERIALS].name} ${c}/cm`)
          .join(', ')}
        ).
      </p>
    </div>
  )
}

/* ------------------------------------------------------------------ */

function Chip({ tone, children }: { tone: 'good' | 'neutral' | 'fresh'; children: React.ReactNode }) {
  const tones = {
    good: 'bg-ag-good/15 text-ag-good border-ag-good/40',
    fresh: 'bg-ag-fresh/15 text-ag-fresh border-ag-fresh/40',
    neutral: 'bg-ag-ui-light text-ag-text-dim border-ag-ui-border',
  }
  return (
    <span className={`shrink-0 rounded-full border px-1.5 py-0.5 text-[9px] font-bold ${tones[tone]}`}>
      {children}
    </span>
  )
}
