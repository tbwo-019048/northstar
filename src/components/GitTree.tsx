import type { GithubCommit } from '@/lib/github'

const ROW_H = 26
const LANE_W = 16
const PAD_X = 10
const PAD_Y = 13
const DOT_R = 4

// Branded palette — NorthStar blue leads, then a small spread of cohesive
// hues so parallel branches stay distinguishable.
const LANE_COLORS = ['#007acc', '#4aacff', '#22d3ee', '#0ea5e9', '#6366f1', '#14b8a6', '#38bdf8', '#0369a1']

interface Row {
  lane: number
  parentsOpened: number[]
  convergedFrom: number[]
}

function layout(commits: GithubCommit[]) {
  const active: (string | null)[] = []
  const rows: Row[] = []
  const activeAfter: (string | null)[][] = []

  const findLane = (sha: string) => active.findIndex((w) => w === sha)
  const freeLane = () => {
    const idx = active.findIndex((w) => w === null)
    if (idx >= 0) return idx
    active.push(null)
    return active.length - 1
  }

  for (const c of commits) {
    let lane = findLane(c.sha)
    if (lane === -1) lane = freeLane()

    const convergedFrom: number[] = []
    for (let l = 0; l < active.length; l++) {
      if (l !== lane && active[l] === c.sha) {
        active[l] = null
        convergedFrom.push(l)
      }
    }

    active[lane] = c.parents[0] ?? null

    const parentsOpened: number[] = []
    for (let p = 1; p < c.parents.length; p++) {
      const l = freeLane()
      active[l] = c.parents[p]
      parentsOpened.push(l)
    }

    rows.push({ lane, parentsOpened, convergedFrom })
    activeAfter.push([...active])
  }

  return { rows, activeAfter, laneCount: Math.max(1, active.length) }
}

/** A compact branch/merge graph, branded blue, for the most recent commits
 * on the selected ref. The full commit list still renders as a table below
 * this — the tree is a visual summary, not a row-for-row replacement. */
export function GitTree({ commits }: { commits: GithubCommit[] }) {
  if (commits.length === 0) return null
  const { rows, activeAfter, laneCount } = layout(commits)

  const x = (lane: number) => PAD_X + lane * LANE_W
  const y = (row: number) => PAD_Y + row * ROW_H
  const color = (lane: number) => LANE_COLORS[lane % LANE_COLORS.length]

  const width = PAD_X * 2 + Math.max(1, laneCount - 1) * LANE_W + DOT_R * 2
  const height = PAD_Y * 2 + Math.max(0, commits.length - 1) * ROW_H

  const segments: { d: string; color: string; key: string }[] = []

  rows.forEach((r, i) => {
    // Straight/diagonal segments connecting row i-1 to row i.
    if (i > 0) {
      const prevActive = activeAfter[i - 1]
      for (let l = 0; l < prevActive.length; l++) {
        if (r.convergedFrom.includes(l)) {
          segments.push({
            key: `conv-${i}-${l}`,
            color: color(l),
            d: `M ${x(l)} ${y(i - 1)} C ${x(l)} ${y(i)}, ${x(r.lane)} ${y(i - 1)}, ${x(r.lane)} ${y(i)}`,
          })
        } else if (prevActive[l] !== null) {
          segments.push({ key: `line-${i}-${l}`, color: color(l), d: `M ${x(l)} ${y(i - 1)} L ${x(l)} ${y(i)}` })
        }
      }
    }
    // Merge parents opening a new lane for the next row.
    if (i < rows.length - 1) {
      r.parentsOpened.forEach((l) => {
        segments.push({
          key: `open-${i}-${l}`,
          color: color(l),
          d: `M ${x(r.lane)} ${y(i)} C ${x(r.lane)} ${y(i + 1)}, ${x(l)} ${y(i)}, ${x(l)} ${y(i + 1)}`,
        })
      })
    }
  })

  return (
    <div className="overflow-x-auto rounded-md border border-border bg-muted/20 p-2">
      <svg width={width} height={height} className="block" role="img" aria-label="Commit graph">
        {segments.map((s) => (
          <path key={s.key} d={s.d} fill="none" stroke={s.color} strokeWidth={1.75} strokeLinecap="round" />
        ))}
        {rows.map((r, i) => (
          <circle
            key={commits[i].sha}
            cx={x(r.lane)}
            cy={y(i)}
            r={DOT_R}
            fill={color(r.lane)}
            stroke="var(--panel)"
            strokeWidth={1.5}
          >
            <title>
              {commits[i].sha.slice(0, 7)} — {commits[i].message}
            </title>
          </circle>
        ))}
      </svg>
    </div>
  )
}
