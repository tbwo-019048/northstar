import { useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowTopRightOnSquareIcon } from '@/components/ui/arrow-top-right-on-square'
import { XMarkIcon } from '@/components/ui/x-mark'
import { NorthStarIcon } from '@/components/NorthStarIcon'
import { ProjectLogo } from '@/components/ProjectLogo'
import { Chip } from '@/components/ui-lite'
import { tabsForProject } from '@/lib/projectLayout'
import { STATE_CHIP_CLASS, STATE_TEXT_CLASS, formatState } from '@/lib/projectState'
import { formatProjectType, type Project } from '@/lib/types'
import { cn } from '@/lib/utils'

const WORLD_HEIGHT = 560
const COLUMN_WIDTH = 220
const MIN_RADIAL_SIZE = 360
const MAX_RADIAL_SIZE = 3000
// The visible box never grows past this — a bigger canvas just scrolls
// inside it — so a large project count doesn't turn the page into one
// enormous box.
const VIEWPORT_CAP = 700
// The name + state pinned at the bottom of an expanded column, and how far
// above it the project node sits — small on purpose, so the node and its
// own title read as one connected unit instead of two disconnected pieces.
const EXPANDED_NAME_BLOCK_HEIGHT = 34
const EXPANDED_NODE_LABEL_GAP = 10
const EXPANDED_SPIKE_BUDGET = 380
const SPIKE_JITTER_DEG = 4

// Entrance choreography, played once when each node/edge first mounts (see
// the `initial` props below) — nodes pop in first, then the hub's spokes and
// each project's own tab-spurs sweep in counterclockwise after them.
const NODE_STAGGER_SPAN = 0.25
const NODE_FADE_DURATION = 0.3
const EDGE_SWEEP_DELAY_BASE = 0.45
const EDGE_SWEEP_SPAN = 1.1
const EDGE_FADE_DURATION = 0.5

const degToRad = (d: number) => (d * Math.PI) / 180

type Selected =
  | { kind: 'project'; id: string }
  | { kind: 'tab'; id: string; tabKey: string; tabLabel: string }
  | null

type LabelSide = 'right' | 'left' | 'top' | 'bottom'

/** Which edge of its node a tab's label is flush against — always
 * perpendicular to the spike it's strung along, so the label reads outward
 * away from the node's own chain of siblings instead of running back into
 * the next one. Anchored to the node's *edge* (not its center, like an
 * earlier version did) so the label can never render on top of the circle
 * itself regardless of how wide the text is. */
function labelSideFor(angle: number): LabelSide {
  const c = Math.cos(angle)
  const s = Math.sin(angle)
  if (Math.abs(c) >= Math.abs(s)) return c >= 0 ? 'right' : 'left'
  return s >= 0 ? 'bottom' : 'top'
}

const LABEL_SIDE_CLASS: Record<LabelSide, string> = {
  right: 'left-full top-1/2 ml-1 -translate-y-1/2 text-left',
  left: 'right-full top-1/2 mr-1 -translate-y-1/2 text-right',
  bottom: 'left-1/2 top-full mt-1 -translate-x-1/2 text-center',
  top: 'left-1/2 bottom-full mb-1 -translate-x-1/2 text-center',
}

type PosNode = {
  id: string
  x: number
  y: number
  labelSide: LabelSide
  project: Project
  projectIndex: number
  kind: 'project' | 'tab'
  tabKey?: string
  tabLabel?: string
}

type PosEdge = { id: string; x1: number; y1: number; x2: number; y2: number; project: Project; projectIndex: number }

function useElementWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null)
  const [width, setWidth] = useState(0)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver((entries) => setWidth(entries[0]?.contentRect.width ?? 0))
    ro.observe(el)
    setWidth(el.clientWidth)
    return () => ro.disconnect()
  }, [])
  return [ref, width] as const
}

export function SkillTreeView({
  rows,
  nameFor,
  onOpen,
  onOpenTab,
  logoOverride,
}: {
  rows: Project[]
  nameFor: (p: Project) => string
  onOpen: (id: string) => void
  onOpenTab: (id: string, tabKey: string) => void
  logoOverride?: string
}) {
  const [wrapRef, wrapWidth] = useElementWidth<HTMLDivElement>()
  const [expanded, setExpanded] = useState(false)
  const [selected, setSelected] = useState<Selected>(null)

  const tabsByProject = useMemo(() => new Map(rows.map((p) => [p.id, tabsForProject(p)])), [rows])

  // Node size shrinks as the project count grows so the ring has a fighting
  // chance of fitting everyone without overlapping.
  const NODE_R = Math.max(11, Math.min(20, Math.round(26 - rows.length * 0.16)))
  const TAB_R = Math.max(5, Math.min(11, Math.round(14 - rows.length * 0.11)))
  const spikeBaseRadial = NODE_R + 22
  const spikeBaseExpanded = NODE_R + 18
  const idealSpacing = TAB_R * 2 + 8

  // Overview canvas: a project's tabs are strung outward in a straight
  // "spike" past its own ring position (see the layout loop below), so the
  // canvas has to be big enough for the ring itself *and* the longest spike,
  // otherwise nodes render past its edge. Rather than shrink spacing to fit
  // a fixed box (which is what caused the overlap complaints), the canvas
  // grows to fit the data — the outer wrapper below caps how much of it is
  // visible at once and scrolls the rest.
  const maxSpikeLenRadial = useMemo(() => {
    let max = 0
    for (const p of rows) {
      const count = (tabsByProject.get(p.id) ?? []).length
      if (count > 0) max = Math.max(max, spikeBaseRadial + (count - 1) * idealSpacing)
    }
    return max
  }, [rows, tabsByProject, spikeBaseRadial, idealSpacing])

  // A project's own name label sits centered under its node and is usually
  // far wider than the node circle itself, and its tab-spike's own labels
  // reach sideways too — sizing the ring off the node circle alone is what
  // left neighbouring projects' names and spikes overlapping each other.
  const projectRingRadius = useMemo(() => {
    const totalArc = rows.reduce((sum, p) => {
      const labelWidth = nameFor(p).length * 5.4 + 14
      const spikeReach = TAB_R * 2 + 90
      return sum + Math.max(NODE_R * 2 + 12, labelWidth, spikeReach)
    }, 0)
    return totalArc / (2 * Math.PI)
  }, [rows, nameFor, NODE_R, TAB_R])
  const radialSize = Math.max(
    MIN_RADIAL_SIZE,
    Math.min((projectRingRadius + maxSpikeLenRadial + 30) * 2, MAX_RADIAL_SIZE),
  )

  const worldWidth = expanded ? Math.max(rows.length * COLUMN_WIDTH, wrapWidth || 0) : radialSize
  const worldHeight = expanded ? WORLD_HEIGHT : radialSize
  const cx0 = radialSize / 2
  const cy0 = radialSize / 2
  const hubPos = expanded ? { x: 44, y: 40 } : { x: cx0, y: cy0 }

  const { nodes, edges } = useMemo(() => {
    const n: PosNode[] = []
    const e: PosEdge[] = []
    const angleStep = (Math.PI * 2) / Math.max(rows.length, 1)

    rows.forEach((p, i) => {
      const tabs = tabsByProject.get(p.id) ?? []
      let px: number
      let py: number
      let outward: number

      if (expanded) {
        px = i * COLUMN_WIDTH + COLUMN_WIDTH / 2
        py = WORLD_HEIGHT - EXPANDED_NAME_BLOCK_HEIGHT - EXPANDED_NODE_LABEL_GAP - NODE_R
        outward = -Math.PI / 2
      } else {
        const angle = i * angleStep - Math.PI / 2
        px = cx0 + Math.cos(angle) * projectRingRadius
        py = cy0 + Math.sin(angle) * projectRingRadius
        outward = angle
        e.push({ id: `hub:${p.id}`, x1: hubPos.x, y1: hubPos.y, x2: px, y2: py, project: p, projectIndex: i })
      }

      n.push({ id: p.id, x: px, y: py, labelSide: 'bottom', project: p, projectIndex: i, kind: 'project' })

      // Each tab is strung out further along the project's own outward ray
      // (with a small alternating wiggle so it reads as a cluster of
      // branches, not a single rigid line) instead of fanning wide around
      // it — radius only ever grows, so tabs of the *same* project can never
      // land on top of each other, and because the angle barely changes,
      // neighbouring projects' spikes can't cross into it either.
      const spikeBase = expanded ? spikeBaseExpanded : spikeBaseRadial
      const spacing =
        tabs.length > 0 && expanded
          ? Math.max(TAB_R * 2 + 2, Math.min(idealSpacing, EXPANDED_SPIKE_BUDGET / tabs.length))
          : idealSpacing
      const perp = outward + Math.PI / 2

      tabs.forEach((t, j) => {
        const side = j % 2 === 0 ? 1 : -1
        const angle = outward + side * degToRad(SPIKE_JITTER_DEG)
        const radius = spikeBase + j * spacing
        const tx = px + Math.cos(angle) * radius
        const ty = py + Math.sin(angle) * radius
        n.push({
          id: `${p.id}:${t.key}`,
          x: tx,
          y: ty,
          labelSide: labelSideFor(side > 0 ? perp : perp + Math.PI),
          project: p,
          projectIndex: i,
          kind: 'tab',
          tabKey: t.key,
          tabLabel: t.label,
        })
        e.push({ id: `${p.id}:${t.key}:edge`, x1: px, y1: py, x2: tx, y2: ty, project: p, projectIndex: i })
      })
    })

    return { nodes: n, edges: e }
  }, [
    rows,
    tabsByProject,
    expanded,
    cx0,
    cy0,
    projectRingRadius,
    hubPos.x,
    hubPos.y,
    NODE_R,
    TAB_R,
    spikeBaseRadial,
    spikeBaseExpanded,
    idealSpacing,
  ])

  const popup = useMemo(() => {
    if (!selected) return null
    const node = nodes.find((n) => n.kind === selected.kind && n.id === selected.id)
    return node ? { selected, node } : null
  }, [selected, nodes])

  const spring = { type: 'spring' as const, stiffness: 130, damping: 22 }

  // Counterclockwise progress around the ring: project 0 sits at the top and
  // is revealed *last* so the sweep visibly travels top -> left -> bottom ->
  // right -> back to top, i.e. counterclockwise on screen.
  const ccw = (i: number) => (rows.length <= 1 ? 0 : (rows.length - 1 - i) / rows.length)
  const nodeEntranceDelay = (i: number) => ccw(i) * NODE_STAGGER_SPAN
  const edgeEntranceDelay = (i: number) => (expanded ? 0 : EDGE_SWEEP_DELAY_BASE + ccw(i) * EDGE_SWEEP_SPAN)

  return (
    <div
      ref={wrapRef}
      className={cn(
        'relative w-full overflow-x-auto rounded-md border border-dashed border-border bg-muted/10',
        expanded ? 'overflow-y-hidden' : 'overflow-y-auto',
      )}
      style={{ height: Math.min(worldHeight, VIEWPORT_CAP) }}
      onClick={() => setSelected(null)}
    >
      {rows.length === 0 ? (
        <p className="grid h-full place-items-center text-xs text-muted-foreground">No projects yet.</p>
      ) : (
        <div className={cn('relative', !expanded && 'mx-auto')} style={{ width: worldWidth, height: worldHeight }}>
          {/* edges */}
          {edges.map((edge) => {
            const dx = edge.x2 - edge.x1
            const dy = edge.y2 - edge.y1
            const len = Math.hypot(dx, dy)
            const rot = (Math.atan2(dy, dx) * 180) / Math.PI
            const delay = edgeEntranceDelay(edge.projectIndex)
            return (
              <motion.div
                key={edge.id}
                initial={{ x: edge.x1, y: edge.y1, width: len, rotate: rot, opacity: 0, scaleX: 0 }}
                animate={{ x: edge.x1, y: edge.y1, width: len, rotate: rot, opacity: 0.3, scaleX: 1 }}
                transition={{
                  x: spring,
                  y: spring,
                  width: spring,
                  rotate: spring,
                  opacity: { duration: EDGE_FADE_DURATION, delay },
                  scaleX: { duration: EDGE_FADE_DURATION, delay },
                }}
                className={cn('absolute left-0 top-0 h-px origin-left', STATE_TEXT_CLASS[edge.project.state])}
                style={{ backgroundColor: 'currentColor' }}
              />
            )
          })}

          {/* hub — a fixed 48px (size-12) box positioned by transform (x/y/scale
              all motion-driven, composed into one transform with no class-based
              transform to fight over); the label is a child with its own,
              separately-owned local transform, so it centers correctly under
              the box regardless of the parent's animated transform. */}
          <motion.button
            type="button"
            initial={false}
            animate={{ x: hubPos.x - 24, y: hubPos.y - 24, scale: expanded ? 0.7 : 1 }}
            transition={spring}
            onClick={(e) => {
              e.stopPropagation()
              setExpanded((v) => !v)
              setSelected(null)
            }}
            title={expanded ? 'Back to overview' : 'Expand into skill trees'}
            className="absolute left-0 top-0 z-20 size-12"
          >
            <span className="grid size-full place-items-center rounded-full border border-border bg-background shadow-sm">
              <NorthStarIcon className="size-7" />
            </span>
            {!expanded && (
              <span className="pointer-events-none absolute left-1/2 top-full mt-1 -translate-x-1/2 whitespace-nowrap text-[10px] font-semibold tracking-wide text-muted-foreground">
                NORTH STAR
              </span>
            )}
          </motion.button>

          {/* nodes — same fixed-box-plus-independent-label shape as the hub,
              and positioned via transform (x/y) rather than left/top so the
              browser can move hundreds of these on the GPU instead of
              reflowing layout for each one every frame. */}
          {nodes.map((node) => {
            const isProject = node.kind === 'project'
            const r = isProject ? NODE_R : TAB_R
            const stateClass = STATE_TEXT_CLASS[node.project.state]
            const isSelected =
              selected != null &&
              ((selected.kind === 'project' && isProject && selected.id === node.id) ||
                (selected.kind === 'tab' && !isProject && selected.id === node.id))
            const delay = nodeEntranceDelay(node.projectIndex)
            return (
              <motion.button
                key={node.id}
                type="button"
                initial={{ x: node.x - r, y: node.y - r, opacity: 0, scale: 0.3 }}
                animate={{ x: node.x - r, y: node.y - r, opacity: 1, scale: 1 }}
                transition={{
                  x: spring,
                  y: spring,
                  opacity: { duration: NODE_FADE_DURATION, delay },
                  scale: { duration: NODE_FADE_DURATION, delay },
                }}
                onClick={(e) => {
                  e.stopPropagation()
                  setSelected(
                    isProject
                      ? { kind: 'project', id: node.id }
                      : { kind: 'tab', id: node.id, tabKey: node.tabKey!, tabLabel: node.tabLabel! },
                  )
                }}
                className="absolute left-0 top-0 z-10"
                style={{ width: r * 2, height: r * 2 }}
              >
                {isProject ? (
                  <span
                    className={cn(
                      'grid size-full place-items-center overflow-hidden rounded-full border-2 bg-background shadow-sm transition-transform hover:scale-110 border-current',
                      stateClass,
                      isSelected && 'ring-2 ring-offset-2 ring-offset-background ring-current',
                    )}
                  >
                    <ProjectLogo project={node.project} size="fill" overrideUrl={logoOverride} />
                  </span>
                ) : (
                  <span
                    className={cn(
                      'block size-full rounded-full border-2 bg-background/90 shadow-sm transition-transform hover:scale-125 border-current',
                      stateClass,
                      isSelected && 'ring-2 ring-offset-2 ring-offset-background ring-current',
                    )}
                  />
                )}
                {isProject ? (
                  !expanded && (
                    <span className="pointer-events-none absolute left-1/2 top-full mt-1 max-w-24 -translate-x-1/2 truncate text-[10px] leading-none text-foreground/80">
                      {nameFor(node.project)}
                    </span>
                  )
                ) : (
                  <span
                    className={cn(
                      'pointer-events-none absolute max-w-16 truncate text-[10px] leading-none text-muted-foreground',
                      LABEL_SIDE_CLASS[node.labelSide],
                    )}
                  >
                    {node.tabLabel}
                  </span>
                )}
              </motion.button>
            )
          })}

          {expanded &&
            rows.map((p, i) => (
              <div
                key={`name:${p.id}`}
                className="absolute flex -translate-x-1/2 flex-col items-center gap-0.5 text-center"
                style={{ left: i * COLUMN_WIDTH + COLUMN_WIDTH / 2, top: WORLD_HEIGHT - EXPANDED_NAME_BLOCK_HEIGHT }}
              >
                <span className="text-xs font-semibold">{nameFor(p)}</span>
                <Chip className={STATE_CHIP_CLASS[p.state] ?? ''}>{formatState(p.state)}</Chip>
              </div>
            ))}

          {popup && (
            <div
              onClick={(e) => e.stopPropagation()}
              className="absolute z-30 w-56 rounded-md border border-border bg-popover p-2.5 text-xs shadow-lg"
              style={{
                left: Math.min(Math.max(popup.node.x, 112), worldWidth - 112),
                top: Math.min(popup.node.y + 32, worldHeight - 140),
              }}
            >
              <div className="mb-1.5 flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-semibold">
                    {popup.selected.kind === 'project' ? nameFor(popup.node.project) : popup.selected.tabLabel}
                  </p>
                  {popup.selected.kind === 'tab' && (
                    <p className="truncate text-[10px] text-muted-foreground">
                      Part of {nameFor(popup.node.project)}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setSelected(null)}
                  className="shrink-0 text-muted-foreground hover:text-foreground"
                >
                  <XMarkIcon size={13} />
                </button>
              </div>

              {popup.selected.kind === 'project' && (
                <div className="mb-1.5 flex flex-wrap gap-1">
                  <Chip className={STATE_CHIP_CLASS[popup.node.project.state] ?? ''}>
                    {formatState(popup.node.project.state)}
                  </Chip>
                  <Chip className="bg-muted text-muted-foreground">{formatProjectType(popup.node.project.type)}</Chip>
                </div>
              )}

              {popup.selected.kind === 'project' && popup.node.project.summary && (
                <p className="mb-2 line-clamp-3 text-muted-foreground">{popup.node.project.summary}</p>
              )}

              <button
                type="button"
                onClick={() =>
                  popup.selected.kind === 'project'
                    ? onOpen(popup.node.project.id)
                    : onOpenTab(popup.node.project.id, popup.selected.tabKey)
                }
                className="flex w-full items-center justify-center gap-1 rounded-md bg-primary px-2 py-1 text-primary-foreground hover:bg-primary/90"
              >
                View <ArrowTopRightOnSquareIcon size={12} />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
