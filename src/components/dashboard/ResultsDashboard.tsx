import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  ArrowRight,
  Droplets,
  FlaskConical,
  Info,
  Layers,
  Play,
  RotateCcw,
  Save,
  Trash2,
  TriangleAlert,
  X,
} from 'lucide-react'
import { GameButton, StatBadge } from '@/components/ui/GameButton'
import { Meter, SimBadge } from '@/components/ui/Comic'
import { SimTooltip } from '@/components/dashboard/SimTooltip'
import { useSimulationStore } from '@/stores/simulationStore'
import { MATERIALS } from '@/data/materials'
import { POLLUTION_SCENARIOS } from '@/data/pollutionScenarios'
import { DESIGN_FLOW_RATE } from '@/simulation/models/constants'
import { describeConfig } from '@/simulation/engine/filtrationEngine'

/**
 * Results dashboard: before/after water quality, per-parameter removal
 * efficiencies, per-layer breakdown, hydraulic loading and the
 * experiment history.
 *
 * Every number shown here is a SIMULATED value from the documented
 * educational model — clearly labelled as such in the UI. Water swatches
 * are visual readings of simulated turbidity, not samples.
 */
export function ResultsDashboard() {
  const result = useSimulationStore((s) => s.result)
  const history = useSimulationStore((s) => s.history)
  const setPanel = useSimulationStore((s) => s.setPanel)
  const clearHistory = useSimulationStore((s) => s.clearHistory)
  const replaySimulation = useSimulationStore((s) => s.replaySimulation)
  const resetSimulation = useSimulationStore((s) => s.resetSimulation)
  const simStatus = useSimulationStore((s) => s.simStatus)

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

  const scenario =
    POLLUTION_SCENARIOS[result.pollutionScenario ?? 'mixed-contamination']
  const visuals = scenario.visuals

  const removalData = [
    { metric: 'Turbidity', value: result.turbidityRemoval, color: visuals.sedimentColor },
    { metric: 'Contaminant', value: result.contaminantRemoval, color: visuals.tracerColor },
    { metric: 'Nitrate', value: result.nitrateRemoval, color: '#8fb44e' },
    { metric: 'Phosphate', value: result.phosphateRemoval, color: '#5d9a84' },
  ]

  const nutrientData = [
    { metric: 'Nitrate', initial: result.initial.nitrate, final: result.final.nitrate },
    { metric: 'Phosphate', initial: result.initial.phosphate, final: result.final.phosphate },
  ]

  const initialSwatch = waterColor(result.initial.turbidity, visuals.waterTint, visuals.sedimentColor)
  const finalSwatch = waterColor(result.final.turbidity, visuals.waterTint, visuals.sedimentColor)

  const loadPct = Math.round(result.filterLoading * 100)
  const overloaded = result.hydraulicLoad > 1

  return (
    <div className="flex h-full flex-col">
      <DashboardHeader onClose={() => setPanel(null)} />

      <div className="flex-1 overflow-y-auto px-4 py-3">
        {/* Efficiency headline */}
        <motion.div
          initial={{ scale: 0.94, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="comic-panel relative mb-3 overflow-hidden bg-ag-good/10 p-3 text-center"
        >
          <div className="halftone pointer-events-none absolute inset-0 opacity-[0.06]" aria-hidden />
          <div className="relative">
            <div className="mb-0.5 flex items-center justify-center gap-1.5">
              <span className="text-[10px] font-black uppercase tracking-widest text-ag-good">
                Overall treatment efficiency
              </span>
              <SimBadge />
            </div>
            <div className="font-mono text-3xl font-bold text-ag-text">
              {result.overallEfficiency.toFixed(1)}%
            </div>
            <p className="mt-0.5 text-[9px] text-ag-text-dim">
              {scenario.name} · mean of turbidity + contaminant removal
            </p>
          </div>
        </motion.div>

        {/* Save as named experiment (Experiment Mode) */}
        <SaveExperimentRow />

        {/* Before / after water samples */}
        <div className="mb-3 grid grid-cols-2 gap-2">
          <WaterSample
            title="Initial influent"
            swatch={initialSwatch}
            quality={result.initial}
            tone="warn"
          />
          <WaterSample
            title="Treated output"
            swatch={finalSwatch}
            quality={result.final}
            tone="good"
            arrow
          />
        </div>

        {/* Per-parameter removal */}
        <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-ag-text-dim">
          Removal efficiency (simulated)
        </p>
        <div className="mb-3 grid grid-cols-2 gap-2">
          <StatBadge label="Turbidity" value={`${result.turbidityRemoval}`} unit="%" tone="good" />
          <StatBadge label="Model contaminant" value={`${result.contaminantRemoval}`} unit="%" tone="good" />
          <StatBadge
            label="Nitrate"
            value={`${result.nitrateRemoval}`}
            unit="%"
            tone={result.nitrateRemoval > 40 ? 'good' : 'warn'}
          />
          <StatBadge
            label="Phosphate"
            value={`${result.phosphateRemoval}`}
            unit="%"
            tone={result.phosphateRemoval > 40 ? 'good' : 'warn'}
          />
        </div>

        {/* Removal chart */}
        <div className="mb-1 h-36 rounded-xl border border-ag-ui-border bg-ag-ui-light/50 p-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={removalData} margin={{ top: 4, right: 4, left: -18, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2e4a3a" vertical={false} />
              <XAxis
                dataKey="metric"
                tick={{ fill: '#9db8a8', fontSize: 10 }}
                axisLine={{ stroke: '#2e4a3a' }}
                tickLine={false}
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fill: '#9db8a8', fontSize: 9 }}
                axisLine={false}
                tickLine={false}
                width={34}
              />
              <Tooltip content={<SimTooltip />} cursor={{ fill: 'rgba(46, 74, 58, 0.25)' }} />
              <Bar dataKey="value" name="Removal" radius={[4, 4, 0, 0]}>
                {removalData.map((d) => (
                  <Cell key={d.metric} fill={d.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="mb-3 text-right font-mono text-[8px] text-ag-text-dim">% removed · simulated</p>

        {/* Hydraulics + operating conditions */}
        <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-ag-text-dim">
          Operating conditions
        </p>
        <div className="mb-2 grid grid-cols-3 gap-2">
          <StatBadge label="Contact time" value={`${result.contactTime}`} unit="ct" tone="neutral" />
          <StatBadge label="Flow" value={`${result.flowRate}`} unit="L/min" tone="neutral" />
          <StatBadge
            label="Filter loading"
            value={`${loadPct}`}
            unit="%"
            tone={loadPct > 70 ? 'bad' : loadPct > 35 ? 'warn' : 'good'}
          />
        </div>
        <div className="mb-2 rounded-xl border border-ag-ui-border bg-ag-ui-light/60 px-3 py-2">
          <div className="flex items-center justify-between text-[10px] text-ag-text-dim">
            <span className="flex items-center gap-1">
              <Layers size={11} /> Hydraulic load
            </span>
            <span className={`font-mono ${overloaded ? 'text-ag-danger' : 'text-ag-good'}`}>
              {result.hydraulicLoad.toFixed(2)}× design
            </span>
          </div>
          <div className="mt-1.5">
            <Meter
              value={Math.min(100, result.hydraulicLoad * 100)}
              color={overloaded ? '#d97757' : '#76a85b'}
              label="Flow vs design"
              trailing={`${result.flowRate} / ${DESIGN_FLOW_RATE} L/min`}
            />
          </div>
          {result.overflow && (
            <p className="mt-2 flex items-start gap-1.5 text-[10px] leading-snug text-ag-danger">
              <TriangleAlert size={12} className="mt-0.5 shrink-0" />
              Hydraulic overload — part of the flow bypasses the media untreated in the model.
            </p>
          )}
        </div>

        {/* pH */}
        <div className="mb-3 flex items-center justify-between rounded-xl border border-ag-ui-border bg-ag-ui-light/70 px-3 py-2">
          <span className="text-xs text-ag-text-dim">pH (initial → final)</span>
          <span className="font-mono text-sm text-ag-text">
            {result.initial.pH.toFixed(2)} → <strong>{result.final.pH.toFixed(2)}</strong>
          </span>
        </div>

        {/* Nutrient before/after chart */}
        <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-ag-text-dim">
          Nutrients before / after
        </p>
        <div className="mb-3 h-36 rounded-xl border border-ag-ui-border bg-ag-ui-light/50 p-2">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={nutrientData} barGap={4} margin={{ top: 4, right: 4, left: -18, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2e4a3a" vertical={false} />
              <XAxis
                dataKey="metric"
                tick={{ fill: '#9db8a8', fontSize: 10 }}
                axisLine={{ stroke: '#2e4a3a' }}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: '#9db8a8', fontSize: 9 }}
                axisLine={false}
                tickLine={false}
                width={34}
              />
              <Tooltip content={<SimTooltip />} cursor={{ fill: 'rgba(46, 74, 58, 0.25)' }} />
              <Bar dataKey="initial" name="Initial" fill="#5c8a47" radius={[4, 4, 0, 0]} />
              <Bar dataKey="final" name="Final" fill="#7fc98a" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <p className="mb-3 text-right font-mono text-[8px] text-ag-text-dim">mg/L · simulated</p>

        {/* Per-layer breakdown */}
        <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-ag-text-dim">
          Through the column
        </p>
        <div className="mb-3 space-y-1.5">
          {result.breakdown.map((b, i) => (
            <div key={i} className="rounded-lg border border-ag-ui-border bg-ag-ui-light/60 px-2.5 py-2">
              <div className="flex items-center gap-2">
                <span
                  className="h-4 w-4 rounded border border-black/30"
                  style={{ background: MATERIALS[b.material].color }}
                />
                <span className="flex-1 text-[11px] font-semibold text-ag-text">
                  {MATERIALS[b.material].name}{' '}
                  <span className="font-mono text-[9px] text-ag-text-dim">{b.thickness}cm</span>
                </span>
                <span className="font-mono text-[9px] text-ag-text-dim">
                  P {Math.round(b.turbidityAfter)} · C {b.contaminantAfter}
                </span>
              </div>
              <div className="mt-1.5 grid grid-cols-2 gap-2">
                <Meter value={b.loading * 100} color="#a37a4a" label="Solids" trailing={`${Math.round(b.loading * 100)}%`} />
                <Meter
                  value={b.saturation * 100}
                  color={b.material === 'carbon' ? '#76a85b' : '#5a7f74'}
                  label="Adsorption"
                  trailing={`${Math.round(b.saturation * 100)}%`}
                />
              </div>
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
            Simulated values from the AgroSorb educational model — not laboratory measurements.
            Water swatches are visual readings of simulated turbidity. The "contaminant" is a
            generic model compound, not a real pesticide; no complete-removal claim is made.
          </span>
        </div>

        {/* Replay / reset */}
        <div className="mb-3 grid grid-cols-[1fr_auto] gap-2">
          <GameButton onClick={replaySimulation} disabled={simStatus === 'running'}>
            <Play size={14} /> {simStatus === 'running' ? 'Running…' : 'Replay this run'}
          </GameButton>
          <GameButton
            variant="secondary"
            onClick={resetSimulation}
            disabled={simStatus === 'running'}
            title="Reset weather, chemistry, flow and filter column"
            aria-label="Reset simulation"
          >
            <RotateCcw size={14} />
          </GameButton>
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
              <span
                className={`font-mono text-[11px] font-bold ${
                  h.overallEfficiency > 70
                    ? 'text-ag-good'
                    : h.overallEfficiency > 40
                      ? 'text-ag-warn'
                      : 'text-ag-danger'
                }`}
              >
                {h.overallEfficiency}%
              </span>
            </div>
          ))}
          {history.length === 0 && (
            <p className="rounded-lg border border-dashed border-ag-ui-border p-3 text-center text-[10px] text-ag-text-dim">
              Completed runs appear here.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

/* ─── before / after sample card ───────────────────────────────────── */

function WaterSample({
  title,
  swatch,
  quality,
  tone,
  arrow = false,
}: {
  title: string
  swatch: string
  quality: { turbidity: number; contaminant: number; nitrate: number; phosphate: number; pH: number }
  tone: 'warn' | 'good'
  arrow?: boolean
}) {
  return (
    <div className="comic-panel relative overflow-hidden bg-ag-ui-light/70 p-2.5">
      <div className="mb-1.5 flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-ag-text-dim">
        {title} {arrow && <ArrowRight size={9} />}
      </div>
      <div
        className="relative mb-2 h-12 overflow-hidden rounded-md border-2 border-ag-forest"
        style={{ background: swatch }}
        aria-hidden
      >
        <div className="halftone absolute inset-0 opacity-20" />
        <Droplets
          size={14}
          className="absolute right-1 top-1 text-white/45"
          aria-hidden
        />
      </div>
      <MiniRow label="Turbidity" value={quality.turbidity.toFixed(1)} unit="NTU" strong={arrow} />
      <MiniRow label="Contaminant" value={quality.contaminant.toFixed(2)} unit="mg/L" />
      <MiniRow label="Nitrate" value={quality.nitrate.toFixed(2)} unit="mg/L" />
      <MiniRow label="Phosphate" value={quality.phosphate.toFixed(2)} unit="mg/L" />
      <div className={`mt-1 font-mono text-[9px] ${tone === 'good' ? 'text-ag-good' : 'text-ag-warn'}`}>
        pH {quality.pH.toFixed(2)}
      </div>
    </div>
  )
}

function MiniRow({
  label,
  value,
  unit,
  strong = false,
}: {
  label: string
  value: string
  unit: string
  strong?: boolean
}) {
  return (
    <div className="flex items-baseline justify-between gap-1 text-[9px]">
      <span className="text-ag-text-dim">{label}</span>
      <span className={`font-mono ${strong ? 'font-bold text-ag-good' : 'text-ag-text'}`}>
        {value} <span className="text-[8px] text-ag-text-dim">{unit}</span>
      </span>
    </div>
  )
}

/* ─── helpers ──────────────────────────────────────────────────────── */

function parseHex(hex: string): [number, number, number] {
  const clean = hex.replace('#', '')
  const full = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean
  return [
    parseInt(full.slice(0, 2), 16),
    parseInt(full.slice(2, 4), 16),
    parseInt(full.slice(4, 6), 16),
  ]
}

function blendHex(a: string, b: string, t: number): string {
  const [ar, ag, ab] = parseHex(a)
  const [br, bg, bb] = parseHex(b)
  const mix = (x: number, y: number) => Math.round(x + (y - x) * Math.max(0, Math.min(1, t)))
  const hex = (n: number) => n.toString(16).padStart(2, '0')
  return `#${hex(mix(ar, br))}${hex(mix(ag, bg))}${hex(mix(ab, bb))}`
}

/** Visual reading of simulated turbidity (not a measured colour). */
function waterColor(turbidity: number, tint: string, sediment: string): string {
  const muddy = Math.max(0, Math.min(1, turbidity / 160))
  return blendHex(blendHex('#4299c7', tint, 0.42), sediment, muddy * 0.68)
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
