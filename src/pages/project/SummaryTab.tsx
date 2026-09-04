import { useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { useProjectData, asTodos, asFeatures, asRequests, asPeople, asPipelines } from '@/store/useProjectData'
import { Chip } from '@/components/ui-lite'
import type { Project } from '@/lib/types'

export function SummaryTab({ project }: { project: Project }) {
  const rows = useProjectData((s) => s.rows)
  const nav = useNavigate()
  const { id } = useParams()

  const stats = useMemo(() => {
    const todos = asTodos(rows.todos)
    const openTodos = todos.filter((t) => t.status === 'todo')
    const requests = asRequests(rows.requests)
    return {
      features: asFeatures(rows.features).length,
      openTodos: openTodos.length,
      openRequests: requests.filter((r) => r.status === 'todo').length,
      users: asPeople(rows.project_people).length,
      activePipelines: asPipelines(rows.pipelines).filter((p) => p.status === 'active').length,
      topTodos: openTodos
        .slice()
        .sort((a, b) => PRIORITY_RANK[b.priority] - PRIORITY_RANK[a.priority])
        .slice(0, 5),
    }
  }, [rows])

  const tiles: [string, number, string][] = [
    ['Features', stats.features, 'features'],
    ['Open to-dos', stats.openTodos, 'todo'],
    ['Open requests', stats.openRequests, 'requests'],
    ['Users', stats.users, 'users'],
    ['Active pipelines', stats.activePipelines, 'pipeline'],
  ]

  return (
    <div className="space-y-4">
      {project.summary && (
        <p className="rounded-md border border-border bg-muted/20 px-3 py-2 text-sm text-muted-foreground">
          {project.summary}
        </p>
      )}

      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-md border border-border bg-border sm:grid-cols-3 lg:grid-cols-5">
        {tiles.map(([label, value, tab]) => (
          <button
            key={label}
            type="button"
            onClick={() => nav(`/app/project/${id}/${tab}`)}
            className="bg-background px-3 py-2 text-left hover:bg-muted/40"
          >
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
            <div className="text-lg font-semibold tabular-nums">{value}</div>
          </button>
        ))}
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Top priority to-dos
          </h2>
          <button
            type="button"
            onClick={() => nav(`/app/project/${id}/todo`)}
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            View all <ArrowRight className="size-3" />
          </button>
        </div>
        <div className="divide-y divide-border rounded-md border border-border">
          {stats.topTodos.map((t) => (
            <div key={t.id} className="flex items-center gap-2 px-2 py-1.5 text-sm">
              <Chip tone="priority">{t.priority}</Chip>
              <span className="min-w-0 flex-1 truncate">{t.title}</span>
            </div>
          ))}
          {stats.topTodos.length === 0 && (
            <p className="px-2 py-6 text-center text-xs text-muted-foreground">
              Nothing open — the To-Do list is clear.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

const PRIORITY_RANK: Record<string, number> = { urgent: 3, high: 2, medium: 1, low: 0 }
