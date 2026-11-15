import { useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { FlaskConical, GraduationCap, BarChart3, Home } from 'lucide-react'
import { useKeyboardControls } from '@/hooks/useKeyboardControls'
import { useIsMobile, checkWebGL } from '@/hooks/useMediaQuery'
import { validateConfig } from '@/simulation/engine/filtrationEngine'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'
import { SceneFallback } from '@/components/SceneFallback'
import { SimulationControls } from '@/components/simulation/SimulationControls'
import { FilterConfigurator } from '@/components/simulation/FilterConfigurator'
import { ResultsDashboard } from '@/components/dashboard/ResultsDashboard'
import { LearningPanel } from '@/components/learn/LearningPanel'
import { useSimulationStore } from '@/stores/simulationStore'
import { lazy, Suspense } from 'react'

const AgriculturalScene = lazy(() => import('@/scenes/AgriculturalScene'))

/**
 * The primary game view: the 3D farm fills the screen while HUD panels
 * float above it — weather controls bottom-left, and a switchable
 * right-side panel (Config / Results / Learn).
 */
export function SimulationPage({ onExit }: { onExit: () => void }) {
  useKeyboardControls()

  const panel = useSimulationStore((s) => s.panel)
  const setPanel = useSimulationStore((s) => s.setPanel)
  const phase = useSimulationStore((s) => s.phase)
  const isMobile = useIsMobile()
  const webglOk = checkWebGL()
  const simStatus = useSimulationStore((s) => s.simStatus)

  // Sim flow: trigger runoff → runoff visuals play → simulation starts
  // (result computed immediately, then revealed by the treatment animation).
  useEffect(() => {
    if (phase !== 'runoff') return
    const t = setTimeout(() => {
      const store = useSimulationStore.getState()
      if (validateConfig(store.layers).valid) {
        store.runSimulation()
      }
    }, 1800)
    return () => clearTimeout(t)
  }, [phase])

  // Open the relevant panel when the treatment sequence resolves.
  useEffect(() => {
    if (simStatus === 'complete') setPanel('results')
    else if (simStatus === 'error') setPanel('config')
  }, [simStatus, setPanel])

  const canRenderScene = webglOk && !isMobile

  // Without a 3D scene there is no useFrame heartbeat — drive the
  // treatment sequence with an interval so the loop still completes.
  useEffect(() => {
    if (canRenderScene) return
    const id = setInterval(() => useSimulationStore.getState().advanceTreatment(0.1), 100)
    return () => clearInterval(id)
  }, [canRenderScene])

  return (
    <div className="relative h-full w-full overflow-hidden">
      {/* 3D environment */}
      {canRenderScene && (
        <div className="absolute inset-0">
          <ErrorBoundary fallback={<SceneFallback />}>
            <Suspense fallback={<SceneLoading />}>
              <AgriculturalScene mode="sim" />
            </Suspense>
          </ErrorBoundary>
        </div>
      )}

      {!canRenderScene && (
        <div className="absolute inset-0">
          <SceneFallback reason={isMobile ? 'mobile' : 'no-webgl'} />
        </div>
      )}

      {/* HUD chrome */}
      <div className="pointer-events-none absolute inset-0 flex flex-col p-4">
        {/* Top bar */}
        <div className="flex items-start justify-between">
          <div className="pointer-events-auto flex items-center gap-3">
            <button
              onClick={onExit}
              aria-label="Back to main menu"
              className="flex items-center gap-2 rounded-xl border border-ag-ui-border bg-ag-ui/85 px-3 py-2 font-display text-sm font-bold text-ag-text shadow-panel transition hover:bg-ag-ui-light"
            >
              <Home size={15} /> Agro<span className="text-ag-fresh">Sorb</span>
            </button>
            <span className="rounded-full border border-ag-ui-border bg-ag-ui/85 px-3 py-1 font-mono text-[10px] uppercase tracking-widest text-ag-text-dim">
              {phase}
            </span>
          </div>

          {/* Panel switcher */}
          <div className="pointer-events-auto flex gap-2">
            <PanelTab active={panel === 'config'} onClick={() => toggle(panel, setPanel, 'config')} icon={<FlaskConical size={15} />} label="Filter" hint="C" />
            <PanelTab active={panel === 'results'} onClick={() => toggle(panel, setPanel, 'results')} icon={<BarChart3 size={15} />} label="Results" hint="R" />
            <PanelTab active={panel === 'learn'} onClick={() => toggle(panel, setPanel, 'learn')} icon={<GraduationCap size={15} />} label="Learn" />
          </div>
        </div>

        {/* Bottom-left controls */}
        <div className="mt-auto flex justify-start">
          <SimulationControls />
        </div>
      </div>

      {/* Right-side sliding panel */}
      <AnimatePresence mode="wait">
        {panel && (
          <motion.aside
            key={panel}
            initial={{ x: 420, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 420, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="absolute bottom-4 right-4 top-[4.5rem] z-30 w-[340px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-ag-ui-border/80 bg-ag-ui/92 shadow-panel"
            aria-label={`${panel} panel`}
          >
            {panel === 'config' && <FilterConfigurator />}
            {panel === 'results' && <ResultsDashboard />}
            {panel === 'learn' && <LearningPanel />}
          </motion.aside>
        )}
      </AnimatePresence>
    </div>
  )
}

function toggle(
  current: string | null,
  setPanel: (p: 'config' | 'results' | 'learn' | null) => void,
  id: 'config' | 'results' | 'learn',
) {
  setPanel(current === id ? null : id)
}

function PanelTab({
  active,
  onClick,
  icon,
  label,
  hint,
}: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
  hint?: string
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold shadow-panel transition ${
        active
          ? 'border-ag-fresh bg-ag-fresh text-ag-forest'
          : 'border-ag-ui-border bg-ag-ui/85 text-ag-text hover:bg-ag-ui-light'
      }`}
    >
      {icon}
      {label}
      {hint && <kbd className="rounded bg-black/20 px-1 font-mono text-[9px]">{hint}</kbd>}
    </button>
  )
}

function SceneLoading() {
  return (
    <div className="flex h-full items-center justify-center bg-ag-sky">
      <motion.div animate={{ y: [0, -8, 0] }} transition={{ repeat: Infinity, duration: 1.4 }}>
        <p className="font-mono text-xs text-ag-forest">Loading the farm…</p>
      </motion.div>
    </div>
  )
}
