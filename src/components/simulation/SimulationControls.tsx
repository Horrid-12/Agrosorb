import { CloudRain, CloudOff, Droplets, Play, RotateCcw, Waves } from 'lucide-react'
import { GameButton, HudPanel } from '@/components/ui/GameButton'
import { useSimulationStore, selectCanRun } from '@/stores/simulationStore'
import { FLOW_RATES, RAIN } from '@/simulation/models/constants'

const PHASE_LABEL: Record<string, { text: string; tone: string }> = {
  idle: { text: 'Standby', tone: 'text-ag-text-dim' },
  raining: { text: 'Raining', tone: 'text-ag-good' },
  runoff: { text: 'Runoff Event', tone: 'text-ag-sand animate-pulse-soft' },
  complete: { text: 'Treatment Complete', tone: 'text-ag-good' },
}

/**
 * Bottom-left mission control: rainfall intensity, weather actions and
 * the master "run simulation" button.
 */
export function SimulationControls() {
  const phase = useSimulationStore((s) => s.phase)
  const rainIntensity = useSimulationStore((s) => s.rainIntensity)
  const setRainIntensity = useSimulationStore((s) => s.setRainIntensity)
  const startRain = useSimulationStore((s) => s.startRain)
  const stopRain = useSimulationStore((s) => s.stopRain)
  const triggerRunoff = useSimulationStore((s) => s.triggerRunoff)
  const resetEnvironment = useSimulationStore((s) => s.resetEnvironment)
  const runSimulation = useSimulationStore((s) => s.runSimulation)
  const flowRate = useSimulationStore((s) => s.flowRate)
  const setFlowRate = useSimulationStore((s) => s.setFlowRate)
  const canRun = useSimulationStore(selectCanRun)
  const result = useSimulationStore((s) => s.result)

  const phaseInfo = PHASE_LABEL[phase]

  return (
    <HudPanel className="pointer-events-auto w-[300px] max-w-[calc(100vw-2rem)] p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-ag-text-dim">
          Weather Control
        </span>
        <span className={`font-mono text-[11px] font-semibold ${phaseInfo.tone}`}>
          ● {phaseInfo.text}
        </span>
      </div>

      {/* Rain intensity */}
      <label className="mb-1 flex items-center justify-between text-xs text-ag-text-dim">
        <span className="flex items-center gap-1.5">
          <CloudRain size={14} /> Rainfall intensity
        </span>
        <span className="font-mono text-ag-text">{Math.round(rainIntensity * 100)}%</span>
      </label>
      <input
        type="range"
        min={0}
        max={1}
        step={0.05}
        value={rainIntensity}
        aria-label="Rainfall intensity"
        onChange={(e) => setRainIntensity(Number(e.target.value))}
        className="mb-3 w-full"
        style={{ ['--fill' as string]: `${rainIntensity * 100}%` }}
      />

      <div className="mb-3 grid grid-cols-2 gap-2">
        {phase === 'idle' ? (
          <GameButton onClick={startRain} className="col-span-1">
            <CloudRain size={16} /> Rain
          </GameButton>
        ) : (
          <GameButton variant="secondary" onClick={stopRain} className="col-span-1">
            <CloudOff size={16} /> Stop
          </GameButton>
        )}
        <GameButton
          variant="secondary"
          onClick={triggerRunoff}
          disabled={rainIntensity < RAIN.runoffThreshold && phase !== 'runoff'}
          className="col-span-1"
        >
          <Droplets size={16} /> Runoff
        </GameButton>
      </div>

      {/* Flow rate */}
      <label className="mb-1.5 flex items-center gap-1.5 text-xs text-ag-text-dim">
        <Waves size={14} /> Influent flow rate
      </label>
      <div className="mb-3 grid grid-cols-4 gap-1.5" role="radiogroup" aria-label="Flow rate">
        {FLOW_RATES.map((rate) => (
          <button
            key={rate}
            role="radio"
            aria-checked={flowRate === rate}
            onClick={() => setFlowRate(rate)}
            className={`rounded-lg border py-1.5 font-mono text-xs font-semibold transition ${
              flowRate === rate
                ? 'border-ag-fresh bg-ag-fresh/20 text-ag-fresh'
                : 'border-ag-ui-border bg-ag-ui-light/60 text-ag-text-dim hover:text-ag-text'
            }`}
          >
            {rate}
            <span className="ml-0.5 text-[9px] font-normal">L/m</span>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-[1fr_auto] gap-2">
        <GameButton onClick={runSimulation} disabled={!canRun}>
          <Play size={16} /> Run Simulation
        </GameButton>
        <GameButton variant="ghost" onClick={resetEnvironment} aria-label="Reset environment">
          <RotateCcw size={16} />
        </GameButton>
      </div>

      {result && (
        <p className="mt-2 text-center font-mono text-[10px] text-ag-text-dim">
          Last run: {result.overallEfficiency}% overall efficiency
        </p>
      )}
      {!canRun && (
        <p className="mt-2 text-center text-[10px] text-ag-warn">
          Configure the filter column to enable simulation
        </p>
      )}
    </HudPanel>
  )
}
