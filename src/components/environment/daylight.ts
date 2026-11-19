/**
 * Shared, deterministic day/night helpers. `timeOfDay` is 0..24 with
 * sunrise at 06:00, noon at 12:00 and sunset at 18:00. These are visual
 * lighting curves, not astronomical calculations.
 */
export function sunElevation(timeOfDay: number): number {
  return Math.sin(((timeOfDay - 6) / 12) * Math.PI)
}

export function dayFactor(timeOfDay: number): number {
  return clamp((sunElevation(timeOfDay) + 0.12) / 0.5, 0, 1)
}

export function nightFactor(timeOfDay: number): number {
  return 1 - dayFactor(timeOfDay)
}

export function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v))
}
