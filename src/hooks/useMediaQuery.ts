import { useEffect, useState } from 'react'

/**
 * Tracks a CSS media query, SSR-safe and reactive.
 * Used to switch the sim layout to the mobile-friendly fallback.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(query).matches : false,
  )

  useEffect(() => {
    const mql = window.matchMedia(query)
    const onChange = (e: MediaQueryListEvent) => setMatches(e.matches)
    setMatches(mql.matches)
    mql.addEventListener('change', onChange)
    return () => mql.removeEventListener('change', onChange)
  }, [query])

  return matches
}

/** True on narrow viewports where the full 3D HUD would crowd the screen. */
export const useIsMobile = () => useMediaQuery('(max-width: 820px)')

/**
 * Synchronous WebGL support probe. Runs once; used to decide between the
 * real 3D scene and the static fallback layout.
 */
export function checkWebGL(): boolean {
  try {
    const canvas = document.createElement('canvas')
    return !!(
      window.WebGLRenderingContext &&
      (canvas.getContext('webgl') || canvas.getContext('experimental-webgl'))
    )
  } catch {
    return false
  }
}
