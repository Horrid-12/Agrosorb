import { motion, type HTMLMotionProps } from 'framer-motion'
import type { ReactNode } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'

const VARIANTS: Record<Variant, string> = {
  primary:
    'bg-ag-fresh text-ag-forest hover:bg-ag-fresh/90 border-ag-forest shadow-[0_4px_0_0_#244D35] active:translate-y-[2px] active:shadow-[0_2px_0_0_#244D35]',
  secondary:
    'bg-ag-ui-light text-ag-text hover:bg-ag-ui-border/60 border-ag-ui-border shadow-[0_4px_0_0_#0d1611] active:translate-y-[2px] active:shadow-[0_2px_0_0_#0d1611]',
  ghost: 'bg-transparent text-ag-text-dim hover:text-ag-text hover:bg-ag-ui-light/70 border-transparent',
  danger:
    'bg-ag-danger/90 text-ag-ui hover:bg-ag-danger border-ag-soil-dark shadow-[0_4px_0_0_#5d4029] active:translate-y-[2px] active:shadow-[0_2px_0_0_#5d4029]',
}

interface GameButtonProps extends HTMLMotionProps<'button'> {
  variant?: Variant
  children: ReactNode
}

/** Chunky game-style button with press physics. */
export function GameButton({ variant = 'primary', className = '', children, ...rest }: GameButtonProps) {
  return (
    <motion.button
      whileHover={{ y: -1 }}
      whileTap={{ scale: 0.97 }}
      className={`inline-flex select-none items-center justify-center gap-2 rounded-xl border px-4 py-2.5 font-display text-sm font-semibold tracking-wide transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${VARIANTS[variant]} ${className}`}
      {...rest}
    >
      {children}
    </motion.button>
  )
}

interface PanelProps {
  children: ReactNode
  className?: string
}

/** Dark HUD panel used for every interface card over the 3D view. */
export function HudPanel({ children, className = '' }: PanelProps) {
  return (
    <div
      className={`rounded-2xl border border-ag-ui-border/80 bg-ag-ui/90 shadow-panel ${className}`}
    >
      {children}
    </div>
  )
}

interface StatBadgeProps {
  label: string
  value: string
  unit?: string
  tone?: 'neutral' | 'good' | 'warn' | 'bad' | 'water'
}

/** Compact key-figure badge for the dashboard. */
export function StatBadge({ label, value, unit, tone = 'neutral' }: StatBadgeProps) {
  const tones: Record<string, string> = {
    neutral: 'text-ag-text bg-ag-ui-light border-ag-ui-border',
    good: 'text-ag-good bg-ag-good/10 border-ag-good/40',
    warn: 'text-ag-sand bg-ag-sand/10 border-ag-sand/40',
    bad: 'text-ag-danger bg-ag-danger/10 border-ag-danger/40',
    water: 'text-ag-good bg-ag-good/10 border-ag-good/40',
  }
  return (
    <div className={`rounded-xl border px-3 py-2 ${tones[tone]}`}>
      <div className="text-[10px] font-medium uppercase tracking-widest text-ag-text-dim">{label}</div>
      <div className="font-mono text-lg font-semibold leading-tight">
        {value}
        {unit && <span className="ml-1 text-[11px] font-normal text-ag-text-dim">{unit}</span>}
      </div>
    </div>
  )
}
