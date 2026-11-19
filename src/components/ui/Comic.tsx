import type { ReactNode } from 'react'
import { Info } from 'lucide-react'

/**
 * Small comic-inspired building blocks shared by the scenario and filter
 * inspection interfaces. Hard borders, flat shadows and halftone texture —
 * no neon, glow or glassmorphism.
 */
export function ComicPanel({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div className={`comic-panel relative ${className}`}>
      <div className="halftone pointer-events-none absolute inset-0 rounded-[inherit] opacity-[0.06]" aria-hidden />
      <div className="relative">{children}</div>
    </div>
  )
}

export function ComicTag({
  children,
  tone = 'cream',
}: {
  children: ReactNode
  tone?: 'cream' | 'green' | 'yellow' | 'blue' | 'red'
}) {
  const tones: Record<string, string> = {
    cream: 'border-ag-sand bg-ag-sand text-ag-forest',
    green: 'border-ag-forest bg-ag-fresh text-ag-forest',
    yellow: 'border-ag-forest bg-ag-warn text-ag-forest',
    blue: 'border-ag-forest bg-ag-sky text-ag-forest',
    red: 'border-ag-soil-dark bg-ag-danger text-ag-ui',
  }
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border-2 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wider ${tones[tone]}`}
    >
      {children}
    </span>
  )
}

export function SimBadge({ children = 'Simulated' }: { children?: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded border border-ag-warn/50 bg-ag-warn/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-ag-warn">
      <Info size={9} /> {children}
    </span>
  )
}

/** Horizontal loading / saturation meter with a comic outline. */
export function Meter({
  value,
  color = '#76a85b',
  label,
  trailing,
}: {
  value: number
  color?: string
  label?: string
  trailing?: ReactNode
}) {
  const pct = Math.max(0, Math.min(100, value))
  return (
    <div>
      {(label || trailing) && (
        <div className="mb-1 flex items-center justify-between text-[9px] text-ag-text-dim">
          <span>{label}</span>
          <span className="font-mono">{trailing ?? `${Math.round(pct)}%`}</span>
        </div>
      )}
      <div className="h-2 overflow-hidden rounded-full border border-black/30 bg-ag-ui" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pct)} aria-label={label}>
        <div
          className="h-full rounded-full transition-[width] duration-300"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
  )
}
