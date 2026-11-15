import { lazy, Suspense, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { BookOpen, CircleHelp, Droplets, Info, Play, X } from 'lucide-react'
import { ErrorBoundary } from '@/components/ui/ErrorBoundary'
import { SceneFallback } from '@/components/SceneFallback'
import { HOW_IT_WORKS_STEPS, ABOUT_TEXT, LEARN_TOPICS } from '@/data/educational'

const AgriculturalScene = lazy(() => import('@/scenes/AgriculturalScene'))

type ModalId = 'learn' | 'how' | 'about' | null

/**
 * Landing / main menu. The 3D farm diorama renders full-screen behind
 * the menu (slow auto-orbit) so the experience starts as a game, not a
 * conventional web page.
 */
export function LandingPage({ onStart }: { onStart: () => void }) {
  const [modal, setModal] = useState<ModalId>(null)

  return (
    <div className="relative h-full w-full overflow-hidden">
      {/* 3D backdrop */}
      <div className="absolute inset-0">
        <ErrorBoundary fallback={<SceneFallback />}>
          <Suspense fallback={<SceneLoading />}>
            <AgriculturalScene mode="menu" />
          </Suspense>
        </ErrorBoundary>
      </div>

      {/* Scrim for readability */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-ag-ui/80 via-ag-ui/30 to-transparent" />

      {/* Menu */}
      <div className="relative z-10 flex h-full items-center px-[8vw]">
        <div className="max-w-lg">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-ag-ui-border bg-ag-ui/70 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.25em] text-ag-fresh">
              <Droplets size={12} /> Environmental Engineering Simulator
            </div>

            <h1 className="font-display text-6xl font-extrabold leading-none tracking-tight text-ag-text drop-shadow-[0_4px_16px_rgba(0,0,0,0.5)] sm:text-7xl">
              Agro<span className="text-ag-fresh">Sorb</span>
            </h1>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-ag-text-dim sm:text-base">
              Heavy rain is falling on the farm. Filter the runoff — stack sand, gravel
              and activated carbon, and keep the river clean.
            </p>

            <nav className="mt-8 flex flex-col gap-3" aria-label="Main menu">
              <MenuButton primary onClick={onStart} icon={<Play size={18} />}>
                Start Simulation
              </MenuButton>
              <MenuButton onClick={() => setModal('learn')} icon={<BookOpen size={18} />}>
                Learn About AgroSorb
              </MenuButton>
              <MenuButton onClick={() => setModal('how')} icon={<CircleHelp size={18} />}>
                How It Works
              </MenuButton>
              <MenuButton onClick={() => setModal('about')} icon={<Info size={18} />}>
                About the Project
              </MenuButton>
            </nav>
          </motion.div>
        </div>
      </div>

      <footer className="absolute bottom-4 right-6 z-10 font-mono text-[10px] text-ag-text-dim">
        Simulated values only — not laboratory measurements
      </footer>

      {/* Modals */}
      <AnimatePresence>
        {modal === 'learn' && (
          <ContentModal title="Learn About AgroSorb" onClose={() => setModal(null)}>
            <div className="space-y-3">
              {LEARN_TOPICS.slice(0, 4).map((t) => (
                <div key={t.id} className="rounded-xl border border-ag-ui-border bg-ag-ui-light/60 p-3">
                  <h3 className="mb-1 text-sm font-bold text-ag-fresh">{t.title}</h3>
                  <p className="text-xs leading-relaxed text-ag-text-dim">{t.summary}</p>
                </div>
              ))}
              <p className="text-xs text-ag-text-dim">
                The full Learning Center is available inside the simulation.
              </p>
            </div>
          </ContentModal>
        )}
        {modal === 'how' && (
          <ContentModal title="How It Works" onClose={() => setModal(null)}>
            <ol className="space-y-3">
              {HOW_IT_WORKS_STEPS.map((s) => (
                <li key={s.step} className="flex gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-ag-fresh/20 font-mono text-xs font-bold text-ag-fresh">
                    {s.step}
                  </span>
                  <div>
                    <h3 className="text-sm font-bold text-ag-text">{s.title}</h3>
                    <p className="text-xs leading-relaxed text-ag-text-dim">{s.text}</p>
                  </div>
                </li>
              ))}
            </ol>
          </ContentModal>
        )}
        {modal === 'about' && (
          <ContentModal title="About the Project" onClose={() => setModal(null)}>
            <div className="space-y-3">
              {ABOUT_TEXT.map((p, i) => (
                <p key={i} className="text-xs leading-relaxed text-ag-text-dim">
                  {p}
                </p>
              ))}
              <p className="rounded-lg border border-ag-warn/40 bg-ag-warn/10 px-3 py-2 text-xs text-ag-warn">
                All water-quality figures in AgroSorb are simulated by a documented educational
                model and are distinct from real laboratory measurements.
              </p>
            </div>
          </ContentModal>
        )}
      </AnimatePresence>
    </div>
  )
}

function MenuButton({
  children,
  icon,
  primary = false,
  ...rest
}: Omit<React.ComponentProps<typeof motion.button>, 'children'> & {
  icon: React.ReactNode
  primary?: boolean
  children: React.ReactNode
}) {
  return (
    <motion.button
      whileHover={{ x: 6 }}
      whileTap={{ scale: 0.98 }}
      className={`flex w-fit items-center gap-3 rounded-xl border px-5 py-3 text-left font-display text-sm font-semibold transition-colors ${
        primary
          ? 'border-ag-forest bg-ag-fresh text-ag-forest shadow-[0_5px_0_0_#244D35] hover:bg-ag-fresh/90'
          : 'border-ag-ui-border bg-ag-ui/70 text-ag-text hover:border-ag-fresh/60 hover:bg-ag-ui-light'
      }`}
      {...rest}
    >
      {icon}
      {children}
    </motion.button>
  )
}

function ContentModal({
  title,
  children,
  onClose,
}: {
  title: string
  children: React.ReactNode
  onClose: () => void
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-20 flex items-center justify-center bg-ag-ui/70 p-6"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <motion.div
        initial={{ scale: 0.92, y: 16 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.94, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 320, damping: 26 }}
        className="max-h-[80vh] w-full max-w-md overflow-y-auto rounded-2xl border border-ag-ui-border bg-ag-ui p-5 shadow-panel"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-bold text-ag-text">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="rounded-lg p-1.5 text-ag-text-dim transition hover:bg-ag-ui-light hover:text-ag-text"
          >
            <X size={16} />
          </button>
        </div>
        {children}
      </motion.div>
    </motion.div>
  )
}

/** Branded loading state shown while the 3D bundle lazy-loads. */
function SceneLoading() {
  return (
    <div className="flex h-full items-center justify-center bg-ag-sky">
      <motion.div
        animate={{ y: [0, -8, 0] }}
        transition={{ repeat: Infinity, duration: 1.4 }}
        className="text-center"
      >
        <div className="mx-auto mb-3 h-12 w-12 rounded-xl bg-ag-fresh shadow-glow" />
        <p className="font-mono text-xs text-ag-forest">Growing the farm…</p>
      </motion.div>
    </div>
  )
}
