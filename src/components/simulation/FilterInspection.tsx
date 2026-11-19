import {
  ArrowDown,
  ArrowUp,
  Droplets,
  Eye,
  EyeOff,
  FlaskConical,
  Info,
  Layers,
  Microscope,
  Play,
  X,
} from 'lucide-react'
import { ControlSlider } from '@/components/ui/ControlSlider'
import { ComicPanel, ComicTag, Meter, SimBadge } from '@/components/ui/Comic'
import { GameButton } from '@/components/ui/GameButton'
import { useSimulationStore, selectHydraulicLoad } from '@/stores/simulationStore'
import { MATERIALS } from '@/data/materials'
import { POLLUTION_SCENARIOS } from '@/data/pollutionScenarios'
import {
  activeLayers,
  isLayerEnabled,
  totalDepth,
} from '@/simulation/engine/filtrationEngine'
import { CONDITION_WARN } from '@/simulation/models/constants'
import type { FilterLayer, LayerBreakdown } from '@/types'

/**
 * Interactive filter-station inspection. Opened by clicking the 3D column
 * (or the Inspect tab). It turns the configured stack into a cross-section
 * with water movement, sediment build-up, loading and adsorption saturation.
 *
 * The animation is derived from the same treatment stage and engine output
 * that drive the 3D scene; this is not a disconnected visual.
 */
export function FilterInspection() {
  const layers = useSimulationStore((s) => s.layers)
  const result = useSimulationStore((s) => s.result)
  const pendingResult = useSimulationStore((s) => s.pendingResult)
  const treatmentStage = useSimulationStore((s) => s.treatmentStage)
  const flowRate = useSimulationStore((s) => s.flowRate)
  const simStatus = useSimulationStore((s) => s.simStatus)
  const pollutionScenario = useSimulationStore((s) => s.pollutionScenario)
  const setLayerEnabled = useSimulationStore((s) => s.setLayerEnabled)
  const setLayerCondition = useSimulationStore((s) => s.setLayerCondition)
  const moveLayer = useSimulationStore((s) => s.moveLayer)
  const setPanel = useSimulationStore((s) => s.setPanel)
  const setStationInspecting = useSimulationStore((s) => s.setStationInspecting)
  const runSimulation = useSimulationStore((s) => s.runSimulation)
  const hydraulicLoad = useSimulationStore(selectHydraulicLoad)

  const shown = pendingResult ?? result
  const visuals = POLLUTION_SCENARIOS[pollutionScenario].visuals
  const isFlowing =
    treatmentStage === 'filling' ||
    treatmentStage === 'filtering' ||
    treatmentStage === 'draining'
  const active = activeLayers(layers)
  const activeDepth = Math.max(totalDepth(layers), 0.5)
  const visualDepth = Math.max(
    layers.reduce((sum, l) => sum + Math.max(0.5, l.thickness), 0),
    0.5,
  )
  const dropletDuration = Math.max(0.75, 4.2 / Math.max(flowRate, 1))

  let activeIndex = -1
  const rows = layers.map((layer) => {
    const enabled = isLayerEnabled(layer)
    const index = enabled ? ++activeIndex : -1
    return {
      layer,
      index,
      enabled,
      breakdown: enabled ? shown?.breakdown[index] : undefined,
    }
  })

  const close = () => {
    setPanel(null)
    setStationInspecting(false)
  }

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center justify-between border-b border-ag-ui-border/70 px-4 py-3">
        <div className="flex items-center gap-2">
          <Microscope size={16} className="text-ag-fresh" />
          <div>
            <h2 className="font-display text-sm font-bold tracking-wide text-ag-text">Station Inspection</h2>
            <p className="font-mono text-[9px] uppercase tracking-widest text-ag-text-dim">
              {active.length} active bed{active.length === 1 ? '' : 's'} · {activeDepth.toFixed(1)} cm
            </p>
          </div>
        </div>
        <button
          onClick={close}
          aria-label="Close inspection"
          className="rounded-lg p-1.5 text-ag-text-dim transition hover:bg-ag-ui-light hover:text-ag-text"
        >
          <X size={16} />
        </button>
      </header>

      <div className="flex-1 space-y-3 overflow-y-auto px-3 py-3">
        <div className="flex items-center justify-between gap-2">
          <SimBadge>Live from simulation state</SimBadge>
          {hydraulicLoad > 1 ? (
            <ComicTag tone="red">Overload · {hydraulicLoad.toFixed(1)}× design</ComicTag>
          ) : (
            <ComicTag tone="green">{flowRate} L/min</ComicTag>
          )}
        </div>

        {/* Cross-section */}
        <ComicPanel className="bg-ag-ui-light/50 p-3">
          <div className="mb-2 flex items-center justify-between">
            <p className="text-[9px] font-black uppercase tracking-[0.18em] text-ag-text-dim">
              Column cross-section · top → bottom
            </p>
            <span className="flex items-center gap-1 font-mono text-[9px] text-ag-text-dim">
              <Droplets size={10} /> {isFlowing ? 'Water moving' : 'Standby'}
            </span>
          </div>

          {/* Inlet / water head */}
          <div className="mb-1 flex items-center gap-2">
            <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-ag-ui-border">
              <div
                className={`h-full rounded-full bg-ag-water transition-[width] duration-300 ${isFlowing ? 'animate-pulse-soft' : ''}`}
                style={{ width: isFlowing ? '100%' : '12%' }}
              />
            </div>
            <span className="w-14 text-right font-mono text-[9px] text-ag-water">
              {isFlowing ? 'INFLOW' : 'IDLE'}
            </span>
          </div>

          <div className="flex gap-3">
            <div className="relative flex h-64 w-24 shrink-0 flex-col overflow-hidden rounded-lg border-4 border-ag-forest bg-ag-sky/20">
              {rows.length === 0 && (
                <div className="flex flex-1 items-center justify-center px-1 text-center font-mono text-[9px] text-ag-text-dim">
                  empty
                </div>
              )}
              {rows.map(({ layer, enabled, breakdown }) => (
                <LayerSlice
                  key={layer.id}
                  layer={layer}
                  enabled={enabled}
                  breakdown={breakdown}
                  heightPct={(Math.max(0.5, layer.thickness) / visualDepth) * 100}
                  flowing={isFlowing && enabled}
                  duration={dropletDuration}
                  sedimentColor={visuals.sedimentColor}
                  tracerColor={visuals.tracerColor}
                />
              ))}
            </div>

            <div className="min-w-0 flex-1 space-y-1.5">
              <p className="text-[10px] leading-relaxed text-ag-text-dim">
                Brown specks show suspended solids accumulating in physical beds. Coloured dots
                on carbon are <strong className="text-ag-text">visual tracers</strong> for the
                dissolved model contaminant — not real molecules.
              </p>
              <div className="rounded-lg border border-ag-ui-border bg-ag-ui/50 px-2 py-1.5 text-[9px] text-ag-text-dim">
                <div className="flex items-center justify-between">
                  <span>Hydraulic load</span>
                  <span className={`font-mono ${hydraulicLoad > 1 ? 'text-ag-danger' : 'text-ag-good'}`}>
                    {hydraulicLoad.toFixed(2)}× design
                  </span>
                </div>
                <div className="mt-1 flex items-center justify-between">
                  <span>Contact time</span>
                  <span className="font-mono text-ag-text">{shown?.contactTime ?? '—'}</span>
                </div>
              </div>
              <div className="rounded-lg border border-ag-ui-border bg-ag-ui/50 px-2 py-1.5 text-[9px] text-ag-text-dim">
                <div className="flex items-center justify-between">
                  <span>Overall loading</span>
                  <span className="font-mono text-ag-text">
                    {shown ? `${Math.round(shown.filterLoading * 100)}%` : '—'}
                  </span>
                </div>
                {shown?.overflow && (
                  <p className="mt-1 font-bold text-ag-danger">
                    Hydraulic overload — part of the flow bypasses the media.
                  </p>
                )}
              </div>
            </div>
          </div>
        </ComicPanel>

        {/* Layer controls */}
        <section>
          <div className="mb-1.5 flex items-center justify-between">
            <p className="text-[9px] font-black uppercase tracking-[0.18em] text-ag-text-dim">
              Beds &amp; media condition
            </p>
            {simStatus === 'running' && <span className="font-mono text-[9px] text-ag-fresh">RUNNING…</span>}
          </div>
          <div className="space-y-2">
            {rows.map(({ layer, enabled, breakdown }, i) => (
              <LayerControl
                key={layer.id}
                layer={layer}
                enabled={enabled}
                breakdown={breakdown}
                index={i}
                count={layers.length}
                onToggle={() => setLayerEnabled(layer.id, !enabled)}
                onMove={(dir) => moveLayer(layer.id, dir)}
                onCondition={(v) => setLayerCondition(layer.id, v)}
              />
            ))}
            {layers.length === 0 && (
              <p className="rounded-lg border border-dashed border-ag-ui-border p-3 text-center text-[10px] text-ag-text-dim">
                No beds configured. Open the Filter tab to add media.
              </p>
            )}
          </div>
        </section>

        {/* Physical vs adsorption */}
        <section className="grid grid-cols-1 gap-2">
          <ComicPanel className="bg-ag-ui-light/60 p-2.5">
            <div className="mb-1 flex items-center gap-1.5">
              <Layers size={13} className="text-ag-sand" />
              <span className="text-[10px] font-black uppercase tracking-wide text-ag-text">Physical filtration</span>
            </div>
            <p className="text-[9px] leading-relaxed text-ag-text-dim">
              Sand and gravel trap suspended soil particles. This is what reduces turbidity and
              raises the solids-loading meter.
            </p>
            <div className="mt-1.5 flex flex-wrap gap-1">
              <ComicTag tone="cream">Turbidity</ComicTag>
              <ComicTag tone="yellow">Sediment load</ComicTag>
            </div>
          </ComicPanel>
          <ComicPanel className="bg-ag-ui-light/60 p-2.5">
            <div className="mb-1 flex items-center gap-1.5">
              <FlaskConical size={13} className="text-ag-fresh" />
              <span className="text-[10px] font-black uppercase tracking-wide text-ag-text">Adsorption</span>
            </div>
            <p className="text-[9px] leading-relaxed text-ag-text-dim">
              Dissolved model-contaminant tracers stick to activated carbon surfaces. Contact time
              and remaining carbon capacity matter; the model always leaves a small residual.
            </p>
            <div className="mt-1.5 flex flex-wrap gap-1">
              <ComicTag tone="green">Model contaminant</ComicTag>
              <ComicTag tone="blue">Carbon saturation</ComicTag>
            </div>
          </ComicPanel>
        </section>

        <div className="flex gap-2 rounded-lg border border-ag-warn/30 bg-ag-warn/5 px-2.5 py-2 text-[9px] leading-relaxed text-ag-warn">
          <Info size={12} className="mt-0.5 shrink-0" />
          <span>
            Loading and saturation are illustrative capacity indicators from the documented
            educational model, not laboratory measurements.
          </span>
        </div>
      </div>

      <footer className="grid grid-cols-[1fr_auto] gap-2 border-t border-ag-ui-border/70 p-3">
        <GameButton onClick={runSimulation} disabled={simStatus === 'running'}>
          <Play size={15} />
          {simStatus === 'running' ? 'Running…' : 'Run with this stack'}
        </GameButton>
        <GameButton variant="secondary" onClick={() => setPanel('config')}>
          <Layers size={15} /> Filter
        </GameButton>
      </footer>
    </div>
  )
}

function LayerSlice({
  layer,
  enabled,
  breakdown,
  heightPct,
  flowing,
  duration,
  sedimentColor,
  tracerColor,
}: {
  layer: FilterLayer
  enabled: boolean
  breakdown?: LayerBreakdown
  heightPct: number
  flowing: boolean
  duration: number
  sedimentColor: string
  tracerColor: string
}) {
  const def = MATERIALS[layer.material]
  const loading = breakdown?.loading ?? 0
  const saturation = breakdown?.saturation ?? 0
  const dots = layer.material === 'carbon' ? Math.round(saturation * 7) : 0

  return (
    <div
      className={`relative overflow-hidden border-b border-black/20 last:border-b-0 ${enabled ? '' : 'opacity-40'}`}
      style={{
        background: def.color,
        height: `${heightPct}%`,
        minHeight: 14,
      }}
      title={`${def.name} — ${layer.thickness} cm${enabled ? '' : ' (bypassed)'}`}
    >
      {/* Halftone texture */}
      <div className="halftone absolute inset-0 opacity-[0.15]" aria-hidden />

      {/* Sediment accumulation on top of a physical bed */}
      {enabled && loading > 0.02 && layer.material !== 'carbon' && (
        <div
          className="absolute inset-x-0 top-0 border-b border-black/20"
          style={{
            height: `${Math.max(4, loading * 45)}%`,
            background: `${sedimentColor}cc`,
          }}
          aria-hidden
        />
      )}

      {/* Adsorption tracer dots on carbon */}
      {dots > 0 &&
        Array.from({ length: dots }, (_, i) => (
          <span
            key={i}
            className="absolute h-1.5 w-1.5 rounded-full border border-black/30"
            style={{
              background: tracerColor,
              left: `${18 + ((i * 37) % 65)}%`,
              top: `${18 + ((i * 29) % 60)}%`,
            }}
            aria-hidden
          />
        ))}

      {/* Falling water particles while the treatment sequence runs */}
      {flowing &&
        Array.from({ length: 3 }, (_, i) => (
          <span
            key={`d${i}`}
            className="inspection-droplet absolute left-1/2 h-2 w-1 -translate-x-1/2 rounded-full bg-white/80"
            style={{
              left: `${25 + i * 25}%`,
              animationDuration: `${duration}s`,
              animationDelay: `${i * (duration / 3)}s`,
            }}
            aria-hidden
          />
        ))}

      {!enabled && (
        <span className="absolute inset-x-0 top-1/2 -translate-y-1/2 bg-ag-ui/80 py-0.5 text-center font-mono text-[8px] font-bold uppercase tracking-wider text-ag-sand">
          Bypassed
        </span>
      )}
    </div>
  )
}

function LayerControl({
  layer,
  enabled,
  breakdown,
  index,
  count,
  onToggle,
  onMove,
  onCondition,
}: {
  layer: FilterLayer
  enabled: boolean
  breakdown?: LayerBreakdown
  index: number
  count: number
  onToggle: () => void
  onMove: (dir: -1 | 1) => void
  onCondition: (v: number) => void
}) {
  const def = MATERIALS[layer.material]
  const condition = layer.condition ?? 1
  const conditionTone =
    condition < CONDITION_WARN ? 'text-ag-danger' : condition < 0.75 ? 'text-ag-warn' : 'text-ag-good'

  return (
    <div className={`rounded-lg border-2 p-2 ${enabled ? 'border-ag-ui-border bg-ag-ui-light/60' : 'border-ag-ui-border/50 bg-ag-ui/40 opacity-70'}`}>
      <div className="flex items-center gap-2">
        <span className="h-5 w-5 shrink-0 rounded border-2 border-black/30" style={{ background: def.color }} aria-hidden />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[11px] font-bold text-ag-text">
            #{index + 1} {def.name}
          </span>
          <span className="font-mono text-[9px] text-ag-text-dim">
            {layer.thickness} cm · condition <span className={conditionTone}>{Math.round(condition * 100)}%</span>
          </span>
        </span>
        <button
          onClick={() => onMove(-1)}
          disabled={index === 0}
          aria-label={`Move ${def.name} up`}
          className="rounded p-1 text-ag-text-dim hover:text-ag-text disabled:opacity-20"
        >
          <ArrowUp size={13} />
        </button>
        <button
          onClick={() => onMove(1)}
          disabled={index === count - 1}
          aria-label={`Move ${def.name} down`}
          className="rounded p-1 text-ag-text-dim hover:text-ag-text disabled:opacity-20"
        >
          <ArrowDown size={13} />
        </button>
        <button
          onClick={onToggle}
          aria-pressed={enabled}
          aria-label={`${enabled ? 'Disable' : 'Enable'} ${def.name} layer`}
          className={`rounded border px-1.5 py-1 text-[8px] font-bold uppercase tracking-wider transition ${enabled ? 'border-ag-fresh/50 bg-ag-fresh/15 text-ag-fresh' : 'border-ag-ui-border text-ag-text-dim'}`}
        >
          {enabled ? <Eye size={12} /> : <EyeOff size={12} />}
        </button>
      </div>

      <div className="mt-1.5">
        <ControlSlider
          label="Media condition"
          value={condition}
          min={0.05}
          max={1}
          step={0.05}
          display={`${Math.round(condition * 100)}%`}
          onChange={onCondition}
        />
      </div>

      <div className="mt-1.5 grid grid-cols-2 gap-2">
        <Meter
          value={(breakdown?.loading ?? 0) * 100}
          color="#a37a4a"
          label="Solids loading"
          trailing={breakdown ? `${Math.round((breakdown.loading ?? 0) * 100)}%` : '—'}
        />
        <Meter
          value={(breakdown?.saturation ?? 0) * 100}
          color={layer.material === 'carbon' ? '#76a85b' : '#5a7f74'}
          label={layer.material === 'carbon' ? 'Adsorption' : 'Adsorption (low)'}
          trailing={breakdown ? `${Math.round((breakdown.saturation ?? 0) * 100)}%` : '—'}
        />
      </div>

      {breakdown && (
        <p className="mt-1 font-mono text-[8px] text-ag-text-dim">
          after bed: T {breakdown.turbidityAfter} NTU · C {breakdown.contaminantAfter} mg/L · N{' '}
          {breakdown.nitrateAfter} · P {breakdown.phosphateAfter}
        </p>
      )}
    </div>
  )
}
