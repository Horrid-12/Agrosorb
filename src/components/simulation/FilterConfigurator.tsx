import { AnimatePresence, motion } from 'framer-motion'
import { ArrowDown, ArrowUp, Plus, Sparkles, Trash2, TriangleAlert, X } from 'lucide-react'
import { GameButton } from '@/components/ui/GameButton'
import { useSimulationStore, selectTotalDepth, selectValidation } from '@/stores/simulationStore'
import { MATERIALS, MATERIAL_ORDER } from '@/data/materials'
import { COLUMN_LIMITS } from '@/simulation/models/constants'

/**
 * Filter configuration interface. Layers are ordered top → bottom
 * (water passes through in array order); reorder with the arrow
 * buttons, adjust bed depth with the slider.
 */
export function FilterConfigurator() {
  const layers = useSimulationStore((s) => s.layers)
  const addLayer = useSimulationStore((s) => s.addLayer)
  const removeLayer = useSimulationStore((s) => s.removeLayer)
  const setLayerThickness = useSimulationStore((s) => s.setLayerThickness)
  const moveLayer = useSimulationStore((s) => s.moveLayer)
  const clearColumn = useSimulationStore((s) => s.clearColumn)
  const loadDefaultColumn = useSimulationStore((s) => s.loadDefaultColumn)
  const runSimulation = useSimulationStore((s) => s.runSimulation)
  const validation = useSimulationStore(selectValidation)
  const totalDepth = useSimulationStore(selectTotalDepth)
  const setPanel = useSimulationStore((s) => s.setPanel)

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center justify-between border-b border-ag-ui-border/70 px-4 py-3">
        <div>
          <h2 className="font-display text-sm font-bold tracking-wide text-ag-text">Filter Column</h2>
          <p className="font-mono text-[10px] text-ag-text-dim">
            {layers.length}/{COLUMN_LIMITS.maxLayers} layers · {totalDepth.toFixed(1)}/{COLUMN_LIMITS.maxTotalThickness} cm
          </p>
        </div>
        <button
          onClick={() => setPanel(null)}
          aria-label="Close panel"
          className="rounded-lg p-1.5 text-ag-text-dim transition hover:bg-ag-ui-light hover:text-ag-text"
        >
          <X size={16} />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-3">
        {/* Current stack, top → bottom */}
        <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-ag-text-dim">
          Layer order (top → bottom)
        </p>
        <div className="mb-3 space-y-2">
          <AnimatePresence initial={false}>
            {layers.map((layer, i) => {
              const def = MATERIALS[layer.material]
              return (
                <motion.div
                  key={layer.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.18 }}
                  className="rounded-xl border border-ag-ui-border bg-ag-ui-light/70 p-2.5"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="h-6 w-6 shrink-0 rounded-md border border-black/30"
                      style={{ background: def.color }}
                      aria-hidden
                    />
                    <span className="flex-1 text-xs font-semibold text-ag-text">
                      {def.name}
                      <span className="ml-1.5 font-mono text-[10px] font-normal text-ag-text-dim">
                        #{i + 1}
                      </span>
                    </span>
                    <button
                      onClick={() => moveLayer(layer.id, -1)}
                      disabled={i === 0}
                      aria-label={`Move ${def.name} layer up`}
                      className="rounded p-1 text-ag-text-dim transition hover:text-ag-text disabled:opacity-25"
                    >
                      <ArrowUp size={14} />
                    </button>
                    <button
                      onClick={() => moveLayer(layer.id, 1)}
                      disabled={i === layers.length - 1}
                      aria-label={`Move ${def.name} layer down`}
                      className="rounded p-1 text-ag-text-dim transition hover:text-ag-text disabled:opacity-25"
                    >
                      <ArrowDown size={14} />
                    </button>
                    <button
                      onClick={() => removeLayer(layer.id)}
                      aria-label={`Remove ${def.name} layer`}
                      className="rounded p-1 text-ag-text-dim transition hover:text-ag-danger"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <input
                      type="range"
                      min={COLUMN_LIMITS.minThickness}
                      max={COLUMN_LIMITS.maxThickness}
                      step={0.5}
                      value={layer.thickness}
                      aria-label={`${def.name} thickness`}
                      onChange={(e) => setLayerThickness(layer.id, Number(e.target.value))}
                      className="w-full"
                      style={{ ['--fill' as string]: `${((layer.thickness - COLUMN_LIMITS.minThickness) / (COLUMN_LIMITS.maxThickness - COLUMN_LIMITS.minThickness)) * 100}%` }}
                    />
                    <span className="w-12 shrink-0 text-right font-mono text-[11px] text-ag-sand">
                      {layer.thickness.toFixed(1)}cm
                    </span>
                  </div>
                </motion.div>
              )
            })}
          </AnimatePresence>
          {layers.length === 0 && (
            <div className="rounded-xl border border-dashed border-ag-ui-border p-4 text-center text-xs text-ag-text-dim">
              Empty column — add a material below.
            </div>
          )}
        </div>

        {/* Add materials */}
        <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-ag-text-dim">Add material</p>
        <div className="mb-4 grid grid-cols-3 gap-2">
          {MATERIAL_ORDER.map((m) => (
            <button
              key={m}
              onClick={() => addLayer(m)}
              disabled={layers.length >= COLUMN_LIMITS.maxLayers}
              className="flex flex-col items-center gap-1 rounded-xl border border-ag-ui-border bg-ag-ui-light/60 py-2 text-[10px] font-semibold text-ag-text transition hover:border-ag-fresh hover:bg-ag-fresh/10 disabled:opacity-30"
            >
              <Plus size={14} />
              <span
                className="h-2.5 w-2.5 rounded-full border border-black/30"
                style={{ background: MATERIALS[m].color }}
                aria-hidden
              />
              {MATERIALS[m].name.split(' ')[0]}
            </button>
          ))}
        </div>

        {/* Validation feedback */}
        {validation.errors.map((err) => (
          <Feedback key={err} tone="bad" text={err} />
        ))}
        {validation.warnings.map((warn) => (
          <Feedback key={warn} tone="warn" text={warn} />
        ))}
        {validation.tips.map((tip) => (
          <Feedback key={tip} tone="good" text={tip} />
        ))}
      </div>

      <footer className="border-t border-ag-ui-border/70 p-3">
        <div className="grid grid-cols-[1fr_auto_auto] gap-2">
          <GameButton onClick={runSimulation} disabled={!validation.valid}>
            <Sparkles size={15} /> Apply &amp; Run
          </GameButton>
          <GameButton variant="secondary" onClick={loadDefaultColumn} title="Load starter column">
            Preset
          </GameButton>
          <GameButton variant="ghost" onClick={clearColumn} title="Empty the column">
            Clear
          </GameButton>
        </div>
      </footer>
    </div>
  )
}

function Feedback({ tone, text }: { tone: 'good' | 'warn' | 'bad'; text: string }) {
  const tones = {
    good: 'border-ag-good/40 bg-ag-good/10 text-ag-good',
    warn: 'border-ag-sand/40 bg-ag-sand/10 text-ag-sand',
    bad: 'border-ag-danger/40 bg-ag-danger/10 text-ag-danger',
  }
  return (
    <div className={`mb-1.5 flex items-start gap-2 rounded-lg border px-2.5 py-2 text-[11px] leading-snug ${tones[tone]}`}>
      {tone !== 'good' && <TriangleAlert size={13} className="mt-0.5 shrink-0" />}
      <span className={tone === 'good' ? 'opacity-80' : ''}>{text}</span>
    </div>
  )
}
