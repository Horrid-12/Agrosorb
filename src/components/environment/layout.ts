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

/**
 * Sample a point along a polyline of [x, z] points.
 * `t` in [0, 1] walks the path by arc length.
 */
export function samplePolyline(
  points: Array<[number, number]>,
  t: number,
): [number, number] {
  const lengths: number[] = []
  let total = 0
  for (let i = 0; i < points.length - 1; i++) {
    const len = Math.hypot(points[i + 1][0] - points[i][0], points[i + 1][1] - points[i][1])
    lengths.push(len)
    total += len
  }
  let dist = Math.max(0, Math.min(1, t)) * total
  for (let i = 0; i < lengths.length; i++) {
    if (dist <= lengths[i] || i === lengths.length - 1) {
      const f = lengths[i] === 0 ? 0 : dist / lengths[i]
      return [
        points[i][0] + (points[i + 1][0] - points[i][0]) * f,
        points[i][1] + (points[i + 1][1] - points[i][1]) * f,
      ]
    }
    dist -= lengths[i]
  }
  return points[points.length - 1]
}

/**
 * Runoff flow paths (top view): water leaving each field travels through
 * the cross/main collection channels toward the filtration station inlet.
 */
export const RUNOFF_PATHS: Array<Array<[number, number]>> = [
  // Field A → cross channel → main channel → station inlet
  [[1, -17], [1, -1.4], [9.9, -1.4], [9.9, 12.5]],
  // Field B → east into the main channel
  [[1, 3], [9.9, 3], [9.9, 12.5]],
  // Field C → west into the main channel
  [[19, -17], [9.9, -17], [9.9, 12.5]],
]

export const LAYOUT = {
  groundSize: 80,
  river: { xMin: -40, xMax: -32, zMin: -120, zMax: 120, y: 0.25 },
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
