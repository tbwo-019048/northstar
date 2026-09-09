/**
 * A GitHub-style contribution calendar. `counts` maps 'YYYY-MM-DD' → commits.
 * Pure CSS grid, no dependency. Renders an all-empty grid when `counts` is {}.
 */

const CELL = 11
const GAP = 3
const DAY_MS = 86_400_000

function bucketClass(n: number): string {
  if (n <= 0) return 'bg-muted'
  if (n < 3) return 'bg-green-200 dark:bg-green-900'
  if (n < 6) return 'bg-green-400 dark:bg-green-700'
  if (n < 10) return 'bg-green-500 dark:bg-green-500'
  return 'bg-green-600 dark:bg-green-400'
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export function GithubCalendar({
  counts,
  weeks = 53,
  className,
}: {
  counts: Record<string, number>
  weeks?: number
  className?: string
}) {
  // Column 0 starts on the Sunday `weeks-1` weeks before the Sunday of this week.
  const today = new Date()
  const todayUTC = Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())
  const start = todayUTC - (today.getUTCDay() + (weeks - 1) * 7) * DAY_MS

  const columns = Array.from({ length: weeks }, (_, w) =>
    Array.from({ length: 7 }, (_, d) => {
      const t = start + (w * 7 + d) * DAY_MS
      const key = new Date(t).toISOString().slice(0, 10)
      return { key, t, count: counts[key] ?? 0, future: t > todayUTC }
    }),
  )

  const monthLabels = columns.map((col, w) => {
    const first = new Date(col[0].t)
    const prev = w > 0 ? new Date(columns[w - 1][0].t) : null
    return !prev || prev.getUTCMonth() !== first.getUTCMonth() ? MONTHS[first.getUTCMonth()] : ''
  })

  const LABEL_W = 26

  return (
    <div className={'inline-block overflow-x-auto text-left ' + (className ?? '')}>
      <div className="flex" style={{ gap: GAP, paddingLeft: LABEL_W }}>
        {monthLabels.map((label, w) => (
          <span
            key={w}
            className="whitespace-nowrap text-[10px] text-muted-foreground"
            style={{ width: CELL }}
          >
            {label}
          </span>
        ))}
      </div>
      <div className="flex" style={{ gap: GAP }}>
        <div
          className="flex shrink-0 flex-col justify-around pr-1 text-[9px] leading-none text-muted-foreground"
          style={{ width: LABEL_W, height: 7 * CELL + 6 * GAP }}
        >
          <span>Mon</span>
          <span>Wed</span>
          <span>Fri</span>
        </div>
        <div className="flex" style={{ gap: GAP }}>
          {columns.map((col, w) => (
            <div key={w} className="flex flex-col" style={{ gap: GAP }}>
              {col.map((cell) => (
                <div
                  key={cell.key}
                  title={
                    cell.future
                      ? undefined
                      : `${cell.count} commit${cell.count === 1 ? '' : 's'} on ${new Date(
                          cell.t,
                        ).toLocaleDateString(undefined, { dateStyle: 'medium' })}`
                  }
                  className={
                    'rounded-[2px] ' + (cell.future ? 'bg-transparent' : bucketClass(cell.count))
                  }
                  style={{ width: CELL, height: CELL }}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
      <div
        className="mt-1.5 flex items-center gap-1 text-[10px] text-muted-foreground"
        style={{ paddingLeft: LABEL_W }}
      >
        Less
        {[0, 2, 5, 9, 12].map((n) => (
          <span
            key={n}
            className={'rounded-[2px] ' + bucketClass(n)}
            style={{ width: CELL, height: CELL }}
          />
        ))}
        More
      </div>
    </div>
  )
}
