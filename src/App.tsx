import { useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { LandingPage } from '@/pages/LandingPage'
import { SimulationPage } from '@/pages/SimulationPage'

type View = 'landing' | 'simulation'

/**
 * Root view switcher. Simple state-based routing (no router dependency)
 * with a cross-fade transition between the menu and the simulation.
 */
export default function App() {
  const [view, setView] = useState<View>('landing')

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={view}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.35 }}
        className="h-full w-full"
      >
        {view === 'landing' ? (
          <LandingPage onStart={() => setView('simulation')} />
        ) : (
          <SimulationPage onExit={() => setView('landing')} />
        )}
      </motion.div>
    </AnimatePresence>
  )
}
