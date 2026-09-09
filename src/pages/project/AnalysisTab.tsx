import { useEffect, useMemo, useState } from 'react'
import {
  useProjectData,
  asTodos,
  asFeatures,
  asRequests,
  asPeople,
  asPipelines,
  asPlanItems,
  asDetails,
} from '@/store/useProjectData'
import { useProjects } from '@/store/useProjects'
import { useSettings } from '@/store/useSettings'
import { useGithubActivity, mergeCounts } from '@/store/useGithubActivity'
import { supabase } from '@/lib/supabase'
import type { Project } from '@/lib/types'

const DAY_MS = 86_400_000

/** Weekly commit totals for the last `weeks` weeks, from a day → count map. */
function weeklyCommits(days: Record<string, number>, weeks: number): { label: string; count: number }[] {
  const now = new Date()
  const sundayUTC =
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) - now.getUTCDay() * DAY_MS
  const out: { label: string; count: number }[] = []
  for (let w = weeks - 1; w >= 0; w--) {
    const weekStart = sundayUTC - w * 7 * DAY_MS
    let count = 0
    for (let d = 0; d < 7; d++) count += days[new Date(weekStart + d * DAY_MS).toISOString().slice(0, 10)] ?? 0
    out.push({
      label: new Date(weekStart).toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      count,
    })
  }
  return out
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

type Tally = Record<string, number>
type CrossStats = { features: Tally; users: Tally; todos: Tally; plans: Tally; requests: Tally; pipelines: Tally }

interface Row {
  project_id: string
  status?: string
}

function tally(data: Row[] | null, keep: (r: Row) => boolean = () => true): Tally {
  const map: Tally = {}
  for (const r of data ?? []) if (keep(r)) map[r.project_id] = (map[r.project_id] ?? 0) + 1
  return map
}

/** A horizontal bar comparison across every project for one metric, with this
 * project's bar highlighted and its rank shown. */
function ComparisonChart({
  label,
  series,
  currentId,
  format,
}: {
  label: string
  series: { id: string; name: string; value: number }[]
  currentId: string
  format?: (n: number) => string
}) {
  const sorted = series.slice().sort((a, b) => b.value - a.value)
  const max = Math.max(1, ...sorted.map((s) => s.value))
  const rank = sorted.findIndex((s) => s.id === currentId) + 1
  const top = sorted.slice(0, 8)
  const current = sorted.find((s) => s.id === currentId)
  const shown = top.some((s) => s.id === currentId) || !current ? top : [...top.slice(0, 7), current]

  return (
    <div className="space-y-1.5 rounded-md border border-border p-2.5">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
        {rank > 0 && (
          <span className="text-[11px] text-muted-foreground">
            #{rank} of {sorted.length}
          </span>
        )}
      </div>
      <div className="space-y-1">
        {shown.map((s) => {
          const isCurrent = s.id === currentId
          return (
            <div key={s.id} className="flex items-center gap-2 text-xs">
              <span
                className={
                  'w-28 shrink-0 truncate ' +
                  (isCurrent ? 'font-semibold text-foreground' : 'text-muted-foreground')
                }
                title={s.name}
              >
                {s.name}
              </span>
              <div className="h-3 flex-1 overflow-hidden rounded-sm bg-muted">
                <div
                  className={'h-full rounded-sm ' + (isCurrent ? 'bg-primary' : 'bg-primary/25')}
                  style={{ width: `${(s.value / max) * 100}%` }}
                />
              </div>
              <span
                className={
                  'w-10 shrink-0 text-right tabular-nums ' +
                  (isCurrent ? 'font-semibold' : 'text-muted-foreground')
                }
              >
                {format ? format(s.value) : s.value}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function AnalysisTab({ project }: { project: Project }) {
  const rows = useProjectData((s) => s.rows)
  const { projects, loaded: projectsLoaded, load: loadProjects } = useProjects()
  const { loaded: settingsLoaded, load: loadSettings } = useSettings()
  const byRepo = useGithubActivity((s) => s.byRepo)
  const loadGithub = useGithubActivity((s) => s.load)
  const [cross, setCross] = useState<CrossStats | null>(null)

  useEffect(() => {
    if (!projectsLoaded) void loadProjects()
  }, [projectsLoaded, loadProjects])

  useEffect(() => {
    if (!settingsLoaded) void loadSettings()
  }, [settingsLoaded, loadSettings])

  useEffect(() => {
    if (project.github_repo) void loadGithub([project.github_repo])
  }, [project.github_repo, loadGithub])

  const ghState = project.github_repo ? byRepo[project.github_repo] : undefined
  const ghDays = mergeCounts(byRepo, project.github_repo ? [project.github_repo] : [])
  const ghTotal = Object.values(ghDays).reduce((a, b) => a + b, 0)
  const ghTile: string | number = !project.github_repo
    ? '—'
    : ghState === 'error'
      ? '—'
      : ghState === undefined
        ? '…'
        : ghTotal
  const commitWeeks = weeklyCommits(ghDays, 26)
  const commitMax = Math.max(1, ...commitWeeks.map((w) => w.count))

  useEffect(() => {
    let alive = true
    void (async () => {
      const [feat, ppl, todo, plan, req, pipe] = await Promise.all([
        supabase.from('features').select('project_id'),
        supabase.from('project_people').select('project_id'),
        supabase.from('todos').select('project_id, status'),
        supabase.from('plan_items').select('project_id'),
        supabase.from('requests').select('project_id, status'),
        supabase.from('pipelines').select('project_id'),
      ])
      if (!alive) return
      setCross({
        features: tally(feat.data as Row[] | null),
        users: tally(ppl.data as Row[] | null),
        todos: tally(todo.data as Row[] | null, (r) => r.status !== 'completed'),
        plans: tally(plan.data as Row[] | null),
        requests: tally(req.data as Row[] | null, (r) => r.status === 'todo'),
        pipelines: tally(pipe.data as Row[] | null),
      })
    })()
    return () => {
      alive = false
    }
  }, [])

  const stats = useMemo(() => {
    const todos = asTodos(rows.todos)
    const done = todos.filter((t) => t.status === 'completed').length
    const requests = asRequests(rows.requests)
    const pipelines = asPipelines(rows.pipelines)
    const plans = asPlanItems(rows.plan_items)
    return {
      features: asFeatures(rows.features).length,
      todosOpen: todos.length - done,
      todosDone: done,
      completion: todos.length ? Math.round((done / todos.length) * 100) : 0,
      people: asPeople(rows.project_people).length,
      requestsOpen: requests.filter((r) => r.status === 'todo').length,
      requestsDone: requests.filter((r) => r.status === 'completed').length,
      plansOpen: plans.filter((p) => p.status !== 'completed' && p.status !== 'failed').length,
      plansDone: plans.filter((p) => p.status === 'completed').length,
      pipelinesActive: pipelines.filter((p) => p.status === 'active').length,
      pipelinesDone: pipelines.filter((p) => p.status === 'completed').length,
      detailRows: asDetails(rows.details).length,
      hours: project.hours_worked || 0,
    }
  }, [rows, project])

  const tiles: [string, string | number][] = [
    ['Type', cap(project.type)],
    ['Hours worked', stats.hours],
    ['Features complete', stats.features],
    ['To-dos open', stats.todosOpen],
    ['To-dos done', stats.todosDone],
    ['To-do completion', `${stats.completion}%`],
    ['Users', stats.people],
    ['Requests open', stats.requestsOpen],
    ['Plan items open', stats.plansOpen],
    ['Plan items done', stats.plansDone],
    ['Active pipelines', stats.pipelinesActive],
    ['Detail entries', stats.detailRows],
    ['GitHub commits (1y)', ghTile],
  ]

  const chartFor = (
    label: string,
    valueFor: (p: Project) => number,
    format?: (n: number) => string,
  ) => ({
    label,
    format,
    series: projects.map((p) => ({ id: p.id, name: p.name, value: valueFor(p) })),
  })

  const charts = cross
    ? [
        chartFor('Hours worked', (p) => p.hours_worked || 0, (n) => `${n}h`),
        chartFor('Features', (p) => cross.features[p.id] ?? 0),
        chartFor('Users', (p) => cross.users[p.id] ?? 0),
        chartFor('Open to-dos', (p) => cross.todos[p.id] ?? 0),
        chartFor('Plan items', (p) => cross.plans[p.id] ?? 0),
        chartFor('Open requests', (p) => cross.requests[p.id] ?? 0),
      ]
    : []

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Analysis</h2>

        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-md border border-border bg-border sm:grid-cols-3 lg:grid-cols-4">
          {tiles.map(([label, value]) => (
            <div key={label} className="bg-background px-3 py-2">
              <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</div>
              <div className="text-lg font-semibold tabular-nums">{value}</div>
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
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${stats.completion}%` }}
            />
          </div>
        </div>
      </div>

      {project.github_repo && Array.isArray(ghState) && (
        <div className="space-y-1.5">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Commits over time · {project.github_repo}
          </h2>
          <div className="flex items-end gap-0.5 rounded-md border border-border p-2.5" style={{ height: 96 }}>
            {commitWeeks.map((w, i) => (
              <div
                key={i}
                title={`${w.count} commits — week of ${w.label}`}
                className="min-w-0 flex-1 rounded-sm bg-primary/70 transition-all hover:bg-primary"
                style={{ height: `${Math.max(2, (w.count / commitMax) * 100)}%` }}
              />
            ))}
          </div>
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>{commitWeeks[0]?.label}</span>
            <span>26 weeks</span>
            <span>{commitWeeks[commitWeeks.length - 1]?.label}</span>
          </div>
        </div>
      )}

      <div className="space-y-2">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Compared to other projects
        </h2>
        {!cross ? (
          <p className="rounded-md border border-dashed border-border px-3 py-6 text-center text-xs text-muted-foreground">
            Loading cross-project stats…
          </p>
        ) : projects.length < 2 ? (
          <p className="rounded-md border border-dashed border-border px-3 py-6 text-center text-xs text-muted-foreground">
            Add another project to see comparisons.
          </p>
        ) : (
          <div className="grid gap-2 lg:grid-cols-2">
            {charts.map((c) => (
              <ComparisonChart
                key={c.label}
                label={c.label}
                series={c.series}
                currentId={project.id}
                format={c.format}
              />
            ))}
          </div>
        )}
      </div>

      {project.summary && (
        <p className="rounded-md border border-border bg-muted/20 px-3 py-2 text-sm text-muted-foreground">
          {project.summary}
        </p>
      )}
    </div>
  )
}
