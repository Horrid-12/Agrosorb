/**
 * Custom themed Recharts tooltip shared by every dashboard.
 * Recharts' default tooltip styling is not reliable across versions,
 * so we render our own dark green card consistent with the HUD.
 */
export function SimTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: Array<{ name?: string; value?: number | string; color?: string; dataKey?: string | number }>
  label?: string | number
}) {
  if (!active || !payload || payload.length === 0) return null
  return (
    <div className="rounded-xl border border-ag-ui-border bg-ag-ui px-3 py-2 shadow-panel">
      <p className="mb-1 text-[11px] font-bold text-ag-text">{label}</p>
      {payload.map((entry) => (
        <p key={String(entry.dataKey)} className="text-[11px]" style={{ color: entry.color }}>
          {entry.name} : {entry.value}
        </p>
      ))}
    </div>
  )
}
