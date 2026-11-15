import { useSimulationStore } from '@/stores/simulationStore'
import { MATERIALS } from '@/data/materials'
import { describeConfig } from '@/simulation/engine/filtrationEngine'

/**
 * Non-3D fallback for devices without WebGL (or mobile). Rendered as a
 * stylized CSS "schematic" of the treatment train — never a static
 * screenshot — so the simulator stays usable.
 */
export function SceneFallback({ reason = 'no-webgl' }: { reason?: 'mobile' | 'no-webgl' }) {
  const layers = useSimulationStore((s) => s.layers)
  const efficiency = useSimulationStore((s) => s.result?.overallEfficiency)

  const message =
    reason === 'mobile'
      ? 'Simplified 2D mode — open on a larger screen for the full 3D farm.'
      : '3D graphics are unavailable on this device — showing the schematic view.'

  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 bg-gradient-to-b from-ag-sky to-[#8fb8cd] p-6">
      <div className="rounded-2xl border border-ag-ui-border bg-ag-ui/85 px-4 py-2 text-center font-mono text-[11px] text-ag-sand shadow-panel">
        {message}
      </div>

      {/* CSS diorama: sky → fields → channel → column → tank */}
      <div className="flex items-end gap-6">
        <div className="text-center">
          <div className="h-16 w-28 rounded-t-md bg-gradient-to-b from-ag-fresh to-ag-fresh-dark" />
          <div className="h-2 w-32 bg-ag-soil" />
          <p className="mt-1 text-[10px] font-semibold text-ag-forest">Farmland</p>
        </div>
        <div className="text-center">
          <div className="mx-auto h-16 w-3 rounded bg-ag-fresh-dark" />
          <p className="mt-1 text-[10px] font-semibold text-ag-forest">Runoff channel</p>
        </div>

        {/* Filter column schematic from live store config */}
        <div className="text-center">
          <div className="mx-auto flex h-40 w-14 flex-col justify-end overflow-hidden rounded-full border-4 border-[#5f6d68] bg-ag-sky/40">
            {layers.length === 0 && <div className="text-center text-[8px] text-ag-forest">empty</div>}
            {[...layers].reverse().map((l) => (
              <div
                key={l.id}
                style={{
                  background: MATERIALS[l.material].color,
                  height: `${(l.thickness / 24) * 100}%`,
                }}
              />
            ))}
          </div>
          <p className="mt-1 text-[10px] font-semibold text-ag-forest">{describeConfig(layers)}</p>
        </div>

        <div className="text-center">
          <div className="mx-auto flex h-20 w-16 items-end overflow-hidden rounded-lg border-4 border-[#5f6d68] bg-white/30">
            <div
              className="w-full bg-ag-fresh transition-all"
              style={{ height: `${efficiency ?? 0}%` }}
            />
          </div>
          <p className="mt-1 text-[10px] font-semibold text-ag-forest">
            Treated {efficiency != null ? `${efficiency}%` : ''}
          </p>
        </div>
      </div>
    </div>
  )
}
