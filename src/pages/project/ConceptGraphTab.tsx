import { useRef, useState } from 'react'
import { Plus, Waypoints, X } from 'lucide-react'
import { EditableText, IconButton } from '@/components/ui-lite'
import { cn } from '@/lib/utils'
import { useProjectData, asConceptNodes, asConceptEdges } from '@/store/useProjectData'
import type { ConceptNode } from '@/lib/types'

const CLAMP = (n: number) => Math.min(98, Math.max(2, n))

/** A free-form mind-map: the user manually adds/labels/drags nodes and draws
 * connections between them. Nothing here is auto-generated from project data. */
export function ConceptGraphTab({ projectId }: { projectId: string }) {
  const rows = useProjectData((s) => s.rows)
  const { add, patch, del } = useProjectData()
  const nodes = asConceptNodes(rows.concept_nodes)
  const edges = asConceptEdges(rows.concept_edges)
  const containerRef = useRef<HTMLDivElement>(null)
  const [connecting, setConnecting] = useState(false)
  const [connectFrom, setConnectFrom] = useState<string | null>(null)
  const [drag, setDrag] = useState<{ id: string; x: number; y: number } | null>(null)
  const dragOriginRef = useRef<{ id: string; startX: number; startY: number; x: number; y: number } | null>(null)

  const addNode = () => {
    // Stagger new nodes diagonally so they don't stack exactly on top of each
    // other; the user drags them wherever they actually want.
    const offset = (nodes.length % 6) * 8
    void add('concept_nodes', {
      project_id: projectId,
      label: 'New idea',
      x: CLAMP(30 + offset),
      y: CLAMP(30 + offset),
      sort: nodes.length,
    })
  }

  const toggleConnecting = () => {
    setConnecting((c) => !c)
    setConnectFrom(null)
  }

  const handleNodeMouseDown = (node: ConceptNode) => (e: React.PointerEvent) => {
    if (connecting) return
    e.stopPropagation()
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return
    dragOriginRef.current = { id: node.id, startX: e.clientX, startY: e.clientY, x: node.x, y: node.y }
    setDrag({ id: node.id, x: node.x, y: node.y })
    const onMove = (move: PointerEvent) => {
      const origin = dragOriginRef.current
      if (!origin) return
      const dx = ((move.clientX - origin.startX) / rect.width) * 100
      const dy = ((move.clientY - origin.startY) / rect.height) * 100
      setDrag({ id: origin.id, x: CLAMP(origin.x + dx), y: CLAMP(origin.y + dy) })
    }
    const onUp = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      setDrag((current) => {
        if (current) void patch('concept_nodes', node.id, { x: current.x, y: current.y })
        return null
      })
      dragOriginRef.current = null
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  const positionOf = (node: ConceptNode) => (drag?.id === node.id ? drag : node)

  const handleNodeClick = (node: ConceptNode) => {
    if (!connecting) return
    if (!connectFrom) {
      setConnectFrom(node.id)
      return
    }
    if (connectFrom === node.id) {
      setConnectFrom(null)
      return
    }
    void add('concept_edges', { project_id: projectId, from_node_id: connectFrom, to_node_id: node.id, sort: edges.length })
    setConnectFrom(null)
    setConnecting(false)
  }

  const nodeById = new Map(nodes.map((n) => [n.id, n]))

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={addNode}
          className="flex items-center gap-1.5 rounded-md border border-border bg-muted/40 px-2 py-1 text-xs font-medium hover:bg-muted"
        >
          <Plus size={14} /> Add idea
        </button>
        <button
          type="button"
          onClick={toggleConnecting}
          className={cn(
            'flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-medium transition-colors',
            connecting
              ? 'border-primary bg-primary/10 text-primary'
              : 'border-border bg-muted/40 hover:bg-muted',
          )}
        >
          <Waypoints size={14} /> {connecting ? (connectFrom ? 'Pick target…' : 'Pick source…') : 'Connect'}
        </button>
        {edges.length > 0 && <span className="text-xs text-muted-foreground">Click a line to remove it.</span>}
      </div>

      <div
        ref={containerRef}
        className="relative min-h-[420px] flex-1 rounded-md border border-dashed border-border bg-muted/20"
      >
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 size-full">
          {edges.map((edge) => {
            const fromNode = nodeById.get(edge.from_node_id)
            const toNode = nodeById.get(edge.to_node_id)
            if (!fromNode || !toNode) return null
            const from = positionOf(fromNode)
            const to = positionOf(toNode)
            return (
              <g key={edge.id} className="pointer-events-auto cursor-pointer" onClick={() => void del('concept_edges', edge.id)}>
                <line x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke="transparent" strokeWidth={3} vectorEffect="non-scaling-stroke" />
                <line
                  x1={from.x}
                  y1={from.y}
                  x2={to.x}
                  y2={to.y}
                  className="stroke-muted-foreground/50 hover:stroke-destructive"
                  strokeWidth={1}
                  vectorEffect="non-scaling-stroke"
                />
              </g>
            )
          })}
        </svg>

        {nodes.length === 0 && (
          <div className="grid h-full place-items-center text-sm text-muted-foreground">
            Add an idea to start mapping this project out.
          </div>
        )}

        {nodes.map((node) => (
          <div
            key={node.id}
            onPointerDown={handleNodeMouseDown(node)}
            onClick={() => handleNodeClick(node)}
            style={{
              left: `${positionOf(node).x}%`,
              top: `${positionOf(node).y}%`,
              transform: 'translate(-50%, -50%)',
            }}
            className={cn(
              'group absolute z-10 flex max-w-56 cursor-grab items-center gap-1 rounded-full border bg-background px-3 py-1.5 shadow-sm active:cursor-grabbing',
              drag?.id === node.id && 'shadow-md',
              connecting && connectFrom === node.id
                ? 'border-primary ring-2 ring-primary/30'
                : connecting
                  ? 'border-primary/40 hover:border-primary'
                  : 'border-border',
            )}
          >
            <EditableText
              value={node.label}
              onSave={(label) => void patch('concept_nodes', node.id, { label })}
              className="w-auto min-w-8 truncate px-0 text-xs font-medium"
            />
            <IconButton
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation()
                void del('concept_nodes', node.id)
              }}
              aria-label="Delete idea"
              className="size-4 shrink-0 opacity-0 group-hover:opacity-100"
            >
              <X size={11} />
            </IconButton>
          </div>
        ))}
      </div>
    </div>
  )
}
