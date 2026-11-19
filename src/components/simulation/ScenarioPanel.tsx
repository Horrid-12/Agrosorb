import {
  CloudRain,
  Droplets,
  Info,
  Layers,
  Moon,
  Mountain,
  Play,
  RotateCcw,
  SlidersHorizontal,
  Sprout,
  Sun,
  Waves,
  Wind,
  X,
} from 'lucide-react'
import { ControlSlider } from '@/components/ui/ControlSlider'
import { ComicPanel, ComicTag, SimBadge } from '@/components/ui/Comic'
import { GameButton } from '@/components/ui/GameButton'
import { useSimulationStore, selectHydraulicLoad } from '@/stores/simulationStore'
import {
  INFLUENT_LIMITS,
  POLLUTION_SCENARIOS,
  POLLUTION_SCENARIO_ORDER,
} from '@/data/pollutionScenarios'
import { DESIGN_FLOW_RATE } from '@/simulation/models/constants'
import type { PollutionScenarioId } from '@/types'

const SCENARIO_ICONS: Record<PollutionScenarioId, React.ReactNode> = {
  'soil-erosion': <Mountain size={15} />,
  'pesticide-runoff': <Droplets size={15} />,
  'fertilizer-pollution': <Sprout size={15} />,
  'mixed-contamination': <Layers size={15} />,
  'extreme-rainfall': <CloudRain size={15} />,
}

/**
 * Advanced scenario + control panel. Every chemistry slider writes the
 * actual influent used by the simulation engine; nothing here is a purely
 * cosmetic setting.
 */
export function ScenarioPanel() {
  const scenarioId = useSimulationStore((s) => s.pollutionScenario)
  const setPollutionScenario = useSimulationStore((s) => s.setPollutionScenario)
  const rainIntensity = useSimulationStore((s) => s.rainIntensity)
  const setRainIntensity = useSimulationStore((s) => s.setRainIntensity)
  const erosionIntensity = useSimulationStore((s) => s.erosionIntensity)
  const setErosionIntensity = useSimulationStore((s) => s.setErosionIntensity)
  const timeOfDay = useSimulationStore((s) => s.timeOfDay)
  const setTimeOfDay = useSimulationStore((s) => s.setTimeOfDay)
  const flowRate = useSimulationStore((s) => s.flowRate)
  const setFlowRate = useSimulationStore((s) => s.setFlowRate)
  const influent = useSimulationStore((s) => s.influent)
  const autoChemistry = useSimulationStore((s) => s.autoChemistry)
  const activeScenario = useSimulationStore((s) => s.activeScenario)
  const setInfluentParam = useSimulationStore((s) => s.setInfluentParam)
  const resetInfluentToScenario = useSimulationStore((s) => s.resetInfluentToScenario)
  const layers = useSimulationStore((s) => s.layers)
  const setAllLayerConditions = useSimulationStore((s) => s.setAllLayerConditions)
  const replaySimulation = useSimulationStore((s) => s.replaySimulation)
  const resetSimulation = useSimulationStore((s) => s.resetSimulation)
  const simStatus = useSimulationStore((s) => s.simStatus)
  const setPanel = useSimulationStore((s) => s.setPanel)
  const hydraulicLoad = useSimulationStore(selectHydraulicLoad)

  const scenario = POLLUTION_SCENARIOS[scenarioId]
  const avgCondition =
    layers.length > 0
      ? layers.reduce((sum, l) => sum + (l.condition ?? 1), 0) / layers.length
      : 1

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center justify-between border-b border-ag-ui-border/70 px-4 py-3">
        <div className="flex items-center gap-2">
          <SlidersHorizontal size={16} className="text-ag-fresh" />
          <div>
            <h2 className="font-display text-sm font-bold tracking-wide text-ag-text">Scenario Lab</h2>
            <p className="font-mono text-[9px] uppercase tracking-widest text-ag-text-dim">
              Environment · chemistry · flow
            </p>
          </div>
        </div>
        <button
          onClick={() => setPanel(null)}
          aria-label="Close panel"
          className="rounded-lg p-1.5 text-ag-text-dim transition hover:bg-ag-ui-light hover:text-ag-text"
        >
          <X size={16} />
        </button>
      </header>

      <div className="flex-1 space-y-3 overflow-y-auto px-3 py-3">
        {/* Scenario intro */}
        <ComicPanel className="bg-ag-ui-light/70 p-3">
          <div className="mb-1 flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5 font-display text-xs font-black uppercase tracking-wide text-ag-text">
              {SCENARIO_ICONS[scenarioId]} {scenario.name}
            </span>
            <SimBadge />
          </div>
          <p className="text-[10px] font-semibold italic text-ag-fresh">{scenario.tagline}</p>
          <p className="mt-1 text-[10px] leading-relaxed text-ag-text-dim">{scenario.brief}</p>
        </ComicPanel>

        {/* Scenario selection */}
        <section>
          <SectionTitle>Pollution scenario</SectionTitle>
          <div className="grid grid-cols-1 gap-1.5">
            {POLLUTION_SCENARIO_ORDER.map((id) => {
              const sc = POLLUTION_SCENARIOS[id]
              const active = id === scenarioId
              return (
                <button
                  key={id}
                  onClick={() => setPollutionScenario(id)}
                  aria-pressed={active}
                  className={`flex items-center gap-2 rounded-lg border-2 px-2.5 py-2 text-left transition ${
                    active
                      ? 'border-ag-fresh bg-ag-fresh/15 shadow-[3px_3px_0_0_#244d35]'
                      : 'border-ag-ui-border bg-ag-ui-light/50 hover:border-ag-fresh/60'
                  }`}
                >
                  <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md border-2 ${active ? 'border-ag-forest bg-ag-fresh text-ag-forest' : 'border-ag-ui-border bg-ag-ui text-ag-text-dim'}`}>
                    {SCENARIO_ICONS[id]}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[11px] font-bold text-ag-text">{sc.name}</span>
                    <span className="block truncate text-[9px] text-ag-text-dim">{sc.tagline}</span>
                  </span>
                  {active && <ComicTag tone="green">On</ComicTag>}
                </button>
              )
            })}
          </div>
        </section>

        {/* Weather + runoff */}
        <section className="space-y-2.5">
          <SectionTitle>Storm &amp; runoff</SectionTitle>
          <ControlSlider
            label="Rainfall intensity"
            value={rainIntensity}
            min={0}
            max={1}
            step={0.05}
            display={`${Math.round(rainIntensity * 100)}%`}
            onChange={(v) => setRainIntensity(v)}
            hint={autoChemistry ? 'Rainfall re-derives the scenario influent while chemistry is automatic.' : 'Chemistry is manual; rainfall still drives runoff visuals and flood risk.'}
          />
          <ControlSlider
            label="Soil erosion intensity"
            value={erosionIntensity}
            min={0}
            max={1}
            step={0.05}
            display={`${Math.round(erosionIntensity * 100)}%`}
            onChange={setErosionIntensity}
            hint="Drives sediment load, erosion rills and visible soil particles."
          />
          <ControlSlider
            label="Time of day"
            value={timeOfDay}
            min={0}
            max={24}
            step={1}
            onChange={setTimeOfDay}
            badge={
              <span className="flex items-center gap-1 text-[10px] text-ag-warn">
                {timeOfDay >= 6 && timeOfDay < 18 ? <Sun size={11} className="text-ag-warn" /> : <Moon size={11} className="text-ag-sky" />}
              </span>
            }
            hint={`${formatHour(timeOfDay)} — sky, sun and ambient lighting follow this clock.`}
          />
        </section>

        {/* Influent chemistry */}
        <section className="space-y-2.5">
          <div className="flex items-center justify-between">
            <SectionTitle>Influent chemistry</SectionTitle>
            <button
              onClick={resetInfluentToScenario}
              className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider text-ag-fresh hover:text-ag-text"
              title={
                activeScenario !== 'free'
                  ? "Restore the challenge's water composition"
                  : "Restore the scenario's rain/erosion-derived chemistry"
              }
            >
              <RotateCcw size={10} /> Baseline
            </button>
          </div>
          <div className="flex items-center justify-between">
            <SimBadge>Simulated values</SimBadge>
            <span
              className={`rounded border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                activeScenario !== 'free'
                  ? 'border-ag-water/50 bg-ag-water/10 text-ag-sky'
                  : autoChemistry
                    ? 'border-ag-fresh/50 bg-ag-fresh/10 text-ag-fresh'
                    : 'border-ag-warn/50 bg-ag-warn/10 text-ag-warn'
              }`}
            >
              {activeScenario !== 'free'
                ? 'Challenge water'
                : autoChemistry
                  ? 'Auto from scenario'
                  : 'Manual override'}
            </span>
          </div>

          <ControlSlider
            label="Initial turbidity"
            value={influent.turbidity}
            min={INFLUENT_LIMITS.turbidity.min}
            max={INFLUENT_LIMITS.turbidity.max}
            step={INFLUENT_LIMITS.turbidity.step}
            unit="NTU"
            onChange={(v) => setInfluentParam('turbidity', v)}
          />
          <ControlSlider
            label="Model contaminant"
            value={influent.contaminant}
            min={INFLUENT_LIMITS.contaminant.min}
            max={INFLUENT_LIMITS.contaminant.max}
            step={INFLUENT_LIMITS.contaminant.step}
            unit="mg/L"
            onChange={(v) => setInfluentParam('contaminant', v)}
            hint="Generic model compound — not a real pesticide."
          />
          <ControlSlider
            label="Nitrate (NO₃-N)"
            value={influent.nitrate}
            min={INFLUENT_LIMITS.nitrate.min}
            max={INFLUENT_LIMITS.nitrate.max}
            step={INFLUENT_LIMITS.nitrate.step}
            unit="mg/L"
            onChange={(v) => setInfluentParam('nitrate', v)}
          />
          <ControlSlider
            label="Phosphate (PO₄)"
            value={influent.phosphate}
            min={INFLUENT_LIMITS.phosphate.min}
            max={INFLUENT_LIMITS.phosphate.max}
            step={INFLUENT_LIMITS.phosphate.step}
            unit="mg/L"
            onChange={(v) => setInfluentParam('phosphate', v)}
          />
          <ControlSlider
            label="Influent pH"
            value={influent.pH}
            min={INFLUENT_LIMITS.pH.min}
            max={INFLUENT_LIMITS.pH.max}
            step={INFLUENT_LIMITS.pH.step}
            onChange={(v) => setInfluentParam('pH', v)}
          />
        </section>

        {/* Flow + media condition */}
        <section className="space-y-2.5">
          <SectionTitle>Hydraulics &amp; media</SectionTitle>
          <ControlSlider
            label="Runoff / influent flow"
            value={flowRate}
            min={1}
            max={8}
            step={0.5}
            unit="L/min"
            onChange={setFlowRate}
            badge={hydraulicLoad > 1 ? <ComicTag tone="red">Overload</ComicTag> : undefined}
            hint={`Design flow ${DESIGN_FLOW_RATE} L/min. Above design, contact time falls and part of the flow bypasses the beds.`}
          />
          <ControlSlider
            label="Media condition / saturation"
            value={avgCondition}
            min={0.05}
            max={1}
            step={0.05}
            display={`${Math.round(avgCondition * 100)}%`}
            onChange={setAllLayerConditions}
            hint="Applies to every layer. 100% is fresh media; low values are exhausted (saturated) and filter less."
          />
          <div className="flex items-center gap-2 rounded-lg border border-ag-ui-border bg-ag-ui-light/50 px-2.5 py-2 text-[10px] text-ag-text-dim">
            <Waves size={13} className="shrink-0 text-ag-water" />
            <span>
              {hydraulicLoad > 1
                ? `${flowRate} L/min exceeds the ${DESIGN_FLOW_RATE} L/min design flow — expect overflow and reduced performance.`
                : `${flowRate} L/min is within the ${DESIGN_FLOW_RATE} L/min design flow.`}
            </span>
          </div>
        </section>

        {/* Scenario notes */}
        <section>
          <SectionTitle>What this scenario teaches</SectionTitle>
          <ul className="space-y-1">
            {scenario.notes.map((note) => (
              <li key={note} className="flex gap-1.5 text-[10px] leading-snug text-ag-text-dim">
                <span className="mt-0.5 text-ag-fresh">▸</span>
                {note}
              </li>
            ))}
          </ul>
        </section>

        <div className="flex gap-2 rounded-lg border border-ag-warn/30 bg-ag-warn/5 px-2.5 py-2 text-[9px] leading-relaxed text-ag-warn">
          <Info size={12} className="mt-0.5 shrink-0" />
          <span>
            All water-quality figures are simulated by the documented AgroSorb model. Coloured
            particles are visual tracers, not measurements or real molecules.
          </span>
        </div>

        <div className="flex items-center gap-1.5 text-[9px] text-ag-text-dim">
          <Wind size={11} /> Wind, rain, clouds and vegetation respond to the storm controls.
        </div>
      </div>

      <footer className="border-t border-ag-ui-border/70 p-3">
        <div className="grid grid-cols-[1fr_auto] gap-2">
          <GameButton onClick={replaySimulation} disabled={simStatus === 'running'}>
            <Play size={15} />
            {simStatus === 'running' ? 'Running…' : 'Run / Replay'}
          </GameButton>
          <GameButton
            variant="secondary"
            onClick={resetSimulation}
            disabled={simStatus === 'running'}
            title="Reset weather, chemistry, flow and filter column"
          >
            <RotateCcw size={15} />
          </GameButton>
        </div>
      </footer>
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-1.5 text-[9px] font-black uppercase tracking-[0.18em] text-ag-text-dim">
      {children}
    </p>
  )
}

function formatHour(hour: number): string {
  const h = Math.floor(hour) % 24
  const m = Math.round((hour - Math.floor(hour)) * 60)
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}
