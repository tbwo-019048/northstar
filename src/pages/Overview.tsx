import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { GripVertical, Lock, LockOpen } from 'lucide-react'
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { ChartPieIcon } from '@/components/ui/chart-pie'
import { UsersIcon } from '@/components/ui/users'
import { ExclamationTriangleIcon } from '@/components/ui/exclamation-triangle'
import { ArrowDownTrayIcon } from '@/components/ui/arrow-down-tray'
import { Squares2X2Icon } from '@/components/ui/squares-2x2'
import { ListBulletIcon } from '@/components/ui/list-bullet'
import { PlusIcon } from '@/components/ui/plus'
import { Bars3Icon } from '@/components/ui/bars-3'
import { MagnifyingGlassIcon } from '@/components/ui/magnifying-glass'
import { ArrowUpTrayIcon } from '@/components/ui/arrow-up-tray'
import { TrashIcon } from '@/components/ui/trash'
import { XMarkIcon } from '@/components/ui/x-mark'
import { useProjects } from '@/store/useProjects'
import { useClients } from '@/store/useClients'
import { useDiagnostic } from '@/store/useDiagnostic'
import { useGridCols } from '@/store/useGridCols'
import { useTemplates, seedProjectFromTemplate } from '@/store/useTemplates'
import { visibleRows } from '@/lib/hidden'
import { HideToggle } from '@/components/HideToggle'
import { useReorderLock } from '@/hooks/useReorderLock'
import { PROJECT_STATES, PROJECT_TYPES, type Project, type ProjectState, type ProjectType } from '@/lib/types'
import { Input, Select, Chip, IconButton } from '@/components/ui-lite'
import { ProjectLogo } from '@/components/ProjectLogo'
import { HalfCircleProgress, statePercent } from '@/components/HalfCircleProgress'
import { useConfirm } from '@/store/useConfirm'
import { parseCSV, toCSV, downloadText } from '@/lib/csv'
import { STATE_CHIP_CLASS, STATE_TEXT_CLASS, formatState } from '@/lib/projectState'

const TYPE_TONE: Partial<Record<ProjectType, string>> = {
  website: 'bg-violet-500/15 text-violet-700 dark:text-violet-300',
  app: 'bg-cyan-500/15 text-cyan-700 dark:text-cyan-300',
  production: 'bg-rose-500/15 text-rose-700 dark:text-rose-300',
  physical: 'bg-orange-500/15 text-orange-700 dark:text-orange-300',
  mechanical: 'bg-stone-500/20 text-stone-700 dark:text-stone-300',
  location: 'bg-lime-500/20 text-lime-700 dark:text-lime-300',
  written: 'bg-fuchsia-500/15 text-fuchsia-700 dark:text-fuchsia-300',
  writing: 'bg-pink-500/15 text-pink-700 dark:text-pink-300',
  game: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
  novel: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
  music: 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300',
  other: 'bg-zinc-500/15 text-zinc-600 dark:text-zinc-300',
}
const FALLBACK_TONE = 'bg-muted text-muted-foreground'

type ViewMode = 'table' | 'byType' | 'byClient' | 'grid' | 'progress'
const VIEW_KEY = 'northstar.overview.view'
const CODENAME_KEY = 'northstar.overview.codenames'
const PAGINATE_KEY = 'northstar.overview.paginate'
const RETIRED_KEY = 'northstar.overview.showRetired'
const TABLEPAGE_KEY = 'northstar.overview.tablepage'
const TABLE_PAGE_SIZE = 15

export function Overview() {
  const { projects, loaded, load, create, update, remove, reorder, subscribe, error, clearError } =
    useProjects()
  const [unlocked, setUnlocked] = useReorderLock('projects')
  const {
    templates,
    loaded: templatesLoaded,
    load: loadTemplates,
    subscribe: subscribeTemplates,
  } = useTemplates()
  const {
    clients,
    loaded: clientsLoaded,
    load: loadClients,
    subscribe: subscribeClients,
    projectIdsForClient,
  } = useClients()
  const diagnostic = useDiagnostic((s) => s.on)
  const confirm = useConfirm()
  const gridCols = useGridCols((s) => s.cols)
  const compactGrid = gridCols > 6
  const gridStyle = { gridTemplateColumns: `repeat(${gridCols}, minmax(0, 1fr))` }
  const nav = useNavigate()
  const [q, setQ] = useState('')
  const [showDescriptions, setShowDescriptions] = useState(false)
  const [codenames, setCodenames] = useState(() => {
    try {
      return localStorage.getItem(CODENAME_KEY) !== '0'
    } catch {
      return true
    }
  })
  const [paginate, setPaginate] = useState(() => {
    try {
      return localStorage.getItem(PAGINATE_KEY) === '1'
    } catch {
      return false
    }
  })
  const [showRetired, setShowRetired] = useState(() => {
    try {
      return localStorage.getItem(RETIRED_KEY) === '1'
    } catch {
      return false
    }
  })
  const [filter, setFilter] = useState<ProjectType | 'all'>('all')
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')
  const [type, setType] = useState<ProjectType>('website')
  const [templateId, setTemplateId] = useState('')
  const [creating, setCreating] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [view, setView] = useState<ViewMode>(() => {
    try {
      return (localStorage.getItem(VIEW_KEY) as ViewMode) || 'table'
    } catch {
      return 'table'
    }
  })
  const [importMsg, setImportMsg] = useState<string | null>(null)
  const [tablePage, setTablePage] = useState(() => {
    try {
      return Math.max(0, Number(localStorage.getItem(TABLEPAGE_KEY)) || 0)
    } catch {
      return 0
    }
  })
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!loaded) load()
    return subscribe()
  }, [loaded, load, subscribe])

  useEffect(() => {
    if (!templatesLoaded) loadTemplates()
    return subscribeTemplates()
  }, [templatesLoaded, loadTemplates, subscribeTemplates])

  useEffect(() => {
    if (!clientsLoaded) loadClients()
    return subscribeClients()
  }, [clientsLoaded, loadClients, subscribeClients])

  useEffect(() => {
    try {
      localStorage.setItem(VIEW_KEY, view)
    } catch {
      /* ignore */
    }
  }, [view])

  useEffect(() => {
    try {
      localStorage.setItem(CODENAME_KEY, codenames ? '1' : '0')
    } catch {
      /* ignore */
    }
  }, [codenames])

  useEffect(() => {
    try {
      localStorage.setItem(PAGINATE_KEY, paginate ? '1' : '0')
    } catch {
      /* ignore */
    }
  }, [paginate])

  useEffect(() => {
    try {
      localStorage.setItem(TABLEPAGE_KEY, String(tablePage))
    } catch {
      /* ignore */
    }
  }, [tablePage])

  useEffect(() => {
    try {
      localStorage.setItem(RETIRED_KEY, showRetired ? '1' : '0')
    } catch {
      /* ignore */
    }
  }, [showRetired])

  const projectLabel = (p: Project) => (codenames && p.codename?.trim() ? p.codename : p.name)

  const rows = useMemo(() => {
    const matched = projects.filter(
      (p) =>
        (filter === 'all' || p.type === filter) &&
        (showRetired || p.state !== 'retired') &&
        (p.name.toLowerCase().includes(q.toLowerCase()) ||
          (p.codename ?? '').toLowerCase().includes(q.toLowerCase())),
    )
    return visibleRows(matched, diagnostic)
  }, [projects, q, filter, diagnostic, showRetired])

  // A project's `type` can hold a value the current build doesn't know about
  // (e.g. the database enum hasn't been migrated yet) — keep it selectable
  // instead of silently dropping it from the dropdowns.
  const legacyTypes = useMemo(
    () => [...new Set(projects.map((p) => p.type))].filter((t) => !PROJECT_TYPES.includes(t)),
    [projects],
  )
  const allTypes = [...PROJECT_TYPES, ...legacyTypes]

  const byType = useMemo(() => {
    const groups = new Map<string, Project[]>()
    for (const p of rows) {
      if (!groups.has(p.type)) groups.set(p.type, [])
      groups.get(p.type)!.push(p)
    }
    return [...groups.entries()]
  }, [rows])

  // Group projects by linked client. A project with several clients appears
  // under each; projects with none go under "Unassigned".
  const byClient = useMemo(() => {
    const groups = new Map<string, Project[]>()
    for (const p of rows) {
      const names = clients
        .filter((c) => projectIdsForClient(c.id).includes(p.id))
        .map((c) => c.name || 'Unnamed client')
      for (const key of names.length ? names : ['Unassigned']) {
        if (!groups.has(key)) groups.set(key, [])
        groups.get(key)!.push(p)
      }
    }
    return [...groups.entries()].sort((a, b) => {
      if (a[0] === 'Unassigned') return 1
      if (b[0] === 'Unassigned') return -1
      return a[0].localeCompare(b[0])
    })
  }, [rows, clients, projectIdsForClient])

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || creating) return
    setCreating(true)
    const { project, error: err } = await create(name.trim(), type)
    if (err || !project) {
      setFormError(err)
      setCreating(false)
      return
    }
    const tpl = templateId ? templates.find((t) => t.id === templateId) : null
    if (tpl) {
      if (tpl.payload.summary) await update(project.id, { summary: tpl.payload.summary })
      await seedProjectFromTemplate(project.id, tpl.payload)
    }
    setFormError(null)
    setName('')
    setType('website')
    setTemplateId('')
    setAdding(false)
    setCreating(false)
    if (tpl) nav(`/app/project/${project.id}`)
  }

  const openProject = (id: string) => nav(`/app/project/${id}`)
  const deleteProject = async (project: Project) => {
    if (
      await confirm({
        title: `Delete "${projectLabel(project)}"?`,
        message: 'All of its project data will be removed permanently.',
      })
    ) {
      void remove(project.id)
    }
  }

  const exportCsv = () => {
    const csv = toCSV(
      ['name', 'type', 'state', 'summary', 'hours_worked', 'logo_url'],
      rows.map((p) => [p.name, p.type, p.state, p.summary, p.hours_worked, p.logo_url ?? '']),
    )
    downloadText('projects.csv', csv, 'text/csv')
  }

  const importCsv = async (file: File) => {
    const text = await file.text()
    const records = parseCSV(text)
    let created = 0
    let updated = 0
    let failed = 0
    for (const rec of records) {
      const recName = (rec.name ?? '').trim()
      if (!recName) continue
      const recType = (rec.type ?? '').trim() as ProjectType
      const recState = (rec.state ?? '').trim() as ProjectState
      const patch: Partial<Project> = {}
      if (rec.summary !== undefined) patch.summary = rec.summary
      if (rec.hours_worked !== undefined && rec.hours_worked !== '') {
        patch.hours_worked = Number(rec.hours_worked) || 0
      }
      if (rec.logo_url !== undefined) patch.logo_url = rec.logo_url || null
      if (recType) patch.type = recType
      if (recState && PROJECT_STATES.includes(recState)) patch.state = recState

      const existing = projects.find((p) => p.name.toLowerCase() === recName.toLowerCase())
      if (existing) {
        const { error: err } = await update(existing.id, patch)
        if (err) failed++
        else updated++
      } else {
        const { error: err } = await create(recName, recType || 'other')
        if (err) {
          failed++
        } else {
          created++
        }
      }
    }
    setImportMsg(
      `Imported: ${created} created, ${updated} updated${failed ? `, ${failed} failed` : ''}.`,
    )
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-2.5 py-1.5 text-xs text-destructive">
          <ExclamationTriangleIcon size={14} className="mt-0.5 shrink-0" />
          <span className="flex-1">{error}</span>
          <IconButton onClick={clearError} className="hover:text-destructive">
            <XMarkIcon size={14} />
          </IconButton>
        </div>
      )}
      {importMsg && (
        <div className="flex items-start gap-2 rounded-md border border-border bg-muted/30 px-2.5 py-1.5 text-xs text-muted-foreground">
          <span className="flex-1">{importMsg}</span>
          <IconButton onClick={() => setImportMsg(null)}>
            <XMarkIcon size={14} />
          </IconButton>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-sm font-semibold">Projects</h1>
        <span className="text-xs text-muted-foreground">{projects.length}</span>
        <div className="flex-1" />
        <div className="relative">
          <MagnifyingGlassIcon size={14} className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => {
              setQ(e.target.value)
              setTablePage(0)
            }}
            placeholder="Search"
            className="h-7 w-40 pl-7"
          />
        </div>
        <label className="inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-md border border-border px-2 text-xs text-muted-foreground hover:bg-muted/40 hover:text-foreground">
          <input
            type="checkbox"
            checked={showDescriptions}
            onChange={(event) => setShowDescriptions(event.target.checked)}
            className="size-3.5 accent-primary"
          />
          Descriptions
        </label>
        <label className="inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-md border border-border px-2 text-xs text-muted-foreground hover:bg-muted/40 hover:text-foreground">
          <input
            type="checkbox"
            checked={codenames}
            onChange={(event) => setCodenames(event.target.checked)}
            className="size-3.5 accent-primary"
          />
          Codenames
        </label>
        <label className="inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-md border border-border px-2 text-xs text-muted-foreground hover:bg-muted/40 hover:text-foreground">
          <input
            type="checkbox"
            checked={showRetired}
            onChange={(event) => setShowRetired(event.target.checked)}
            className="size-3.5 accent-primary"
          />
          Retired
        </label>
        <label className="inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-md border border-border px-2 text-xs text-muted-foreground hover:bg-muted/40 hover:text-foreground">
          <input
            type="checkbox"
            checked={paginate}
            onChange={(event) => {
              setPaginate(event.target.checked)
              setTablePage(0)
            }}
            className="size-3.5 accent-primary"
          />
          Paginate
        </label>
        <Select
          value={filter}
          onChange={(e) => {
            setFilter(e.target.value as ProjectType | 'all')
            setTablePage(0)
          }}
        >
          <option value="all">All types</option>
          {allTypes.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </Select>

        <div className="flex items-center gap-0.5 rounded-md border border-border p-0.5">
          <IconButton
            title="Table"
            onClick={() => setView('table')}
            className={view === 'table' ? 'bg-muted text-foreground' : ''}
          >
            <ListBulletIcon size={14} />
          </IconButton>
          <IconButton
            title="Grouped by type"
            onClick={() => setView('byType')}
            className={view === 'byType' ? 'bg-muted text-foreground' : ''}
          >
            <Bars3Icon size={14} />
          </IconButton>
          <IconButton
            title="Grouped by client"
            onClick={() => setView('byClient')}
            className={view === 'byClient' ? 'bg-muted text-foreground' : ''}
          >
            <UsersIcon size={14} />
          </IconButton>
          <IconButton
            title="Grid"
            onClick={() => setView('grid')}
            className={view === 'grid' ? 'bg-muted text-foreground' : ''}
          >
            <Squares2X2Icon size={14} />
          </IconButton>
          <IconButton
            title="Progress"
            onClick={() => setView('progress')}
            className={view === 'progress' ? 'bg-muted text-foreground' : ''}
          >
            <ChartPieIcon size={14} />
          </IconButton>
        </div>

        <IconButton title="Export CSV" onClick={exportCsv} className="border border-border">
          <ArrowDownTrayIcon size={14} />
        </IconButton>
        <IconButton
          title="Import CSV"
          onClick={() => fileRef.current?.click()}
          className="border border-border"
        >
          <ArrowUpTrayIcon size={14} />
        </IconButton>
        <input
          ref={fileRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) void importCsv(file)
            e.target.value = ''
          }}
        />

        <IconButton
          title={unlocked ? 'Lock order' : 'Unlock to reorder (table view)'}
          onClick={() => {
            if (!unlocked) setView('table')
            setUnlocked(!unlocked)
          }}
          className={'border border-border ' + (unlocked ? 'bg-primary/10 text-primary' : '')}
        >
          {unlocked ? <LockOpen className="size-3.5" /> : <Lock className="size-3.5" />}
        </IconButton>

        <button
          type="button"
          onClick={() => setAdding((v) => !v)}
          className="inline-flex h-7 items-center gap-1 rounded-md bg-primary px-2 text-xs font-medium text-primary-foreground hover:bg-primary/90"
        >
          <PlusIcon size={14} /> New
        </button>
      </div>

      {adding && (
        <form
          onSubmit={onCreate}
          className="flex flex-wrap items-center gap-2 rounded-md border border-border bg-muted/30 p-2"
        >
          <Input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Project name"
            className="max-w-xs"
          />
          <Select value={type} onChange={(e) => setType(e.target.value as ProjectType)}>
            {PROJECT_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </Select>
          {templates.length > 0 && (
            <Select
              value={templateId}
              onChange={(e) => setTemplateId(e.target.value)}
              title="Seed the new project from a template"
            >
              <option value="">No template</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name || 'Untitled template'}
                </option>
              ))}
            </Select>
          )}
          <button
            disabled={creating}
            className="h-7 rounded-md bg-primary px-2.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {creating ? 'Creating…' : 'Create'}
          </button>
          <button
            type="button"
            onClick={() => {
              setAdding(false)
              setFormError(null)
              setTemplateId('')
            }}
            className="h-7 rounded-md px-2 text-xs text-muted-foreground hover:bg-muted"
          >
            Cancel
          </button>
          {formError && (
            <span className="w-full text-xs text-destructive">
              {formError}
              {formError.toLowerCase().includes('invalid input value for enum') &&
                ' — the database hasn’t been migrated to the new project types yet. Re-run supabase/schema.sql.'}
            </span>
          )}
        </form>
      )}

      {view === 'table' &&
        (unlocked ? (
          <ReorderList
            rows={projects}
            nameFor={projectLabel}
            onOpen={openProject}
            onDelete={deleteProject}
            onReorder={(ids) => reorder(ids)}
          />
        ) : (
          <TablePage
            rows={rows}
            loaded={loaded}
            onOpen={openProject}
            onDelete={deleteProject}
            nameFor={projectLabel}
            showDescriptions={showDescriptions}
            diagnostic={diagnostic}
            onToggleHidden={(pid, hidden) => update(pid, { hidden })}
            paginate={paginate}
            page={tablePage}
            setPage={setTablePage}
          />
        ))}

      {view === 'byType' && (
        <div className="space-y-4">
          {byType.map(([t, list]) => (
            <div key={t} className="space-y-1">
              <h2 className="text-xs font-semibold capitalize text-muted-foreground">
                {t} · {list.length}
              </h2>
              <ProjectTable
                rows={list}
                loaded={loaded}
                onOpen={openProject}
                onDelete={deleteProject}
                compact
                nameFor={projectLabel}
                showDescriptions={showDescriptions}
                diagnostic={diagnostic}
                onToggleHidden={(pid, hidden) => update(pid, { hidden })}
              />
            </div>
          ))}
          {byType.length === 0 && (
            <p className="px-3 py-6 text-center text-xs text-muted-foreground">
              {loaded ? 'No projects yet.' : 'Loading…'}
            </p>
          )}
        </div>
      )}

      {view === 'byClient' && (
        <div className="space-y-4">
          {byClient.map(([client, list]) => (
            <div key={client} className="space-y-1">
              <h2 className="text-xs font-semibold text-muted-foreground">
                {client} · {list.length}
              </h2>
              <ProjectTable
                rows={list}
                loaded={loaded}
                onOpen={openProject}
                onDelete={deleteProject}
                compact
                nameFor={projectLabel}
                showDescriptions={showDescriptions}
                diagnostic={diagnostic}
                onToggleHidden={(pid, hidden) => update(pid, { hidden })}
              />
            </div>
          ))}
          {byClient.length === 0 && (
            <p className="px-3 py-6 text-center text-xs text-muted-foreground">
              {loaded ? 'No projects yet.' : 'Loading…'}
            </p>
          )}
        </div>
      )}

      {view === 'grid' && (
        <div className="grid gap-2" style={gridStyle}>
          {rows.map((p) => (
            <div key={p.id} className="group relative rounded-md hover:bg-muted/60">
              <button
                type="button"
                onClick={() => openProject(p.id)}
                className="flex w-full flex-col items-center gap-1.5 rounded-md p-2 text-center"
              >
                <ProjectLogo project={p} size="lg" />
                <span className="line-clamp-2 h-8 w-full break-words text-center text-xs font-medium leading-4">
                  {projectLabel(p)}
                </span>
                {compactGrid ? (
                  <span
                    className="line-clamp-2 w-full text-center text-[10px] leading-3 text-muted-foreground"
                    title={p.countries?.join(', ') || 'No location'}
                  >
                    {p.countries?.join(', ') || 'No location'}
                  </span>
                ) : (
                  <div className="flex flex-wrap items-center justify-center gap-1">
                    <Chip className={STATE_CHIP_CLASS[p.state] ?? FALLBACK_TONE}>{formatState(p.state)}</Chip>
                    <Chip className={TYPE_TONE[p.type] ?? FALLBACK_TONE}>{p.type}</Chip>
                  </div>
                )}
              </button>
              <IconButton
                title={`Delete ${projectLabel(p)}`}
                onClick={() => deleteProject(p)}
                className="absolute right-1 top-1 bg-background/80 text-muted-foreground opacity-70 shadow-sm hover:text-destructive sm:opacity-0 sm:group-hover:opacity-100 sm:focus:opacity-100"
              >
                <TrashIcon size={14} />
              </IconButton>
            </div>
          ))}
          {rows.length === 0 && (
            <p className="col-span-full px-3 py-6 text-center text-xs text-muted-foreground">
              {loaded ? 'No projects yet.' : 'Loading…'}
            </p>
          )}
        </div>
      )}

      {view === 'progress' && (
        <div className="grid gap-2" style={gridStyle}>
          {rows.map((p) => (
            <div key={p.id} className="group relative rounded-md border border-border hover:bg-muted/50">
              <button
                type="button"
                onClick={() => openProject(p.id)}
                className="flex w-full flex-col items-center gap-1.5 rounded-md p-2 text-center"
              >
                <span className="line-clamp-2 h-8 w-full break-words text-xs font-medium leading-4">
                  {projectLabel(p)}
                </span>
                <div className={STATE_TEXT_CLASS[p.state] ?? 'text-muted-foreground'}>
                  <HalfCircleProgress
                    value={statePercent(p.state)}
                    label={formatState(p.state)}
                    color="currentColor"
                    size="xs"
                  />
                </div>
                <Chip className={STATE_CHIP_CLASS[p.state] ?? FALLBACK_TONE}>{formatState(p.state)}</Chip>
              </button>
              <IconButton
                title={`Delete ${projectLabel(p)}`}
                onClick={() => deleteProject(p)}
                className="absolute right-1 top-1 bg-background/80 text-muted-foreground opacity-70 shadow-sm hover:text-destructive sm:opacity-0 sm:group-hover:opacity-100 sm:focus:opacity-100"
              >
                <TrashIcon size={14} />
              </IconButton>
            </div>
          ))}
          {rows.length === 0 && (
            <p className="col-span-full px-3 py-6 text-center text-xs text-muted-foreground">
              {loaded ? 'No projects yet.' : 'Loading…'}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

function ReorderList({
  rows,
  nameFor,
  onOpen,
  onDelete,
  onReorder,
}: {
  rows: Project[]
  nameFor: (p: Project) => string
  onOpen: (id: string) => void
  onDelete: (project: Project) => void
  onReorder: (ids: string[]) => void
}) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }))
  const ids = rows.map((r) => r.id)
  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e
    if (!over || active.id === over.id) return
    const from = ids.indexOf(String(active.id))
    const to = ids.indexOf(String(over.id))
    if (from < 0 || to < 0) return
    onReorder(arrayMove(ids, from, to))
  }
  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <div className="divide-y divide-border rounded-md border border-border">
          {rows.map((p) => (
            <ReorderRow key={p.id} p={p} label={nameFor(p)} onOpen={onOpen} onDelete={onDelete} />
          ))}
          {rows.length === 0 && (
            <p className="px-3 py-6 text-center text-xs text-muted-foreground">No projects.</p>
          )}
        </div>
      </SortableContext>
    </DndContext>
  )
}

function ReorderRow({ p, label, onOpen, onDelete }: { p: Project; label: string; onOpen: (id: string) => void; onDelete: (project: Project) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: p.id,
  })
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }
  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-2 px-2 py-1.5 text-sm">
      <button
        type="button"
        className="cursor-grab text-muted-foreground/50 hover:text-foreground active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-3.5" />
      </button>
      <ProjectLogo project={p} size="xs" />
      <button type="button" onClick={() => onOpen(p.id)} className="min-w-0 flex-1 truncate text-left font-medium hover:underline">
        {label}
      </button>
      <Chip className={TYPE_TONE[p.type] ?? FALLBACK_TONE}>{p.type}</Chip>
      <Chip className={STATE_CHIP_CLASS[p.state] ?? FALLBACK_TONE}>{formatState(p.state)}</Chip>
      <IconButton title={`Delete ${label}`} onClick={() => onDelete(p)} className="hover:text-destructive">
        <TrashIcon size={14} />
      </IconButton>
    </div>
  )
}

function TablePage({
  rows,
  loaded,
  onOpen,
  onDelete,
  nameFor,
  showDescriptions,
  diagnostic,
  onToggleHidden,
  paginate,
  page,
  setPage,
}: {
  rows: Project[]
  loaded: boolean
  onOpen: (id: string) => void
  onDelete: (project: Project) => void
  nameFor: (p: Project) => string
  showDescriptions: boolean
  diagnostic: boolean
  onToggleHidden: (id: string, hidden: boolean) => void
  paginate: boolean
  page: number
  setPage: (n: number) => void
}) {
  if (!paginate) {
    return (
      <ProjectTable
        rows={rows}
        loaded={loaded}
        onOpen={onOpen}
        onDelete={onDelete}
        nameFor={nameFor}
        showDescriptions={showDescriptions}
        diagnostic={diagnostic}
        onToggleHidden={onToggleHidden}
      />
    )
  }

  const pageCount = Math.max(1, Math.ceil(rows.length / TABLE_PAGE_SIZE))
  const safePage = Math.min(page, pageCount - 1)
  const start = safePage * TABLE_PAGE_SIZE
  const pageRows = rows.slice(start, start + TABLE_PAGE_SIZE)

  return (
    <div className="space-y-2">
      <ProjectTable
        rows={pageRows}
        loaded={loaded}
        onOpen={onOpen}
        onDelete={onDelete}
        nameFor={nameFor}
        showDescriptions={showDescriptions}
        diagnostic={diagnostic}
        onToggleHidden={onToggleHidden}
      />
      {rows.length > TABLE_PAGE_SIZE && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="tabular-nums">
            {start + 1}–{Math.min(start + TABLE_PAGE_SIZE, rows.length)} of {rows.length}
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={safePage === 0}
              onClick={() => setPage(safePage - 1)}
              className="h-6 rounded-md border border-border px-2 hover:bg-muted disabled:opacity-40"
            >
              Prev
            </button>
            <span className="tabular-nums">
              {safePage + 1} / {pageCount}
            </span>
            <button
              type="button"
              disabled={safePage >= pageCount - 1}
              onClick={() => setPage(safePage + 1)}
              className="h-6 rounded-md border border-border px-2 hover:bg-muted disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function ProjectTable({
  rows,
  loaded,
  onOpen,
  onDelete,
  compact,
  nameFor,
  showDescriptions,
  diagnostic,
  onToggleHidden,
}: {
  rows: Project[]
  loaded: boolean
  onOpen: (id: string) => void
  onDelete: (project: Project) => void
  compact?: boolean
  nameFor: (p: Project) => string
  showDescriptions: boolean
  diagnostic: boolean
  onToggleHidden: (id: string, hidden: boolean) => void
}) {
  // A shared <colgroup> (identical whether or not the header row renders)
  // is what keeps columns lined up across the separate <table> elements in
  // Grouped view — without it, each group auto-sizes its own columns from
  // its own content and they stagger against each other.
  return (
    <div className="overflow-hidden rounded-md border border-border">
      <table className="w-full table-fixed text-sm">
        <colgroup>
          {diagnostic && <col className="w-8" />}
          <col />
          {!compact && <col className="w-24" />}
          <col className="w-28" />
          <col className="w-16" />
          <col className="w-24" />
          <col className="w-8" />
        </colgroup>
        {!compact && (
          <thead>
            <tr className="border-b border-border bg-muted/40 text-left text-xs text-muted-foreground">
              {diagnostic && <th />}
              <th className="px-2.5 py-1 font-medium">Name</th>
              <th className="px-2.5 py-1 font-medium">Type</th>
              <th className="px-2.5 py-1 font-medium">State</th>
              <th className="px-2.5 py-1 text-right font-medium">Hours</th>
              <th className="px-2.5 py-1 text-right font-medium">Updated</th>
              <th />
            </tr>
          </thead>
        )}
        <tbody>
          {rows.map((p) => (
            <tr
              key={p.id}
              tabIndex={0}
              onClick={() => onOpen(p.id)}
              onKeyDown={(e) => e.key === 'Enter' && onOpen(p.id)}
              className={
                'group cursor-pointer border-b border-border last:border-0 hover:bg-muted/40 focus:bg-muted/40 focus:outline-none' +
                (p.hidden ? ' opacity-50' : '')
              }
            >
              {diagnostic && (
                <td className="px-1.5 py-1 text-center">
                  <HideToggle hidden={p.hidden} onToggle={(v) => onToggleHidden(p.id, v)} />
                </td>
              )}
              <td className="truncate px-2.5 py-1">
                <span className="flex items-center gap-1.5 truncate font-medium group-hover:underline">
                  <ProjectLogo project={p} size="xs" />
                  <span className="truncate">{nameFor(p)}</span>
                </span>
                {showDescriptions && p.summary && (
                  <span className="ml-[22px] block truncate text-xs text-muted-foreground">
                    {p.summary}
                  </span>
                )}
              </td>
              {!compact && (
                <td className="px-2.5 py-1">
                  <Chip className={TYPE_TONE[p.type] ?? FALLBACK_TONE}>{p.type}</Chip>
                </td>
              )}
              <td className="px-2.5 py-1">
                <Chip className={STATE_CHIP_CLASS[p.state] ?? FALLBACK_TONE}>{formatState(p.state)}</Chip>
              </td>
              <td className="px-2.5 py-1 text-right tabular-nums text-muted-foreground">
                {p.hours_worked || 0}
              </td>
              <td className="px-2.5 py-1 text-right text-xs text-muted-foreground">
                {new Date(p.updated_at).toLocaleDateString()}
              </td>
              <td className="px-1 py-1">
                <IconButton
                  title={`Delete ${nameFor(p)}`}
                  onClick={(event) => {
                    event.stopPropagation()
                    onDelete(p)
                  }}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <TrashIcon size={14} />
                </IconButton>
              </td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={7} className="px-3 py-6 text-center text-xs text-muted-foreground">
                {loaded ? 'No projects yet.' : 'Loading…'}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
