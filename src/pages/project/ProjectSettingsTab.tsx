import { useMemo, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { useProjects } from '@/store/useProjects'
import { useProjectData, asPeople } from '@/store/useProjectData'
import { PRIORITIES, type Priority, type Project } from '@/lib/types'
import { ColorDot, Input } from '@/components/ui-lite'

const FALLBACK_PRIORITY_COLOR: Record<Priority, string> = {
  urgent: '#ef4444',
  high: '#f97316',
  medium: '#f59e0b',
  low: '#0ea5e9',
}

export function ProjectSettingsTab({ project }: { project: Project }) {
  const { update } = useProjects()
  const peopleRows = useProjectData((s) => s.rows.project_people)
  const usedPositions = useMemo(
    () => [...new Set(asPeople(peopleRows).map((p) => p.position).filter(Boolean))],
    [peopleRows],
  )
  const [newLabel, setNewLabel] = useState('')

  const positionColors = project.position_colors
  const labels = useMemo(
    () => [...new Set([...Object.keys(positionColors), ...usedPositions])],
    [positionColors, usedPositions],
  )

  const setPositionColor = (label: string, color: string) =>
    update(project.id, { position_colors: { ...positionColors, [label]: color } })

  const removePosition = (label: string) => {
    const next = { ...positionColors }
    delete next[label]
    update(project.id, { position_colors: next })
  }

  const setPriorityColor = (p: Priority, color: string) =>
    update(project.id, { priority_colors: { ...project.priority_colors, [p]: color } })

  return (
    <div className="space-y-4">
      <section className="space-y-2">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Position colors
        </h2>
        <p className="text-xs text-muted-foreground">
          Colors shown on each person's badge in the Users tab.
        </p>
        <div className="divide-y divide-border rounded-md border border-border">
          {labels.map((label) => {
            const color = positionColors[label] ?? '#64748b'
            return (
              <div key={label} className="flex items-center gap-2 px-2 py-1.5">
                <ColorDot color={color} />
                <span className="flex-1 truncate text-sm">{label}</span>
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setPositionColor(label, e.target.value)}
                  className="h-6 w-10 cursor-pointer rounded border border-border bg-transparent"
                />
                <button
                  type="button"
                  onClick={() => removePosition(label)}
                  className="grid size-6 place-items-center rounded text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            )
          })}
          {labels.length === 0 && (
            <p className="px-2 py-4 text-center text-xs text-muted-foreground">
              No positions yet — add one, or set a position on a user first.
            </p>
          )}
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            const l = newLabel.trim()
            if (!l) return
            setPositionColor(l, '#64748b')
            setNewLabel('')
          }}
          className="flex items-center gap-1.5"
        >
          <Input
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            placeholder="New position (e.g. Developer)"
            className="max-w-xs"
          />
          <button className="inline-flex h-7 items-center gap-1 rounded-md border border-border px-2 text-xs hover:bg-muted">
            <Plus className="size-3" /> Add
          </button>
        </form>
      </section>

      <section className="space-y-2">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Priority colors
        </h2>
        <p className="text-xs text-muted-foreground">
          Colors used for priority chips and dropdowns in Requests and To-Do.
        </p>
        <div className="divide-y divide-border rounded-md border border-border">
          {PRIORITIES.map((p) => {
            const color = project.priority_colors[p] ?? FALLBACK_PRIORITY_COLOR[p]
            return (
              <div key={p} className="flex items-center gap-2 px-2 py-1.5">
                <ColorDot color={color} />
                <span className="flex-1 truncate text-sm capitalize">{p}</span>
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setPriorityColor(p, e.target.value)}
                  className="h-6 w-10 cursor-pointer rounded border border-border bg-transparent"
                />
              </div>
            )
          })}
        </div>
      </section>
    </div>
  )
}
