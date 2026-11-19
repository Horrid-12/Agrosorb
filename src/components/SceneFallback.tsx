import { useSimulationStore } from '@/stores/simulationStore'
import { MATERIALS } from '@/data/materials'
import { describeConfig, isLayerEnabled } from '@/simulation/engine/filtrationEngine'
import { POLLUTION_SCENARIOS } from '@/data/pollutionScenarios'

/**
 * Non-3D fallback for devices without WebGL (or mobile). Rendered as a
 * stylized CSS "schematic" of the treatment train — never a static
 * screenshot — so the simulator stays usable. It reads the same store as
 * the 3D scene: layers, disabled beds, scenario influent and result.
 */
export function SceneFallback({ reason = 'no-webgl' }: { reason?: 'mobile' | 'no-webgl' }) {
  const layers = useSimulationStore((s) => s.layers)
  const result = useSimulationStore((s) => s.result)
  const influent = useSimulationStore((s) => s.influent)
  const pollutionScenario = useSimulationStore((s) => s.pollutionScenario)

  const scenario = POLLUTION_SCENARIOS[pollutionScenario]
  const efficiency = result?.overallEfficiency
  const finalTurbidity = result?.final.turbidity ?? influent.turbidity
  const waterColor = waterSwatch(
    finalTurbidity,
    scenario.visuals.waterTint,
    scenario.visuals.sedimentColor,
  )
  const inflowColor = waterSwatch(
    influent.turbidity,
    scenario.visuals.waterTint,
    scenario.visuals.sedimentColor,
  )

  const message =
    reason === 'mobile'
      ? 'Simplified 2D mode — open on a larger screen for the full 3D farm.'
      : '3D graphics are unavailable on this device — showing the schematic view.'

  return (
    <div className="flex h-full flex-col items-center justify-center gap-5 bg-gradient-to-b from-ag-sky to-[#8fb8cd] p-6">
      <div className="rounded-2xl border-2 border-ag-ui-border bg-ag-ui/90 px-4 py-2 text-center font-mono text-[11px] text-ag-sand shadow-panel">
        {message}
      </div>

      <div className="flex items-center gap-2 rounded-full border-2 border-ag-forest bg-ag-sand px-3 py-1 text-[10px] font-black uppercase tracking-wider text-ag-forest">
        {scenario.name} · simulated
      </div>

      {/* CSS diorama: sky → fields → channel → column → tank */}
      <div className="flex flex-wrap items-end justify-center gap-5">
        <div className="text-center">
          <div className="h-16 w-28 rounded-t-md bg-gradient-to-b from-ag-fresh to-ag-fresh-dark" />
          <div className="h-2 w-32 bg-ag-soil" />
          <p className="mt-1 text-[10px] font-semibold text-ag-forest">Farmland</p>
        </div>

        <div className="text-center">
          <div className="mx-auto h-16 w-3 rounded" style={{ background: inflowColor }} />
          <p className="mt-1 text-[10px] font-semibold text-ag-forest">Runoff channel</p>
          <p className="font-mono text-[8px] text-ag-forest/70">{influent.turbidity.toFixed(0)} NTU</p>
        </div>

        {/* Filter column schematic from live store config */}
        <div className="text-center">
          <div className="mx-auto flex h-40 w-14 flex-col justify-end overflow-hidden rounded-full border-4 border-[#5f6d68] bg-ag-sky/40">
            {layers.length === 0 && (
              <div className="text-center text-[8px] text-ag-forest">empty</div>
            )}
            {[...layers].reverse().map((l) => (
              <div
                key={l.id}
                style={{
                  background: MATERIALS[l.material].color,
                  height: `${(l.thickness / 24) * 100}%`,
                  opacity: isLayerEnabled(l) ? 1 : 0.35,
                  filter: isLayerEnabled(l) ? undefined : 'grayscale(0.8)',
                }}
                title={`${MATERIALS[l.material].name} ${l.thickness}cm${isLayerEnabled(l) ? '' : ' (bypassed)'}`}
              />
            ))}
          </div>
          <p className="mt-1 max-w-[130px] text-[10px] font-semibold text-ag-forest">
            {describeConfig(layers)}
          </p>
        </div>

        <div className="text-center">
          <div className="mx-auto flex h-20 w-16 items-end overflow-hidden rounded-lg border-4 border-[#5f6d68] bg-white/30">
            <div
              className="w-full transition-all"
              style={{
                height: `${Math.max(0, efficiency ?? 0)}%`,
                background: waterColor,
              }}
            />
          </div>
          <p className="mt-1 text-[10px] font-semibold text-ag-forest">
            Treated {efficiency != null ? `${efficiency}%` : ''}
          </p>
          <p className="font-mono text-[8px] text-ag-forest/70">{finalTurbidity.toFixed(0)} NTU</p>
        </div>
      </div>

      {result && (
        <div className="flex flex-wrap justify-center gap-1.5">
          <Chip label={`NO₃ ${result.final.nitrate.toFixed(1)}`} />
          <Chip label={`PO₄ ${result.final.phosphate.toFixed(1)}`} />
          <Chip label={`pH ${result.final.pH.toFixed(1)}`} />
          {result.overflow && <Chip label="Hydraulic overload" danger />}
        </div>
      )}
    </div>
  )
}

function Chip({ label, danger = false }: { label: string; danger?: boolean }) {
  return (
    <span
      className={`rounded border-2 px-2 py-0.5 font-mono text-[9px] font-bold ${
        danger
          ? 'border-ag-soil-dark bg-ag-danger/90 text-ag-ui'
          : 'border-ag-forest/60 bg-ag-sand/80 text-ag-forest'
      }`}
    >
      {label}
    </span>
  )
}

function parseHex(hex: string): [number, number, number] {
  const clean = hex.replace('#', '')
  const full = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean
  return [
    parseInt(full.slice(0, 2), 16),
    parseInt(full.slice(2, 4), 16),
    parseInt(full.slice(4, 6), 16),
  ]
}

function waterSwatch(turbidity: number, tint: string, sediment: string): string {
  const muddy = Math.max(0, Math.min(1, turbidity / 160))
  const [ar, ag, ab] = parseHex('#4299c7')
  const [tr, tg, tb] = parseHex(tint)
  const [sr, sg, sb] = parseHex(sediment)
  const mix = (x: number, y: number, t: number) => Math.round(x + (y - x) * t)
  const base = [
    mix(ar, tr, 0.42),
    mix(ag, tg, 0.42),
    mix(ab, tb, 0.42),
  ]
  const out = [
    mix(base[0], sr, muddy * 0.68),
    mix(base[1], sg, muddy * 0.68),
    mix(base[2], sb, muddy * 0.68),
  ]
  return `rgb(${out[0]}, ${out[1]}, ${out[2]})`
}
