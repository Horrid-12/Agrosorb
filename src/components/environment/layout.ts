import { useMemo } from 'react'

/** Deterministic seeded PRNG so the landscape is identical every load. */
export function mulberry32(seed: number) {
  let a = seed >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Reusable seeded random factory for a component instance. */
export function useSeededRandom(seed: number) {
  return useMemo(() => mulberry32(seed), [seed])
}

/** World-space layout constants shared by every environment piece. */
export interface FieldRect {
  xMin: number
  xMax: number
  zMin: number
  zMax: number
}

export const LAYOUT = {
  groundSize: 80,
  river: { xMin: -40, xMax: -32, zMin: -40, zMax: 40, y: 0.25 },
  fields: {
    A: { xMin: -6, xMax: 8, zMin: -24, zMax: -10 },
    B: { xMin: -6, xMax: 8, zMin: -4, zMax: 10 },
    C: { xMin: 12, xMax: 26, zMin: -24, zMax: -10 },
  },
  mainChannel: { xMin: 9, xMax: 10.8, zMin: -27, zMax: 13.5 },
  crossChannel: { xMin: -6, xMax: 9, zMin: -2.2, zMax: -0.6 },
  outletChannel: { xMin: 10.8, xMax: 20.4, zMin: 18.6, zMax: 20.2 },
  station: { x: 10, z: 16.5 },
  tank: { x: 22, z: 19.4 },
  pond: { x: 12.4, z: -28.5 },
  barn: { x: -20, z: 22 },
} as const
