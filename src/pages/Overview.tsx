import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, Plus, Search, X } from 'lucide-react'
import { useProjects } from '@/store/useProjects'
import { PROJECT_TYPES, type ProjectType } from '@/lib/types'
import { Input, Select, Chip, IconButton } from '@/components/ui-lite'

const TYPE_TONE: Partial<Record<ProjectType, string>> = {
  website: 'bg-violet-500/15 text-violet-600 dark:text-violet-400',
  app: 'bg-sky-500/15 text-sky-600 dark:text-sky-400',
  physical: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
  written: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
  other: 'bg-zinc-500/15 text-zinc-600 dark:text-zinc-400',
}
const FALLBACK_TONE = 'bg-muted text-muted-foreground'

export function Overview() {
  const { projects, loaded, load, create, subscribe, error, clearError } = useProjects()
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState<ProjectType | 'all'>('all')
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')
  const [type, setType] = useState<ProjectType>('website')
  const [formError, setFormError] = useState<string | null>(null)

  useEffect(() => {
    if (!loaded) load()
    return subscribe()
  }, [loaded, load, subscribe])

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

      <div className="flex items-center gap-2">
        <h1 className="text-sm font-semibold">Projects</h1>
        <span className="text-xs text-muted-foreground">{projects.length}</span>
        <div className="flex-1" />
        <div className="relative">
          <Search className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search"
            className="h-7 w-44 pl-7"
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

      <div className="overflow-hidden rounded-md border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40 text-left text-xs text-muted-foreground">
              <th className="px-3 py-1.5 font-medium">Name</th>
              <th className="px-3 py-1.5 font-medium">Type</th>
              <th className="w-20 px-3 py-1.5 text-right font-medium">Hours</th>
              <th className="w-28 px-3 py-1.5 text-right font-medium">Updated</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr key={p.id} className="group border-b border-border last:border-0 hover:bg-muted/40">
                <td className="px-3 py-1.5">
                  <Link to={`/app/project/${p.id}`} className="font-medium hover:underline">
                    {p.name}
                  </Link>
                  {p.summary && (
                    <span className="ml-2 text-xs text-muted-foreground">{p.summary}</span>
                  )}
                </td>
                <td className="px-3 py-1.5">
                  <Chip className={TYPE_TONE[p.type] ?? FALLBACK_TONE}>{p.type}</Chip>
                </td>
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
    </div>
  )
}
