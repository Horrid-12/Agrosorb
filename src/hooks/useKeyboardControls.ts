import { useEffect } from 'react'
import { useSimulationStore } from '@/stores/simulationStore'

/**
 * Global keyboard shortcuts for the simulation:
 *   Space  — toggle rainfall
 *   C      — open/close the filter configurator
 *   R      — open/close the results dashboard
 *   Esc    — close any open panel
 * Buttons remain fully reachable via Tab, so these are pure accelerators.
 */
export function useKeyboardControls() {
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      // Never hijack typing inside inputs.
      const target = e.target as HTMLElement
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return
      }

      const store = useSimulationStore.getState()
      switch (e.key) {
        case ' ':
          e.preventDefault()
          store.phase === 'idle' ? store.startRain() : store.stopRain()
          break
        case 'c':
        case 'C':
          store.setPanel(store.panel === 'config' ? null : 'config')
          break
        case 'r':
        case 'R':
          store.setPanel(store.panel === 'results' ? null : 'results')
          break
        case 'Escape':
          if (store.panel) store.setPanel(null)
          break
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])
}
