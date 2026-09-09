import { useEffect, useRef, useState } from 'react'
import { PROJECT_STATES, type ProjectState } from '@/lib/types'

/** States that count toward the progress percentage — `support` and `retired`
 * are excluded from the divisor (a project in support is already "done", same
 * as final; a retired project is closed out). */
const PROGRESS_STATES = PROJECT_STATES.filter((s) => s !== 'support' && s !== 'retired')
const INCREMENT = 100 / PROGRESS_STATES.length

export function statePercent(state: ProjectState): number {
  if (state === 'support' || state === 'retired') return 100
  const idx = PROGRESS_STATES.indexOf(state)
  if (idx === -1) return 0
  return Math.round((idx + 1) * INCREMENT)
}

const SIZES = {
  xs: { w: 96, h: 56, stroke: 8, font: 'text-sm' },
  sm: { w: 128, h: 72, stroke: 10, font: 'text-base' },
  md: { w: 160, h: 90, stroke: 12, font: 'text-lg' },
  lg: { w: 165, h: 92, stroke: 11, font: 'text-xl' },
} as const

/** Eases up to `target` from the previously shown value with a
 * requestAnimationFrame ramp, so the gauge fills and the number counts up on
 * mount (from 0) and whenever the state changes. Honours reduced-motion. */
function useCountUp(target: number, animate: boolean, duration = 900) {
  const reduce =
    typeof window !== 'undefined' &&
    !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  const active = animate && !reduce
  const [shown, setShown] = useState(0)
  const fromRef = useRef(0)

  useEffect(() => {
    if (!active) return
    const from = fromRef.current
    const start = performance.now()
    let raf = 0
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - t, 3)
      const next = from + (target - from) * eased
      fromRef.current = next
      setShown(next)
      if (t < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, active, duration])

  return active ? shown : target
}

export function HalfCircleProgress({
  value,
  label,
  size = 'sm',
  color = 'var(--primary)',
  animate = true,
}: {
  value: number
  label?: string
  size?: keyof typeof SIZES
  color?: string
  animate?: boolean
}) {
  const { w, h, stroke, font } = SIZES[size]
  const r = (w - stroke) / 2
  const cx = w / 2
  const cy = h - stroke / 2
  const path = `M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`
  const length = Math.PI * r
  const clamped = Math.max(0, Math.min(100, value))
  const shown = useCountUp(clamped, animate)
  const pct = Math.round(shown)
  const offset = length * (1 - shown / 100)

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
        />
      </svg>
      <div className={`-mt-1 font-semibold tabular-nums ${font}`}>{pct}%</div>
      {label && <div className="text-[11px] capitalize text-muted-foreground">{label}</div>}
    </div>
  )
}
