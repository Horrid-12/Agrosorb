import { useEffect } from 'react'
import { useSimulationStore } from '@/stores/simulationStore'

/**
 * Global keyboard shortcuts for the simulation:
 *   Space  — toggle rainfall
 *   S      — open/close the scenario & chemistry panel
 *   C      — open/close the filter configurator
 *   I      — open/close the filter-station inspection
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
        case 's':
        case 'S':
          store.setPanel(store.panel === 'scenario' ? null : 'scenario')
          break
        case 'c':
        case 'C':
          store.setPanel(store.panel === 'config' ? null : 'config')
          break
        case 'i':
        case 'I':
          store.setPanel(store.panel === 'inspection' ? null : 'inspection')
          store.setStationInspecting(store.panel !== 'inspection')
          break
        case 'r':
        case 'R':
          store.setPanel(store.panel === 'results' ? null : 'results')
          break
        case 'Escape':
          if (store.panel) store.setPanel(null)
          store.setStationInspecting(false)
          break
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])
}
