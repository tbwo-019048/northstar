/**
 * A GitHub-style contribution calendar, drawn as a single scalable SVG (no
 * horizontal scrollbar). `counts` maps 'YYYY-MM-DD' → commits.
 */

const CELL = 12
const GAP = 3
const STEP = CELL + GAP
const PAD_LEFT = 26 // weekday labels
const PAD_TOP = 14 // month labels
const LEGEND = 20
const DAY_MS = 86_400_000

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

function bucketFill(n: number): string {
  if (n <= 0) return 'color-mix(in srgb, currentColor 10%, transparent)'
  if (n < 3) return 'color-mix(in srgb, var(--primary) 28%, transparent)'
  if (n < 6) return 'color-mix(in srgb, var(--primary) 50%, transparent)'
  if (n < 10) return 'color-mix(in srgb, var(--primary) 72%, transparent)'
  return 'var(--primary)'
}

export function GithubCalendar({
  counts,
  weeks = 53,
  className,
}: {
  counts: Record<string, number>
  weeks?: number
  className?: string
}) {
  const today = new Date()
  const todayUTC = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())
  const start = todayUTC - (today.getUTCDay() + (weeks - 1) * 7) * DAY_MS

  const width = PAD_LEFT + weeks * STEP
  const height = PAD_TOP + 7 * STEP + LEGEND

  const columns = Array.from({ length: weeks }, (_, w) => {
    const first = new Date(start + w * 7 * DAY_MS)
    const prev = w > 0 ? new Date(start + (w - 1) * 7 * DAY_MS) : null
    return {
      month: !prev || prev.getUTCMonth() !== first.getUTCMonth() ? MONTHS[first.getUTCMonth()] : '',
      days: Array.from({ length: 7 }, (_, d) => {
        const t = start + (w * 7 + d) * DAY_MS
        const key = new Date(t).toISOString().slice(0, 10)
        return { key, t, count: counts[key] ?? 0, future: t > todayUTC }
      }),
    }
  })

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      width="100%"
      role="img"
      aria-label="GitHub contribution calendar for the last year"
      className={className}
      style={{ maxWidth: width * 1.6 }}
    >
      <title>Commits over the last year</title>

      {['Mon', 'Wed', 'Fri'].map((label, i) => (
        <text
          key={label}
          x={0}
          y={PAD_TOP + (i * 2 + 1) * STEP + CELL - 2}
          fontSize={9}
          fill="var(--muted-fg, #6b7280)"
        >
          {label}
        </text>
      ))}

      {columns.map((col, w) => (
        <g key={w} transform={`translate(${PAD_LEFT + w * STEP}, ${PAD_TOP})`}>
          {col.month && (
            <text x={0} y={-4} fontSize={9} fill="var(--muted-fg, #6b7280)">
              {col.month}
            </text>
          )}
          {col.days.map((cell, d) =>
            cell.future ? null : (
              <rect
                key={cell.key}
                x={0}
                y={d * STEP}
                width={CELL}
                height={CELL}
                rx={2}
                fill={bucketFill(cell.count)}
                stroke="currentColor"
                strokeOpacity={0.12}
                strokeWidth={1}
              >
                <title>
                  {cell.count} commit{cell.count === 1 ? '' : 's'} on{' '}
                  {new Date(cell.t).toLocaleDateString(undefined, { dateStyle: 'medium' })}
                </title>
              </rect>
            ),
          )}
        </g>
      ))}

      <g transform={`translate(${PAD_LEFT}, ${PAD_TOP + 7 * STEP + 6})`}>
        <text x={0} y={CELL - 2} fontSize={9} fill="var(--muted-fg, #6b7280)">
          Less
        </text>
        {[0, 2, 5, 9, 12].map((n, i) => (
          <rect
            key={n}
            x={26 + i * STEP}
            y={0}
            width={CELL}
            height={CELL}
            rx={2}
            fill={bucketFill(n)}
            stroke="currentColor"
            strokeOpacity={0.12}
          />
        ))}
        <text x={26 + 5 * STEP + 4} y={CELL - 2} fontSize={9} fill="var(--muted-fg, #6b7280)">
          More
        </text>
      </g>
    </svg>
  )
}
