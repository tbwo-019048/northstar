import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ExclamationTriangleIcon } from '@/components/ui/exclamation-triangle'
import { ArrowDownTrayIcon } from '@/components/ui/arrow-down-tray'
import { ArrowRightIcon } from '@/components/ui/arrow-right'
import { ArrowTopRightOnSquareIcon } from '@/components/ui/arrow-top-right-on-square'
import { PhotoIcon } from '@/components/ui/photo'
import { LinkIcon } from '@/components/ui/link'
import { PencilIcon } from '@/components/ui/pencil'
import { PlusIcon } from '@/components/ui/plus'
import { TrashIcon } from '@/components/ui/trash'
import { XMarkIcon } from '@/components/ui/x-mark'
import {
  useProjectData,
  asTodos,
  asFeatures,
  asRequests,
  asPeople,
  asPipelines,
  asCredentials,
  asSupabaseAccounts,
} from '@/store/useProjectData'
import { useProjects } from '@/store/useProjects'
import { useClients } from '@/store/useClients'
import { useConfirm } from '@/store/useConfirm'
import { Chip, IconButton, Input, SecretField } from '@/components/ui-lite'
import { PipelineTab } from '@/pages/project/PipelineTab'
import { resolveFaviconUrl } from '@/lib/favicon'
import { ScreenshotGallery } from '@/components/ScreenshotGallery'
import { HalfCircleProgress, statePercent } from '@/components/HalfCircleProgress'
import { STATE_TEXT_CLASS, formatState } from '@/lib/projectState'
import { APP_PLATFORMS, SITE_TYPES, type Project } from '@/lib/types'
import type { SummaryBlock } from '@/lib/projectLayout'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/velobits/dialog'

type SiteField = 'website_url' | 'test_site_url'

export function SummaryTab({ project, blocks }: { project: Project; blocks: SummaryBlock[] }) {
  const rows = useProjectData((s) => s.rows)
  const nav = useNavigate()
  const { id } = useParams()
  const has = (b: SummaryBlock) => blocks.includes(b)
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
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() =>
            window.open(`/app/project/${project.id}/print`, '_blank', 'noopener')
          }
          className="inline-flex h-7 items-center gap-1 rounded-md border border-border px-2 text-xs hover:bg-muted"
        >
          <ArrowDownTrayIcon size={12} /> Export PDF
        </button>
      </div>

      {has('url') && hasSites && (
        <div className="space-y-2">
          <SiteLinkRow project={project} field="website_url" label="Live Site" />
          <SiteLinkRow project={project} field="test_site_url" label="Test Site" />
          {project.type === 'app' && <PlatformPicker project={project} />}
        </div>
      )}

      {(has('image') || has('progress')) && (
        <div className="flex items-center gap-3">
          {has('image') && (
            <div className="min-w-0 flex-1">
              <ScreenshotGallery project={project} />
            </div>
          )}
          {has('progress') && (
            <div
              className={
                'flex flex-1 items-center justify-center ' +
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
          )}
        </div>
      )}

      {has('summary') && project.summary && (
        <p className="rounded-md border border-border bg-muted/20 px-3 py-2 text-sm text-muted-foreground">
          {project.summary}
        </p>
      )}

      {has('clients') && <ClientsSection projectId={project.id} />}

      {hasSites && (
        <>
          <LoginSection projectId={project.id} />
          <SupabaseSection projectId={project.id} />
        </>
      )}

      {!hasSites && (
        <div className="space-y-1.5">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Pipeline
          </h2>
          <PipelineTab project={project} />
        </div>
      )}

      {has('stats') && (
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
      )}

      {has('topTodos') && (
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
      )}
    </div>
  )
}

/** OS/platform chips for an app project. */
function PlatformPicker({ project }: { project: Project }) {
  const { update } = useProjects()
  const selected = project.platforms ?? []
  const toggle = (p: string) =>
    update(project.id, {
      platforms: selected.includes(p) ? selected.filter((x) => x !== p) : [...selected, p],
    })
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-xs text-muted-foreground">Platforms:</span>
      {APP_PLATFORMS.map((p) => {
        const on = selected.includes(p)
        return (
          <button
            key={p}
            type="button"
            onClick={() => toggle(p)}
            className={
              'h-6 rounded-md border px-2 text-xs ' +
              (on
                ? 'border-primary bg-primary/10 text-foreground'
                : 'border-border text-muted-foreground hover:bg-muted')
            }
          >
            {p}
          </button>
        )
      })}
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

/** A website/app project's own sign-in — one row per project. */
function LoginSection({ projectId }: { projectId: string }) {
  const rows = useProjectData((s) => s.rows.project_credentials)
  const { add, patch } = useProjectData()
  const cred = asCredentials(rows)[0]

  return (
    <div className="space-y-1.5">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Login</h2>
      {!cred ? (
        <button
          type="button"
          onClick={() => add('project_credentials', { project_id: projectId, sort: 0 })}
          className="inline-flex h-7 items-center gap-1 rounded-md border border-border px-2 text-xs hover:bg-muted"
        >
          <PlusIcon size={12} /> Set up login
        </button>
      ) : (
        <div className="grid gap-3 rounded-md border border-border bg-muted/20 p-2 sm:grid-cols-3">
          <label className="block">
            <span className="text-[11px] font-medium uppercase text-muted-foreground">
              Username / email
            </span>
            <Input
              className="mt-1"
              value={cred.username}
              onChange={(e) => patch('project_credentials', cred.id, { username: e.target.value })}
            />
          </label>
          <label className="block">
            <span className="text-[11px] font-medium uppercase text-muted-foreground">Password</span>
            <SecretField
              className="mt-1"
              value={cred.password}
              onChange={(e) => patch('project_credentials', cred.id, { password: e.target.value })}
            />
          </label>
          <label className="block">
            <span className="text-[11px] font-medium uppercase text-muted-foreground">
              Verification token
            </span>
            <SecretField
              className="mt-1"
              value={cred.verification_token}
              placeholder="optional"
              onChange={(e) =>
                patch('project_credentials', cred.id, { verification_token: e.target.value })
              }
            />
          </label>
        </div>
      )}
    </div>
  )
}

/** Supabase accounts tied to a website/app project — email, password, project. */
function SupabaseSection({ projectId }: { projectId: string }) {
  const rows = useProjectData((s) => s.rows.project_supabase)
  const { add, patch, del } = useProjectData()
  const confirm = useConfirm()
  const accounts = asSupabaseAccounts(rows).slice().sort((a, b) => a.sort - b.sort)

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Supabase
        </h2>
        <button
          type="button"
          onClick={() =>
            add('project_supabase', { project_id: projectId, sort: accounts.length })
          }
          className="inline-flex h-6 items-center gap-1 rounded-md border border-border px-1.5 text-xs hover:bg-muted"
        >
          <PlusIcon size={12} /> Add
        </button>
      </div>
      <div className="space-y-1.5">
        {accounts.map((acc) => (
          <div
            key={acc.id}
            className="flex flex-wrap items-center gap-2 rounded-md border border-border bg-muted/20 p-2"
          >
            <Input
              value={acc.project_name}
              onChange={(e) => patch('project_supabase', acc.id, { project_name: e.target.value })}
              placeholder="Project name"
              className="max-w-[200px]"
            />
            <Input
              value={acc.email}
              onChange={(e) => patch('project_supabase', acc.id, { email: e.target.value })}
              placeholder="email"
              className="max-w-[220px]"
            />
            <SecretField
              value={acc.password}
              onChange={(e) => patch('project_supabase', acc.id, { password: e.target.value })}
              placeholder="password"
              className="max-w-[180px]"
            />
            <IconButton
              onClick={async () => {
                if (await confirm({ title: 'Remove this Supabase account?', confirmLabel: 'Remove' }))
                  del('project_supabase', acc.id)
              }}
              className="ml-auto hover:text-destructive"
            >
              <TrashIcon size={14} />
            </IconButton>
          </div>
        ))}
        {accounts.length === 0 && (
          <p className="text-xs text-muted-foreground">No Supabase accounts yet.</p>
        )}
      </div>
    </div>
  )
}

const PRIORITY_RANK: Record<string, number> = { urgent: 3, high: 2, medium: 1, low: 0 }
