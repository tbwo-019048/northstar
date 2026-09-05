import { PROJECT_STATES, type ProjectState } from '@/lib/types'

/** States that count toward the progress percentage — `support` is excluded
 * from the divisor (a project in support is already "done", same as final). */
const PROGRESS_STATES = PROJECT_STATES.filter((s) => s !== 'support')
const INCREMENT = 100 / PROGRESS_STATES.length

export function statePercent(state: ProjectState): number {
  if (state === 'support') return 100
  const idx = PROGRESS_STATES.indexOf(state)
  if (idx === -1) return 0
  return Math.round((idx + 1) * INCREMENT)
}

const SIZES = {
  xs: { w: 96, h: 56, stroke: 8, font: 'text-sm' },
  sm: { w: 128, h: 72, stroke: 10, font: 'text-base' },
  md: { w: 160, h: 90, stroke: 12, font: 'text-lg' },
} as const

export function HalfCircleProgress({
  value,
  label,
  size = 'sm',
  color = 'var(--primary)',
}: {
  value: number
  label?: string
  size?: keyof typeof SIZES
  color?: string
}) {
  const { w, h, stroke, font } = SIZES[size]
  const r = (w - stroke) / 2
  const cx = w / 2
  const cy = h - stroke / 2
  const path = `M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`
  const length = Math.PI * r
  const pct = Math.max(0, Math.min(100, value))
  const offset = length * (1 - pct / 100)

  return (
    <div className="flex flex-col items-center" style={{ width: w }}>
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
        <path
          d={path}
          fill="none"
          stroke="var(--border)"
          strokeWidth={stroke}
          strokeLinecap="round"
        />
        <path
          d={path}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={length}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 300ms ease' }}
        />
      </svg>
      <div className={`-mt-1 font-semibold tabular-nums ${font}`}>{pct}%</div>
      {label && <div className="text-[11px] capitalize text-muted-foreground">{label}</div>}
    </div>
  )
}
