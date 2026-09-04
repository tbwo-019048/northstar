import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { AlertTriangle, ArrowRight, ExternalLink, ImageDown, Link2, Pencil } from 'lucide-react'
import { useProjectData, asTodos, asFeatures, asRequests, asPeople, asPipelines } from '@/store/useProjectData'
import { useProjects } from '@/store/useProjects'
import { Chip, Input } from '@/components/ui-lite'
import { resolveFaviconUrl } from '@/lib/favicon'
import type { Project } from '@/lib/types'

export function SummaryTab({ project }: { project: Project }) {
  const rows = useProjectData((s) => s.rows)
  const { update } = useProjects()
  const nav = useNavigate()
  const { id } = useParams()
  const [editingSite, setEditingSite] = useState(false)
  const [siteDraft, setSiteDraft] = useState(project.website_url ?? '')
  const [siteError, setSiteError] = useState<string | null>(null)
  const [faviconBusy, setFaviconBusy] = useState(false)

  const saveSite = async (e: React.FormEvent) => {
    e.preventDefault()
    setSiteError(null)
    const { error } = await update(project.id, { website_url: siteDraft.trim() || null })
    if (error) {
      setSiteError(error)
      return
    }
    setEditingSite(false)
  }

  const useFavicon = async () => {
    if (!project.website_url) return
    setSiteError(null)
    setFaviconBusy(true)
    const url = await resolveFaviconUrl(project.website_url)
    setFaviconBusy(false)
    if (!url) {
      setSiteError(
        "Couldn't load a favicon from that site — it may require sign-in (e.g. a protected " +
          "Vercel preview) or not serve one at /favicon.ico. Try the production URL, or upload " +
          "a logo directly on the project header instead.",
      )
      return
    }
    const { error } = await update(project.id, { logo_url: url })
    if (error) setSiteError(error)
  }

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
      {editingSite || !project.website_url ? (
        <div className="space-y-1">
          <form onSubmit={saveSite} className="flex items-center gap-1.5">
            <Link2 className="size-3.5 shrink-0 text-muted-foreground" />
            <Input
              autoFocus={editingSite}
              value={siteDraft}
              onChange={(e) => setSiteDraft(e.target.value)}
              placeholder="Live site URL (e.g. https://example.com)"
              className="max-w-sm"
            />
            <button className="h-7 shrink-0 rounded-md bg-primary px-2.5 text-xs font-medium text-primary-foreground hover:bg-primary/90">
              Save
            </button>
            {editingSite && (
              <button
                type="button"
                onClick={() => {
                  setEditingSite(false)
                  setSiteError(null)
                }}
                className="h-7 shrink-0 rounded-md px-2 text-xs text-muted-foreground hover:bg-muted"
              >
                Cancel
              </button>
            )}
          </form>
          {siteError && (
            <p className="flex items-center gap-1 text-xs text-destructive">
              <AlertTriangle className="size-3 shrink-0" /> {siteError}
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-sm">
            <Link2 className="size-3.5 shrink-0 text-muted-foreground" />
            <span className="text-muted-foreground">Live Site:</span>
            <a
              href={project.website_url}
              target="_blank"
              rel="noreferrer"
              className="min-w-0 truncate text-link underline"
            >
              {project.website_url}
            </a>
            <ExternalLink className="size-3 shrink-0 text-muted-foreground" />
            <button
              type="button"
              onClick={() => {
                setSiteDraft(project.website_url ?? '')
                setSiteError(null)
                setEditingSite(true)
              }}
              className="ml-1 shrink-0 text-muted-foreground hover:text-foreground"
            >
              <Pencil className="size-3" />
            </button>
            <button
              type="button"
              onClick={useFavicon}
              disabled={faviconBusy}
              title="Use this site's favicon as the project logo"
              className="ml-1 inline-flex shrink-0 items-center gap-1 rounded-md border border-border px-1.5 py-0.5 text-[11px] text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50"
            >
              <ImageDown className="size-3" /> {faviconBusy ? 'Checking…' : 'Use as logo'}
            </button>
          </div>
          {siteError && (
            <p className="flex items-center gap-1 text-xs text-destructive">
              <AlertTriangle className="size-3 shrink-0" /> {siteError}
            </p>
          )}
        </div>
      )}

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
