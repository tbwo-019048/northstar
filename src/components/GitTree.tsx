import type { GithubCommit } from '@/lib/github'

export const GRAPH_ROW_H = 28
const LANE_W = 16
const PAD_X = 10
const DOT_R = 4

// Branded palette — NorthStar blue leads, then a small spread of cohesive
// hues so parallel branches stay distinguishable.
const LANE_COLORS = ['#007acc', '#4aacff', '#22d3ee', '#0ea5e9', '#6366f1', '#14b8a6', '#38bdf8', '#0369a1']

interface Row {
  lane: number
  parentsOpened: number[]
  convergedFrom: number[]
}

export interface GitGraph {
  rows: Row[]
  laneCount: number
  width: number
  segments: { d: string; color: string; key: string }[]
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

const laneColor = (lane: number) => LANE_COLORS[lane % LANE_COLORS.length]
const laneX = (lane: number) => PAD_X + lane * LANE_W

/**
 * Computes the full branch/merge graph for a commit list (newest first, as
 * GitHub returns them), in the same coordinate space `GitGraphRow` renders
 * one row of at a time — row `i` spans y = [i*GRAPH_ROW_H, (i+1)*GRAPH_ROW_H].
 */
export function computeGitGraph(commits: GithubCommit[]): GitGraph {
  const { rows, activeAfter, laneCount } = layout(commits)
  const y = (row: number) => row * GRAPH_ROW_H + GRAPH_ROW_H / 2
  const segments: GitGraph['segments'] = []

  rows.forEach((r, i) => {
    if (i > 0) {
      const prevActive = activeAfter[i - 1]
      for (let l = 0; l < prevActive.length; l++) {
        if (r.convergedFrom.includes(l)) {
          segments.push({
            key: `conv-${i}-${l}`,
            color: laneColor(l),
            d: `M ${laneX(l)} ${y(i - 1)} C ${laneX(l)} ${y(i)}, ${laneX(r.lane)} ${y(i - 1)}, ${laneX(r.lane)} ${y(i)}`,
          })
        } else if (prevActive[l] !== null) {
          segments.push({
            key: `line-${i}-${l}`,
            color: laneColor(l),
            d: `M ${laneX(l)} ${y(i - 1)} L ${laneX(l)} ${y(i)}`,
          })
        }
      }
    }
    if (i < rows.length - 1) {
      r.parentsOpened.forEach((l) => {
        segments.push({
          key: `open-${i}-${l}`,
          color: laneColor(l),
          d: `M ${laneX(r.lane)} ${y(i)} C ${laneX(r.lane)} ${y(i + 1)}, ${laneX(l)} ${y(i)}, ${laneX(l)} ${y(i + 1)}`,
        })
      })
    }
  })

  const width = PAD_X * 2 + Math.max(1, laneCount - 1) * LANE_W + DOT_R * 2
  return { rows, laneCount, width, segments }
}

/** One row's slice of the graph — a small SVG viewport clipped to this row's
 * band, sharing the parent graph's absolute coordinate space so lines drawn
 * by neighbouring rows still line up pixel-for-pixel. Meant to sit as the
 * leading cell of a commit list row, GitHub-Desktop / `git log --graph` style. */
export function GitGraphRow({ graph, index }: { graph: GitGraph; index: number }) {
  const row = graph.rows[index]
  if (!row) return null
  const top = index * GRAPH_ROW_H
  const cy = top + GRAPH_ROW_H / 2
  return (
    <svg
      width={graph.width}
      height={GRAPH_ROW_H}
      viewBox={`0 ${top} ${graph.width} ${GRAPH_ROW_H}`}
      className="block shrink-0"
    >
      {graph.segments.map((s) => (
        <path key={s.key} d={s.d} fill="none" stroke={s.color} strokeWidth={1.75} strokeLinecap="round" />
      ))}
      <circle
        cx={laneX(row.lane)}
        cy={cy}
        r={DOT_R}
        fill={laneColor(row.lane)}
        stroke="var(--panel)"
        strokeWidth={1.5}
      />
    </svg>
  )
}
