import type { ReactNode } from 'react'

interface ControlSliderProps {
  label: string
  value: number
  min: number
  max: number
  step?: number
  unit?: string
  /** Overrides the numeric readout (e.g. 0..1 shown as 0–100%). */
  display?: string
  hint?: string
  /** Optional badge / extra label shown on the right. */
  badge?: ReactNode
  disabled?: boolean
  onChange: (value: number) => void
}

/**
 * Reusable themed range control used by the scenario panel, filter
 * configurator and inspection view. Keeps the fill style and accessibility
 * behaviour consistent across every control in the simulator.
 */
export function ControlSlider({
  label,
  value,
  min,
  max,
  step = 0.1,
  unit,
  display,
  hint,
  badge,
  disabled,
  onChange,
}: ControlSliderProps) {
  const fill = max === min ? 0 : ((value - min) / (max - min)) * 100
  return (
    <label className={`block ${disabled ? 'opacity-50' : ''}`}>
      <div className="mb-1 flex items-center justify-between gap-2 text-[11px] text-ag-text-dim">
        <span className="flex min-w-0 items-center gap-1.5">
          <span className="truncate">{label}</span>
          {badge}
        </span>
        <span className="shrink-0 font-mono text-ag-text">
          {display ?? formatValue(value)}
          {unit && <span className="ml-0.5 text-[9px] text-ag-text-dim">{unit}</span>}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        aria-label={label}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full"
        style={{ ['--fill' as string]: `${fill}%` }}
      />
      {hint && <p className="mt-0.5 text-[9px] leading-snug text-ag-text-dim/80">{hint}</p>}
    </label>
  )
}

function formatValue(v: number): string {
  if (Number.isInteger(v)) return String(v)
  return v.toFixed(2).replace(/\.?0+$/, '')
}
