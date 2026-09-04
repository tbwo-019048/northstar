import { useMemo } from 'react'
import { useProjectData, asTodos, asFeatures, asRequests, asPeople, asPipelines, asDetails } from '@/store/useProjectData'
import type { Project } from '@/lib/types'

export function AnalysisTab({ project }: { project: Project }) {
  const rows = useProjectData((s) => s.rows)

  const stats = useMemo(() => {
    const todos = asTodos(rows.todos)
    const done = todos.filter((t) => t.status === 'completed').length
    const open = todos.length - done
    const requests = asRequests(rows.requests)
    const pipelines = asPipelines(rows.pipelines)
    return {
      features: asFeatures(rows.features).length,
      todosOpen: open,
      todosDone: done,
      completion: todos.length ? Math.round((done / todos.length) * 100) : 0,
      people: asPeople(rows.project_people).length,
      requestsOpen: requests.filter((r) => r.status === 'todo').length,
      requestsDone: requests.filter((r) => r.status === 'completed').length,
      pipelinesActive: pipelines.filter((p) => p.status === 'active').length,
      pipelinesDone: pipelines.filter((p) => p.status === 'completed').length,
      detailRows: asDetails(rows.details).length,
      hours: project.hours_worked || 0,
    }
  }, [rows, project])

  const tiles: [string, string | number, string?][] = [
    ['Type', project.type],
    ['Hours worked', stats.hours],
    ['Features complete', stats.features],
    ['To-dos open', stats.todosOpen],
    ['To-dos done', stats.todosDone],
    ['To-do completion', `${stats.completion}%`],
    ['Users', stats.people],
    ['Requests open', stats.requestsOpen],
    ['Requests fulfilled', stats.requestsDone],
    ['Active pipelines', stats.pipelinesActive],
    ['Completed pipelines', stats.pipelinesDone],
    ['Detail entries', stats.detailRows],
  ]

  return (
    <div className="space-y-3">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Analysis
      </h2>

      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-md border border-border bg-border sm:grid-cols-3 lg:grid-cols-4">
        {tiles.map(([label, value]) => (
          <div key={label} className="bg-background px-3 py-2">
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
            <div className="text-lg font-semibold tabular-nums capitalize">{value}</div>
          </div>
        ))}
      </div>

      <div className="space-y-1">
        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
          <span>To-do progress</span>
          <span>
            {stats.todosDone}/{stats.todosDone + stats.todosOpen}
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${stats.completion}%` }} />
        </div>
      </div>

      {project.summary && (
        <p className="rounded-md border border-border bg-muted/20 px-3 py-2 text-sm text-muted-foreground">
          {project.summary}
        </p>
      )}
    </div>
  )
}
