import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowRight, FlaskConical, Info, Save, Trash2, X } from 'lucide-react'
import { StatBadge } from '@/components/ui/GameButton'
import { SimTooltip } from '@/components/dashboard/SimTooltip'
import { useSimulationStore } from '@/stores/simulationStore'
import { MATERIALS } from '@/data/materials'
import { describeConfig } from '@/simulation/engine/filtrationEngine'

/**
 * Results dashboard: before/after water quality, removal efficiencies,
 * per-layer breakdown chart and the experiment history.
 *
 * Every number shown here is a SIMULATED value from the documented
 * educational model — clearly labelled as such in the UI.
 */
export function ResultsDashboard() {
  const result = useSimulationStore((s) => s.result)
  const history = useSimulationStore((s) => s.history)
  const setPanel = useSimulationStore((s) => s.setPanel)
  const clearHistory = useSimulationStore((s) => s.clearHistory)

  if (!result) {
    return (
      <div className="flex h-full flex-col">
        <DashboardHeader onClose={() => setPanel(null)} />
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
          <FlaskConical size={40} className="text-ag-ui-border" />
          <p className="text-sm font-semibold text-ag-text">No simulation yet</p>
          <p className="max-w-[220px] text-xs leading-relaxed text-ag-text-dim">
            Configure the filter column and run a rainfall event to see water-quality
            results here.
          </p>
        </div>
      </div>
    )
  }

  const chartData = [
    { metric: 'Turbidity', initial: result.initial.turbidity, final: result.final.turbidity },
    { metric: 'Contaminant', initial: result.initial.contaminant, final: result.final.contaminant },
  ]

  return (
    <div className="flex h-full flex-col">
      <DashboardHeader onClose={() => setPanel(null)} />

      <div className="flex-1 overflow-y-auto px-4 py-3">
        {/* Efficiency headline */}
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="mb-3 rounded-xl border border-ag-good/40 bg-ag-good/10 p-3 text-center"
        >
          <div className="text-[10px] font-bold uppercase tracking-widest text-ag-good">
            Overall treatment efficiency
          </div>
          <div className="font-mono text-3xl font-bold text-ag-text">
            {result.overallEfficiency.toFixed(1)}%
          </div>
        </motion.div>

        {/* Save as named experiment (Experiment Mode) */}
        <SaveExperimentRow />

        {/* Before / after */}
        <div className="mb-3 grid grid-cols-2 gap-2">
          <div className="rounded-xl border border-ag-ui-border bg-ag-ui-light/70 p-2.5">
            <div className="mb-1.5 text-[10px] font-bold uppercase tracking-widest text-ag-text-dim">Initial</div>
            <StatBadge label="Turbidity" value={result.initial.turbidity.toFixed(1)} unit="NTU" tone="warn" />
            <div className="mt-1.5">
              <StatBadge label="Contaminant" value={result.initial.contaminant.toFixed(1)} unit="mg/L" tone="warn" />
            </div>
          </div>
          <div className="rounded-xl border border-ag-ui-border bg-ag-ui-light/70 p-2.5">
            <div className="mb-1.5 flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-ag-text-dim">
              Final <ArrowRight size={10} />
            </div>
            <StatBadge label="Turbidity" value={result.final.turbidity.toFixed(1)} unit="NTU" tone="water" />
            <div className="mt-1.5">
              <StatBadge label="Contaminant" value={result.final.contaminant.toFixed(2)} unit="mg/L" tone="water" />
            </div>
          </div>
        </div>

        <div className="mb-3 grid grid-cols-3 gap-2">
          <StatBadge label="Turbidity removal" value={`${result.turbidityRemoval}`} unit="%" tone="good" />
          <StatBadge label="Adsorption removal" value={`${result.contaminantRemoval}`} unit="%" tone="good" />
          <StatBadge label="Contact time" value={`${result.contactTime}`} unit="ct" tone="neutral" />
        </div>

        {/* pH */}
        <div className="mb-3 flex items-center justify-between rounded-xl border border-ag-ui-border bg-ag-ui-light/70 px-3 py-2">
          <span className="text-xs text-ag-text-dim">pH (initial → final)</span>
          <span className="font-mono text-sm text-ag-text">
            {result.initial.pH.toFixed(2)} → <strong>{result.final.pH.toFixed(2)}</strong>
          </span>
        </div>

        {/* Comparison chart */}
        <div className="mb-3 h-44 rounded-xl border border-ag-ui-border bg-ag-ui-light/50 p-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} barGap={4}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2e4a3a" vertical={false} />
              <XAxis dataKey="metric" tick={{ fill: '#9db8a8', fontSize: 11 }} axisLine={{ stroke: '#2e4a3a' }} tickLine={false} />
              <YAxis tick={{ fill: '#9db8a8', fontSize: 10 }} axisLine={false} tickLine={false} width={30} />
              <Tooltip
                content={<SimTooltip />}
                cursor={{ fill: 'rgba(46, 74, 58, 0.25)' }}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="initial" name="Initial (simulated)" fill="#5c8a47" radius={[4, 4, 0, 0]} />
              <Bar dataKey="final" name="Final (simulated)" fill="#7fc98a" radius={[4, 4, 0, 0]}>
                {chartData.map((d) => (
                  <Cell key={d.metric} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Per-layer breakdown */}
        <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-ag-text-dim">Through the column</p>
        <div className="mb-3 space-y-1.5">
          {result.breakdown.map((b, i) => (
            <div key={i} className="flex items-center gap-2 rounded-lg border border-ag-ui-border bg-ag-ui-light/60 px-2.5 py-2">
              <span className="h-4 w-4 rounded border border-black/30" style={{ background: MATERIALS[b.material].color }} />
              <span className="flex-1 text-[11px] font-semibold text-ag-text">
                {MATERIALS[b.material].name} <span className="font-mono text-[9px] text-ag-text-dim">{b.thickness}cm</span>
              </span>
              <span className="font-mono text-[10px] text-ag-text-dim">
                T {b.turbidityAfter} · C {b.contaminantAfter}
              </span>
            </div>
          ))}
        </div>

        {/* Configuration summary */}
        <div className="mb-3 rounded-lg border border-ag-ui-border bg-ag-ui-light/60 px-3 py-2 font-mono text-[10px] text-ag-sand">
          {describeConfig(result.config)} · {result.flowRate} L/min
        </div>

        {/* Disclaimer */}
        <div className="mb-3 flex gap-2 rounded-lg border border-ag-warn/30 bg-ag-warn/5 px-3 py-2 text-[10px] leading-relaxed text-ag-warn">
          <Info size={13} className="mt-0.5 shrink-0" />
          <span>
            Simulated values from the AgroSorb educational model — not laboratory measurements. The
            "contaminant" is a generic model compound, not a real pesticide.
          </span>
        </div>

        {/* History */}
        <div className="mb-2 flex items-center justify-between">
          <p className="text-[10px] font-bold uppercase tracking-widest text-ag-text-dim">
            Experiment history ({history.length})
          </p>
          {history.length > 0 && (
            <button
              onClick={clearHistory}
              aria-label="Clear simulation history"
              title="Clear history"
              className="flex items-center gap-1 rounded-md px-1.5 py-1 text-[10px] font-semibold text-ag-text-dim transition hover:bg-ag-ui-light hover:text-ag-danger"
            >
              <Trash2 size={11} /> Clear
            </button>
          )}
        </div>
        <div className="space-y-1.5 pb-2">
          {history.map((h) => (
            <div key={h.id} className="flex items-center gap-2 rounded-lg border border-ag-ui-border/60 bg-ag-ui-light/40 px-2.5 py-1.5">
              <span className="font-mono text-[10px] text-ag-text-dim">
                {new Date(h.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
              <span className="flex-1 truncate font-mono text-[10px] text-ag-text">{describeConfig(h.config)}</span>
              <span className={`font-mono text-[11px] font-bold ${h.overallEfficiency > 70 ? 'text-ag-good' : h.overallEfficiency > 40 ? 'text-ag-warn' : 'text-ag-danger'}`}>
                {h.overallEfficiency}%
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/**
 * Save-as-named-experiment row. Only appears when a committed result
 * exists; saving records the ACTUAL result — nothing is hardcoded.
 */
function SaveExperimentRow() {
  const result = useSimulationStore((s) => s.result)
  const saveExperiment = useSimulationStore((s) => s.saveExperiment)
  const [name, setName] = useState('')
  const [saved, setSaved] = useState(false)

  if (!result) return null
  return (
    <form
      className="mb-3 flex gap-2"
      onSubmit={(e) => {
        e.preventDefault()
        saveExperiment(name)
        setName('')
        setSaved(true)
        setTimeout(() => setSaved(false), 1800)
      }}
    >
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Name this experiment…"
        aria-label="Experiment name"
        maxLength={28}
        className="min-w-0 flex-1 rounded-xl border border-ag-ui-border bg-ag-ui-light/70 px-3 py-2 text-xs text-ag-text placeholder:text-ag-text-dim/60 focus:border-ag-fresh focus:outline-none"
      />
      <button
        type="submit"
        className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition ${
          saved
            ? 'border-ag-good/50 bg-ag-good/15 text-ag-good'
            : 'border-ag-ui-border bg-ag-ui-light/70 text-ag-text hover:border-ag-fresh hover:text-ag-fresh'
        }`}
      >
        <Save size={13} /> {saved ? 'Saved' : 'Save'}
      </button>
    </form>
  )
}

function DashboardHeader({ onClose }: { onClose: () => void }) {
  return (
    <header className="flex items-center justify-between border-b border-ag-ui-border/70 px-4 py-3">
      <h2 className="font-display text-sm font-bold tracking-wide text-ag-text">Results Dashboard</h2>
      <button
        onClick={onClose}
        aria-label="Close panel"
        className="rounded-lg p-1.5 text-ag-text-dim transition hover:bg-ag-ui-light hover:text-ag-text"
      >
        <X size={16} />
      </button>
    </header>
  )
}
