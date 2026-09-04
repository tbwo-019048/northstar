import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AlertTriangle,
  Download,
  LayoutGrid,
  List,
  Plus,
  Rows3,
  Search,
  Upload,
  X,
} from 'lucide-react'
import { useProjects } from '@/store/useProjects'
import { PROJECT_TYPES, type Project, type ProjectType } from '@/lib/types'
import { Input, Select, Chip, IconButton } from '@/components/ui-lite'
import { ProjectLogo } from '@/components/ProjectLogo'
import { parseCSV, toCSV, downloadText } from '@/lib/csv'

const TYPE_TONE: Partial<Record<ProjectType, string>> = {
  website: 'bg-violet-500/15 text-violet-600 dark:text-violet-400',
  app: 'bg-sky-500/15 text-sky-600 dark:text-sky-400',
  physical: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
  written: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
  other: 'bg-zinc-500/15 text-zinc-600 dark:text-zinc-400',
}
const FALLBACK_TONE = 'bg-muted text-muted-foreground'

type ViewMode = 'table' | 'byType' | 'grid'
const VIEW_KEY = 'northstar.overview.view'

export function Overview() {
  const { projects, loaded, load, create, update, subscribe, error, clearError } = useProjects()
  const nav = useNavigate()
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState<ProjectType | 'all'>('all')
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')
  const [type, setType] = useState<ProjectType>('website')
  const [formError, setFormError] = useState<string | null>(null)
  const [view, setView] = useState<ViewMode>(() => {
    try {
      return (localStorage.getItem(VIEW_KEY) as ViewMode) || 'table'
    } catch {
      return 'table'
    }
  })
  const [importMsg, setImportMsg] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!loaded) load()
    return subscribe()
  }, [loaded, load, subscribe])

  useEffect(() => {
    try {
      localStorage.setItem(VIEW_KEY, view)
    } catch {
      /* ignore */
    }
  }, [view])

  const rows = useMemo(() => {
    return projects.filter(
      (p) =>
        (filter === 'all' || p.type === filter) &&
        p.name.toLowerCase().includes(q.toLowerCase()),
    )
  }, [projects, q, filter])

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

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    const { error: err } = await create(name.trim(), type)
    if (err) {
      setFormError(err)
      return
    }
    setFormError(null)
    setName('')
    setType('website')
    setAdding(false)
  }

  const openProject = (id: string) => nav(`/app/project/${id}`)

  const exportCsv = () => {
    const csv = toCSV(
      ['name', 'type', 'summary', 'hours_worked', 'logo_url'],
      rows.map((p) => [p.name, p.type, p.summary, p.hours_worked, p.logo_url ?? '']),
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
      const patch: Partial<Project> = {}
      if (rec.summary !== undefined) patch.summary = rec.summary
      if (rec.hours_worked !== undefined && rec.hours_worked !== '') {
        patch.hours_worked = Number(rec.hours_worked) || 0
      }
      if (rec.logo_url !== undefined) patch.logo_url = rec.logo_url || null
      if (recType) patch.type = recType

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
          <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
          <span className="flex-1">{error}</span>
          <IconButton onClick={clearError} className="hover:text-destructive">
            <X className="size-3.5" />
          </IconButton>
        </div>
      )}
      {importMsg && (
        <div className="flex items-start gap-2 rounded-md border border-border bg-muted/30 px-2.5 py-1.5 text-xs text-muted-foreground">
          <span className="flex-1">{importMsg}</span>
          <IconButton onClick={() => setImportMsg(null)}>
            <X className="size-3.5" />
          </IconButton>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-sm font-semibold">Projects</h1>
        <span className="text-xs text-muted-foreground">{projects.length}</span>
        <div className="flex-1" />
        <div className="relative">
          <Search className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search"
            className="h-7 w-40 pl-7"
          />
        </div>
        <Select value={filter} onChange={(e) => setFilter(e.target.value as ProjectType | 'all')}>
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
            <List className="size-3.5" />
          </IconButton>
          <IconButton
            title="By type"
            onClick={() => setView('byType')}
            className={view === 'byType' ? 'bg-muted text-foreground' : ''}
          >
            <Rows3 className="size-3.5" />
          </IconButton>
          <IconButton
            title="Grid"
            onClick={() => setView('grid')}
            className={view === 'grid' ? 'bg-muted text-foreground' : ''}
          >
            <LayoutGrid className="size-3.5" />
          </IconButton>
        </div>

        <IconButton title="Export CSV" onClick={exportCsv} className="border border-border">
          <Download className="size-3.5" />
        </IconButton>
        <IconButton
          title="Import CSV"
          onClick={() => fileRef.current?.click()}
          className="border border-border"
        >
          <Upload className="size-3.5" />
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

        <button
          type="button"
          onClick={() => setAdding((v) => !v)}
          className="inline-flex h-7 items-center gap-1 rounded-md bg-primary px-2 text-xs font-medium text-primary-foreground hover:bg-primary/90"
        >
          <Plus className="size-3.5" /> New
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
          <button className="h-7 rounded-md bg-primary px-2.5 text-xs font-medium text-primary-foreground hover:bg-primary/90">
            Create
          </button>
          <button
            type="button"
            onClick={() => {
              setAdding(false)
              setFormError(null)
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

      {view === 'table' && <ProjectTable rows={rows} loaded={loaded} onOpen={openProject} />}

      {view === 'byType' && (
        <div className="space-y-4">
          {byType.map(([t, list]) => (
            <div key={t} className="space-y-1">
              <h2 className="text-xs font-semibold capitalize text-muted-foreground">
                {t} · {list.length}
              </h2>
              <ProjectTable rows={list} loaded={loaded} onOpen={openProject} compact />
            </div>
          ))}
          {byType.length === 0 && (
            <p className="px-3 py-6 text-center text-xs text-muted-foreground">
              {loaded ? 'No projects yet.' : 'Loading…'}
            </p>
          )}
        </div>
      )}

      {view === 'grid' && (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
          {rows.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => openProject(p.id)}
              className="flex flex-col items-center gap-1.5 rounded-md p-2 text-center hover:bg-muted/60"
            >
              <ProjectLogo project={p} size="lg" />
              <span className="w-full truncate text-xs font-medium">{p.name}</span>
            </button>
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

function ProjectTable({
  rows,
  loaded,
  onOpen,
  compact,
}: {
  rows: Project[]
  loaded: boolean
  onOpen: (id: string) => void
  compact?: boolean
}) {
  return (
    <div className="overflow-hidden rounded-md border border-border">
      <table className="w-full text-sm">
        {!compact && (
          <thead>
            <tr className="border-b border-border bg-muted/40 text-left text-xs text-muted-foreground">
              <th className="px-3 py-1.5 font-medium">Name</th>
              <th className="px-3 py-1.5 font-medium">Type</th>
              <th className="w-20 px-3 py-1.5 text-right font-medium">Hours</th>
              <th className="w-28 px-3 py-1.5 text-right font-medium">Updated</th>
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
              className="group cursor-pointer border-b border-border last:border-0 hover:bg-muted/40 focus:bg-muted/40 focus:outline-none"
            >
              <td className="px-3 py-1.5">
                <span className="flex items-center gap-2 font-medium group-hover:underline">
                  <ProjectLogo project={p} size="sm" />
                  {p.name}
                </span>
                {p.summary && (
                  <span className="ml-8 text-xs text-muted-foreground">{p.summary}</span>
                )}
              </td>
              {!compact && (
                <td className="px-3 py-1.5">
                  <Chip className={TYPE_TONE[p.type] ?? FALLBACK_TONE}>{p.type}</Chip>
                </td>
              )}
              <td className="px-3 py-1.5 text-right tabular-nums text-muted-foreground">
                {p.hours_worked || 0}
              </td>
              <td className="px-3 py-1.5 text-right text-xs text-muted-foreground">
                {new Date(p.updated_at).toLocaleDateString()}
              </td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td colSpan={4} className="px-3 py-6 text-center text-xs text-muted-foreground">
                {loaded ? 'No projects yet.' : 'Loading…'}
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
