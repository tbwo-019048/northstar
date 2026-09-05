import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ExclamationTriangleIcon } from '@/components/ui/exclamation-triangle'
import { ArrowRightIcon } from '@/components/ui/arrow-right'
import { ArrowTopRightOnSquareIcon } from '@/components/ui/arrow-top-right-on-square'
import { PhotoIcon } from '@/components/ui/photo'
import { LinkIcon } from '@/components/ui/link'
import { PencilIcon } from '@/components/ui/pencil'
import { PlusIcon } from '@/components/ui/plus'
import { XMarkIcon } from '@/components/ui/x-mark'
import { useProjectData, asTodos, asFeatures, asRequests, asPeople, asPipelines } from '@/store/useProjectData'
import { useProjects } from '@/store/useProjects'
import { useClients } from '@/store/useClients'
import { Chip, Input } from '@/components/ui-lite'
import { resolveFaviconUrl } from '@/lib/favicon'
import { ScreenshotGallery } from '@/components/ScreenshotGallery'
import { HalfCircleProgress, statePercent } from '@/components/HalfCircleProgress'
import { STATE_TEXT_CLASS, formatState } from '@/lib/projectState'
import { SITE_TYPES, type Project } from '@/lib/types'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/velobits/dialog'

type SiteField = 'website_url' | 'test_site_url'

export function SummaryTab({ project }: { project: Project }) {
  const rows = useProjectData((s) => s.rows)
  const nav = useNavigate()
  const { id } = useParams()
  const hasSites = SITE_TYPES.includes(project.type)

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
      {hasSites && (
        <div className="space-y-2">
          <SiteLinkRow project={project} field="website_url" label="Live Site" />
          <SiteLinkRow project={project} field="test_site_url" label="Test Site" />
        </div>
      )}

      <div className="flex items-center gap-3">
        {hasSites && (
          <div className="min-w-0 flex-[7]">
            <ScreenshotGallery project={project} />
          </div>
        )}
        <div
          className={
            'flex flex-1 items-center justify-center ' +
            (hasSites ? 'flex-[3]' : '') +
            ' ' +
            (STATE_TEXT_CLASS[project.state] ?? '')
          }
        >
          <HalfCircleProgress
            value={statePercent(project.state)}
            label={formatState(project.state)}
            color="currentColor"
            size="lg"
          />
        </div>
      </div>

      {project.summary && (
        <p className="rounded-md border border-border bg-muted/20 px-3 py-2 text-sm text-muted-foreground">
          {project.summary}
        </p>
      )}

      <ClientsSection projectId={project.id} />

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
            View all <ArrowRightIcon size={12} />
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

/** One editable "Live Site" / "Test Site" row: shows the link once set (with
 * a favicon-as-logo shortcut), or an inline form to set/change it. */
function SiteLinkRow({
  project,
  field,
  label,
}: {
  project: Project
  field: SiteField
  label: string
}) {
  const { update } = useProjects()
  const value = project[field]
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value ?? '')
  const [error, setError] = useState<string | null>(null)
  const [faviconBusy, setFaviconBusy] = useState(false)

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    const { error: err } = await update(project.id, { [field]: draft.trim() || null })
    if (err) {
      setError(err)
      return
    }
    setEditing(false)
  }

  const useFavicon = async () => {
    if (!value) return
    setError(null)
    setFaviconBusy(true)
    const url = await resolveFaviconUrl(value)
    setFaviconBusy(false)
    if (!url) {
      setError(
        "Couldn't load a favicon from that site — it may require sign-in (e.g. a protected " +
          'Vercel preview) or not serve one at a common path. Try the production URL, or upload ' +
          'a logo directly on the project header instead.',
      )
      return
    }
    const { error: err } = await update(project.id, { logo_url: url })
    if (err) setError(err)
  }

  if (editing || !value) {
    return (
      <div className="space-y-1">
        <form onSubmit={save} className="flex items-center gap-1.5">
          <LinkIcon size={14} className="shrink-0 text-muted-foreground" />
          <Input
            autoFocus={editing}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={`${label} URL (e.g. https://example.com)`}
            className="max-w-sm"
          />
          <button className="h-7 shrink-0 rounded-md bg-primary px-2.5 text-xs font-medium text-primary-foreground hover:bg-primary/90">
            Save
          </button>
          {editing && (
            <button
              type="button"
              onClick={() => {
                setEditing(false)
                setError(null)
              }}
              className="h-7 shrink-0 rounded-md px-2 text-xs text-muted-foreground hover:bg-muted"
            >
              Cancel
            </button>
          )}
        </form>
        {error && (
          <p className="flex items-center gap-1 text-xs text-destructive">
            <ExclamationTriangleIcon size={12} className="shrink-0" /> {error}
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1.5 text-sm">
        <LinkIcon size={14} className="shrink-0 text-muted-foreground" />
        <span className="text-muted-foreground">{label}:</span>
        <a href={value} target="_blank" rel="noreferrer" className="min-w-0 truncate text-link underline">
          {value}
        </a>
        <ArrowTopRightOnSquareIcon size={12} className="shrink-0 text-muted-foreground" />
        <button
          type="button"
          onClick={() => {
            setDraft(value ?? '')
            setError(null)
            setEditing(true)
          }}
          className="ml-1 shrink-0 text-muted-foreground hover:text-foreground"
        >
          <PencilIcon size={12} />
        </button>
        <button
          type="button"
          onClick={useFavicon}
          disabled={faviconBusy}
          title="Use this site's favicon as the project logo"
          className="ml-1 inline-flex shrink-0 items-center gap-1 rounded-md border border-border px-1.5 py-0.5 text-[11px] text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50"
        >
          <PhotoIcon size={12} /> {faviconBusy ? 'Checking…' : 'Use as logo'}
        </button>
      </div>
      {error && (
        <p className="flex items-center gap-1 text-xs text-destructive">
          <ExclamationTriangleIcon size={12} className="shrink-0" /> {error}
        </p>
      )}
    </div>
  )
}

/** Clients linked to this project — chips + a picker dialog, same pattern
 * as Details' Tech Stack. Clients themselves are managed on the global
 * Clients page (reachable from the dock); this just links/unlinks. */
function ClientsSection({ projectId }: { projectId: string }) {
  const { clients, loaded, load, subscribe, links, linkToProject, unlinkFromProject, clientsForProject } =
    useClients()
  const [pickerOpen, setPickerOpen] = useState(false)

  useEffect(() => {
    if (!loaded) load()
    return subscribe()
  }, [loaded, load, subscribe])

  const linked = clientsForProject(projectId)

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Clients</h2>
        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          className="inline-flex h-6 items-center gap-1 rounded-md border border-border px-1.5 text-xs hover:bg-muted"
        >
          <PlusIcon size={12} /> Add
        </button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {linked.map((c) => (
          <span key={c.id} className="group/chip inline-flex items-center gap-1 rounded bg-muted px-1.5 py-0.5 text-xs">
            {c.name}
            <button
              type="button"
              onClick={() => unlinkFromProject(projectId, c.id)}
              className="opacity-0 hover:text-destructive group-hover/chip:opacity-100"
            >
              <XMarkIcon size={12} />
            </button>
          </span>
        ))}
        {linked.length === 0 && <p className="text-xs text-muted-foreground">No clients linked yet.</p>}
      </div>

      <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
        {pickerOpen && (
          <DialogContent aria-describedby={undefined}>
            <DialogHeader>
              <DialogTitle>Link a client</DialogTitle>
            </DialogHeader>
            <div className="max-h-80 space-y-0.5 overflow-y-auto">
              {clients.map((c) => {
                const active = links.some((l) => l.project_id === projectId && l.client_id === c.id)
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => (active ? unlinkFromProject(projectId, c.id) : linkToProject(projectId, c.id))}
                    className={
                      'flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm ' +
                      (active ? 'bg-primary/10 text-foreground' : 'hover:bg-muted')
                    }
                  >
                    {c.name}
                    {active && <span className="text-xs text-primary">Linked</span>}
                  </button>
                )
              })}
              {clients.length === 0 && (
                <p className="px-2 py-6 text-center text-xs text-muted-foreground">
                  No clients yet — create one on the Clients page.
                </p>
              )}
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  )
}

const PRIORITY_RANK: Record<string, number> = { urgent: 3, high: 2, medium: 1, low: 0 }
