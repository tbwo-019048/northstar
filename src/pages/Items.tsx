import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ChevronRightIcon } from '@/components/ui/chevron-right'
import { MagnifyingGlassIcon } from '@/components/ui/magnifying-glass'
import { PlusIcon } from '@/components/ui/plus'
import { TrashIcon } from '@/components/ui/trash'
import { ArrowTopRightOnSquareIcon } from '@/components/ui/arrow-top-right-on-square'
import { Chip, EditableText, IconButton, Input, Select } from '@/components/ui-lite'
import { HideToggle } from '@/components/HideToggle'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/velobits/dialog'
import { useItems } from '@/store/useItems'
import { useProjects } from '@/store/useProjects'
import { useDiagnostic } from '@/store/useDiagnostic'
import { useDebouncedSave } from '@/hooks/useDebouncedSave'
import { visibleRows } from '@/lib/hidden'
import {
  PLAN_STATUS_LABEL,
  PLAN_STATUSES,
  PRIORITIES,
  TODO_TYPES,
  type Project,
} from '@/lib/types'
import {
  matchesCompletion,
  PLAN_STATUS_CHIP,
  SORT_KEYS,
  SORTS,
  TODO_STATUS_CHIP,
  TODO_STATUS_LABEL,
  toUnifiedFromPlan,
  toUnifiedFromTodo,
  type Completion,
  type ItemSource,
  type PriorityBand,
  type SortKey,
  type UnifiedItem,
} from '@/lib/unifiedItem'

const ITEMS_PAGE_SIZE = 25
const PRIORITY_BANDS: PriorityBand[] = ['urgent', 'high', 'medium', 'low']
const COMPLETIONS: { value: Completion; label: string }[] = [
  { value: 'active', label: 'Active' },
  { value: 'done', label: 'Completed' },
  { value: 'all', label: 'All' },
]
const DEFAULTS: Record<string, string> = { completion: 'active', sort: 'updated' }
/** Column count used for the expanded-row `colSpan` (spans every rendered cell). */
const COLS = 10

function relTime(iso: string): string {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)}m`
  if (s < 86400) return `${Math.floor(s / 3600)}h`
  if (s < 2592000) return `${Math.floor(s / 86400)}d`
  return new Date(iso).toLocaleDateString()
}

interface Filters {
  q: string
  projects: string[]
  source: ItemSource | null
  state: string | null
  completion: Completion
  priority: PriorityBand | null
  type: string | null
  sort: SortKey
  ready: boolean
  page: number
}

export function Items() {
  const {
    todos,
    planItems,
    comments,
    loaded,
    load,
    subscribe,
    add,
    patch,
    del,
    loadComments,
    addComment,
    delComment,
  } = useItems()
  const {
    projects,
    loaded: projectsLoaded,
    load: loadProjects,
    subscribe: subscribeProjects,
  } = useProjects()
  const diagnostic = useDiagnostic((s) => s.on)

  useEffect(() => {
    if (!loaded) void load()
    return subscribe()
  }, [loaded, load, subscribe])

  useEffect(() => {
    if (!projectsLoaded) void loadProjects()
    return subscribeProjects()
  }, [projectsLoaded, loadProjects, subscribeProjects])

  const projectsById = useMemo(() => new Map(projects.map((p) => [p.id, p])), [projects])

  // --- URL state ---------------------------------------------------------
  const [sp, setSp] = useSearchParams()
  const f: Filters = useMemo(() => {
    const sortRaw = sp.get('sort') as SortKey | null
    return {
      q: sp.get('q') ?? '',
      projects: sp.get('project')?.split(',').filter(Boolean) ?? [],
      source: (sp.get('source') as ItemSource | null) ?? null,
      state: sp.get('state'),
      completion: (sp.get('completion') as Completion | null) ?? 'active',
      priority: (sp.get('priority') as PriorityBand | null) ?? null,
      type: sp.get('type'),
      sort: sortRaw && sortRaw in SORTS ? sortRaw : 'updated',
      ready: sp.get('ready') === '1',
      page: Math.max(1, Number(sp.get('page') ?? '1') || 1),
    }
  }, [sp])

  const patchParams = useCallback(
    (next: Record<string, string | null>, resetPage = true) => {
      setSp(
        (prev) => {
          const p = new URLSearchParams(prev)
          for (const [k, v] of Object.entries(next)) {
            if (v == null || v === '' || DEFAULTS[k] === v) p.delete(k)
            else p.set(k, v)
          }
          if (resetPage) p.delete('page')
          return p
        },
        { replace: true },
      )
    },
    [setSp],
  )

  const clearFilters = () => setSp(new URLSearchParams(), { replace: true })
  const activeFilterCount =
    f.projects.length +
    (f.source ? 1 : 0) +
    (f.state ? 1 : 0) +
    (f.priority ? 1 : 0) +
    (f.type ? 1 : 0) +
    (f.completion !== 'active' ? 1 : 0) +
    (f.ready ? 1 : 0)

  // --- search box (local, debounced into the URL) -----------------------
  const [qInput, setQInput] = useState(f.q)
  const qRef = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (document.activeElement !== qRef.current) setQInput(f.q)
  }, [f.q])
  useEffect(() => {
    const id = setTimeout(() => {
      if (qInput !== f.q) patchParams({ q: qInput || null })
    }, 300)
    return () => clearTimeout(id)
  }, [qInput, f.q, patchParams])

  // --- derived pipeline -------------------------------------------------
  const allItems = useMemo(() => {
    const list: UnifiedItem[] = [
      ...todos.map(toUnifiedFromTodo),
      ...planItems.map(toUnifiedFromPlan),
    ]
    return visibleRows(list, diagnostic).filter((it) => projectsById.has(it.projectId))
  }, [todos, planItems, diagnostic, projectsById])

  const filtered = useMemo(() => {
    const q = f.q.trim().toLowerCase()
    return allItems.filter((it) => {
      if (f.ready) {
        if (!it.ready) return false
      } else if (!matchesCompletion(it, f.completion)) return false
      if (f.source && it.source !== f.source) return false
      if (f.projects.length && !f.projects.includes(it.projectId)) return false
      if (f.state && it.status !== f.state) return false
      if (f.priority && it.priorityBand !== f.priority) return false
      if (f.type && it.type !== f.type) return false
      if (q) {
        const pName = projectsById.get(it.projectId)?.name ?? ''
        const hay = `${it.title} ${it.subtitle ?? ''} ${it.description} ${pName}`.toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [allItems, f, projectsById])

  const sorted = useMemo(
    () => filtered.slice().sort((a, b) => SORTS[f.sort].cmp(a, b, { projectsById })),
    [filtered, f.sort, projectsById],
  )

  const pageCount = Math.max(1, Math.ceil(sorted.length / ITEMS_PAGE_SIZE))
  const safePage = Math.min(f.page, pageCount)
  const start = (safePage - 1) * ITEMS_PAGE_SIZE
  const pageRows = sorted.slice(start, start + ITEMS_PAGE_SIZE)

  // --- row expansion + add dialog -------------------------------------
  const [openKey, setOpenKey] = useState<string | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)

  const toggleReady = () =>
    patchParams({
      ready: f.ready ? null : '1',
      state: f.ready ? f.state : null,
      completion: null,
      priority: f.ready ? f.priority : null,
    })

  const toggleProject = (id: string) => {
    const next = f.projects.includes(id)
      ? f.projects.filter((x) => x !== id)
      : [...f.projects, id]
    patchParams({ project: next.join(',') || null })
  }

  const secondary = (
    <SecondaryFilters
      f={f}
      patchParams={patchParams}
      onOpenPicker={() => setPickerOpen(true)}
    />
  )

  return (
    <div className="space-y-3">
      <div>
        <div className="flex flex-wrap items-baseline gap-2">
          <h1 className="text-sm font-semibold">Items</h1>
          <span className="text-xs tabular-nums text-muted-foreground">{sorted.length}</span>
        </div>
        <p className="text-xs text-muted-foreground">
          View and manage actionable items across all of your projects.
        </p>
      </div>

      {/* toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <MagnifyingGlassIcon
            size={14}
            className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            ref={qRef}
            value={qInput}
            onChange={(e) => setQInput(e.target.value)}
            placeholder="Search"
            className="h-7 w-44 pl-7"
          />
        </div>

        <Select
          value={f.source ?? ''}
          onChange={(e) => patchParams({ source: e.target.value || null })}
          className="h-7"
        >
          <option value="">All sources</option>
          <option value="todo">To-Do</option>
          <option value="plan">Planning</option>
        </Select>

        <Select
          value={f.ready ? 'active' : f.completion}
          disabled={f.ready}
          onChange={(e) => patchParams({ completion: e.target.value })}
          className="h-7"
          title={f.ready ? 'Completion is fixed while "Ready to work" is on' : undefined}
        >
          {COMPLETIONS.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </Select>

        <Select
          value={f.sort}
          onChange={(e) => patchParams({ sort: e.target.value }, false)}
          className="h-7"
        >
          {SORT_KEYS.map((k) => (
            <option key={k} value={k}>
              {SORTS[k].label}
            </option>
          ))}
        </Select>

        <button
          type="button"
          onClick={toggleReady}
          className={
            'h-7 rounded-md border px-2 text-xs font-medium transition-colors ' +
            (f.ready
              ? 'border-primary bg-primary/10 text-primary'
              : 'border-border text-muted-foreground hover:bg-muted')
          }
        >
          Ready to work
        </button>

        <button
          type="button"
          onClick={() => setMobileFiltersOpen(true)}
          className="h-7 rounded-md border border-border px-2 text-xs text-muted-foreground hover:bg-muted sm:hidden"
        >
          Filters{activeFilterCount ? ` (${activeFilterCount})` : ''}
        </button>

        <div className="flex-1" />

        <button
          type="button"
          onClick={() => setAddOpen(true)}
          className="inline-flex h-7 items-center gap-1 rounded-md bg-primary px-2.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
        >
          <PlusIcon size={13} /> Add Item
        </button>
      </div>

      {/* secondary filters — inline on sm+ */}
      <div className="hidden flex-wrap items-center gap-2 rounded-md border border-border bg-muted/30 p-2 sm:flex">
        {secondary}
      </div>

      {/* table */}
      <div className="overflow-x-auto rounded-md border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40 text-left text-[11px] uppercase text-muted-foreground">
              <th className="w-6" />
              {diagnostic && <th className="w-6" />}
              <th className="px-2.5 py-1 font-medium">Item</th>
              <th className="hidden px-2.5 py-1 font-medium lg:table-cell">Project</th>
              <th className="hidden px-2.5 py-1 font-medium md:table-cell">Source</th>
              <th className="px-2.5 py-1 font-medium">State</th>
              <th className="hidden px-2.5 py-1 font-medium sm:table-cell">Priority</th>
              <th className="hidden px-2.5 py-1 font-medium xl:table-cell">Type</th>
              <th className="hidden px-2.5 py-1 text-right font-medium md:table-cell">Updated</th>
              <th className="w-8" />
            </tr>
          </thead>
          <tbody>
            {pageRows.map((it) => (
              <ItemRow
                key={it.key}
                item={it}
                project={projectsById.get(it.projectId)}
                open={openKey === it.key}
                toggle={() => setOpenKey(openKey === it.key ? null : it.key)}
                diagnostic={diagnostic}
                patch={patch}
                del={del}
                comments={comments[it.key]}
                loadComments={loadComments}
                addComment={addComment}
                delComment={delComment}
                onDeleted={() => setOpenKey(null)}
              />
            ))}

            {(!loaded || !projectsLoaded) && pageRows.length === 0 && (
              <tr>
                <td colSpan={COLS} className="px-3 py-8 text-center text-xs text-muted-foreground">
                  Loading…
                </td>
              </tr>
            )}
            {loaded && projectsLoaded && allItems.length === 0 && (
              <tr>
                <td colSpan={COLS} className="px-3 py-8 text-center text-xs text-muted-foreground">
                  No items yet. Add an item to one of your projects to start building your pipeline.
                </td>
              </tr>
            )}
            {loaded && projectsLoaded && allItems.length > 0 && sorted.length === 0 && (
              <tr>
                <td colSpan={COLS} className="px-3 py-8 text-center text-xs text-muted-foreground">
                  No items match these filters.{' '}
                  <button type="button" onClick={clearFilters} className="text-link underline">
                    Clear filters
                  </button>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {sorted.length > ITEMS_PAGE_SIZE && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="tabular-nums">
            {start + 1}–{Math.min(start + ITEMS_PAGE_SIZE, sorted.length)} of {sorted.length}
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={safePage <= 1}
              onClick={() => patchParams({ page: String(safePage - 1) }, false)}
              className="h-6 rounded-md border border-border px-2 hover:bg-muted disabled:opacity-40"
            >
              Prev
            </button>
            <span className="tabular-nums">
              {safePage} / {pageCount}
            </span>
            <button
              type="button"
              disabled={safePage >= pageCount}
              onClick={() => patchParams({ page: String(safePage + 1) }, false)}
              className="h-6 rounded-md border border-border px-2 hover:bg-muted disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}

      <AddItemDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        projects={projects}
        todos={todos}
        planItems={planItems}
        add={add}
        onCreated={(key) => setOpenKey(key)}
      />

      <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
        {pickerOpen && (
          <DialogContent aria-describedby={undefined}>
            <DialogHeader>
              <DialogTitle>Filter by project</DialogTitle>
            </DialogHeader>
            <div className="max-h-80 space-y-0.5 overflow-y-auto">
              {projects.map((p) => {
                const active = f.projects.includes(p.id)
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => toggleProject(p.id)}
                    className={
                      'flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm ' +
                      (active ? 'bg-primary/10 text-foreground' : 'hover:bg-muted')
                    }
                  >
                    {p.name}
                    {active && <span className="text-xs text-primary">✓</span>}
                  </button>
                )
              })}
              {projects.length === 0 && (
                <p className="px-2 py-6 text-center text-xs text-muted-foreground">No projects yet.</p>
              )}
            </div>
            {f.projects.length > 0 && (
              <button
                type="button"
                onClick={() => patchParams({ project: null })}
                className="text-xs text-muted-foreground underline"
              >
                Clear project filter
              </button>
            )}
          </DialogContent>
        )}
      </Dialog>

      <Dialog open={mobileFiltersOpen} onOpenChange={setMobileFiltersOpen}>
        {mobileFiltersOpen && (
          <DialogContent size="sm" aria-describedby={undefined}>
            <DialogHeader>
              <DialogTitle>Filters</DialogTitle>
            </DialogHeader>
            <div className="flex flex-col gap-2">{secondary}</div>
            {activeFilterCount > 0 && (
              <button
                type="button"
                onClick={clearFilters}
                className="text-xs text-muted-foreground underline"
              >
                Clear all filters
              </button>
            )}
          </DialogContent>
        )}
      </Dialog>
    </div>
  )
}

// ---------------------------------------------------------------------------

function SecondaryFilters({
  f,
  patchParams,
  onOpenPicker,
}: {
  f: Filters
  patchParams: (next: Record<string, string | null>, resetPage?: boolean) => void
  onOpenPicker: () => void
}) {
  return (
    <>
      <button
        type="button"
        onClick={onOpenPicker}
        className={
          'h-7 rounded-md border px-2 text-xs transition-colors ' +
          (f.projects.length
            ? 'border-primary bg-primary/10 text-primary'
            : 'border-border text-muted-foreground hover:bg-muted')
        }
      >
        {f.projects.length ? `Projects (${f.projects.length})` : 'All projects'}
      </button>

      <Select
        value={f.state ?? ''}
        onChange={(e) => patchParams({ state: e.target.value || null })}
        disabled={f.ready}
        className="h-7"
      >
        <option value="">All states</option>
        <optgroup label="To-Do">
          <option value="todo">To-Do</option>
          <option value="completed">Completed</option>
        </optgroup>
        <optgroup label="Planning">
          {PLAN_STATUSES.map((s) => (
            <option key={s} value={s}>
              {PLAN_STATUS_LABEL[s]}
            </option>
          ))}
        </optgroup>
      </Select>

      <Select
        value={f.priority ?? ''}
        onChange={(e) => patchParams({ priority: e.target.value || null })}
        disabled={f.ready}
        className="h-7 capitalize"
      >
        <option value="">All priorities</option>
        {PRIORITY_BANDS.map((p) => (
          <option key={p} value={p}>
            {p}
          </option>
        ))}
      </Select>

      <Select
        value={f.type ?? ''}
        onChange={(e) => patchParams({ type: e.target.value || null })}
        className="h-7 capitalize"
      >
        <option value="">All types</option>
        {TODO_TYPES.map((t) => (
          <option key={t} value={t}>
            {t}
          </option>
        ))}
      </Select>
    </>
  )
}

// ---------------------------------------------------------------------------

type PatchFn = ReturnType<typeof useItems.getState>['patch']
type DelFn = ReturnType<typeof useItems.getState>['del']

function PriorityCell({ item }: { item: UnifiedItem }) {
  if (item.source === 'todo' && item.todoPriority) {
    return <Chip tone="priority">{item.todoPriority}</Chip>
  }
  return (
    <span className="inline-flex items-center rounded bg-muted px-1.5 py-0.5 text-[11px] font-medium tabular-nums text-muted-foreground">
      {item.planPriority}/10
    </span>
  )
}

function StateCell({ item }: { item: UnifiedItem }) {
  const cls =
    item.source === 'plan'
      ? PLAN_STATUS_CHIP[item.status as keyof typeof PLAN_STATUS_CHIP]
      : TODO_STATUS_CHIP[item.status as keyof typeof TODO_STATUS_CHIP]
  return <Chip className={cls}>{item.statusLabel}</Chip>
}

function ItemRow({
  item,
  project,
  open,
  toggle,
  diagnostic,
  patch,
  del,
  comments,
  loadComments,
  addComment,
  delComment,
  onDeleted,
}: {
  item: UnifiedItem
  project: Project | undefined
  open: boolean
  toggle: () => void
  diagnostic: boolean
  patch: PatchFn
  del: DelFn
  comments: ReturnType<typeof useItems.getState>['comments'][string] | undefined
  loadComments: ReturnType<typeof useItems.getState>['loadComments']
  addComment: ReturnType<typeof useItems.getState>['addComment']
  delComment: ReturnType<typeof useItems.getState>['delComment']
  onDeleted: () => void
}) {
  return (
    <Fragment>
      <tr
        className={
          'border-b border-border last:border-0 hover:bg-muted/30' + (item.hidden ? ' opacity-50' : '')
        }
      >
        {diagnostic && (
          <td className="w-6 px-1 text-center">
            <HideToggle
              hidden={item.hidden}
              onToggle={(v) => patch(item.source, item.id, { hidden: v })}
            />
          </td>
        )}
        <td className="w-6 px-0">
          <IconButton onClick={toggle} title={open ? 'Collapse' : 'Expand'}>
            <ChevronRightIcon
              size={14}
              className={'transition-transform ' + (open ? 'rotate-90' : '')}
            />
          </IconButton>
        </td>
        <td className="px-2.5 py-1">
          <button
            type="button"
            onClick={toggle}
            className="block max-w-full text-left"
          >
            <span className="line-clamp-2 font-medium">{item.title || 'Untitled'}</span>
            {item.subtitle && (
              <span className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                {item.subtitle}
              </span>
            )}
          </button>
          {/* compact sub-line for narrow screens */}
          <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground lg:hidden">
            {project && (
              <Link to={`/app/project/${project.id}`} className="hover:underline">
                {project.name}
              </Link>
            )}
            <span className="md:hidden">· {item.source === 'todo' ? 'To-Do' : 'Plan'}</span>
            <span className="md:hidden">· {relTime(item.updatedAt)}</span>
          </div>
        </td>
        <td className="hidden max-w-40 px-2.5 py-1 lg:table-cell">
          {project ? (
            <Link
              to={`/app/project/${project.id}`}
              className="block truncate text-muted-foreground hover:text-foreground hover:underline"
            >
              {project.name}
            </Link>
          ) : (
            <span className="text-muted-foreground">—</span>
          )}
        </td>
        <td className="hidden px-2.5 py-1 md:table-cell">
          <Chip tone="neutral">{item.source === 'todo' ? 'To-Do' : 'Plan'}</Chip>
        </td>
        <td className="px-2.5 py-1">
          <StateCell item={item} />
        </td>
        <td className="hidden px-2.5 py-1 sm:table-cell">
          <PriorityCell item={item} />
        </td>
        <td className="hidden px-2.5 py-1 xl:table-cell">
          {item.type ? <Chip tone="type">{item.type}</Chip> : <span className="text-muted-foreground">—</span>}
        </td>
        <td className="hidden px-2.5 py-1 text-right text-xs text-muted-foreground md:table-cell">
          {relTime(item.updatedAt)}
        </td>
        <td className="w-8 px-1">
          <IconButton
            onClick={() => {
              if (confirm(`Delete "${item.title || 'this item'}"? This removes the record permanently.`)) {
                void del(item.source, item.id)
                onDeleted()
              }
            }}
            className="hover:text-destructive"
            title="Delete item"
          >
            <TrashIcon size={14} />
          </IconButton>
        </td>
      </tr>

      {open && (
        <tr className="border-b border-border bg-muted/20">
          <td colSpan={COLS} className="px-3 py-3">
            <ItemEditor
              item={item}
              project={project}
              patch={patch}
              del={del}
              comments={comments}
              loadComments={loadComments}
              addComment={addComment}
              delComment={delComment}
              onDeleted={onDeleted}
            />
          </td>
        </tr>
      )}
    </Fragment>
  )
}

// ---------------------------------------------------------------------------

function ItemEditor({
  item,
  project,
  patch,
  del,
  comments,
  loadComments,
  addComment,
  delComment,
  onDeleted,
}: {
  item: UnifiedItem
  project: Project | undefined
  patch: PatchFn
  del: DelFn
  comments: ReturnType<typeof useItems.getState>['comments'][string] | undefined
  loadComments: ReturnType<typeof useItems.getState>['loadComments']
  addComment: ReturnType<typeof useItems.getState>['addComment']
  delComment: ReturnType<typeof useItems.getState>['delComment']
  onDeleted: () => void
}) {
  const [desc, setDesc, descStatus] = useDebouncedSave(item.description, async (v) => {
    await patch(item.source, item.id, { description: v })
  })
  const [cText, setCText] = useState('')

  useEffect(() => {
    void loadComments(item.source, item.id)
  }, [item.source, item.id, loadComments])

  const set = (values: Record<string, unknown>) => void patch(item.source, item.id, values)

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
        <span>Created {new Date(item.createdAt).toLocaleDateString()}</span>
        <span>Updated {new Date(item.updatedAt).toLocaleDateString()}</span>
        {project && (
          <Link
            to={`/app/project/${project.id}/${item.source === 'todo' ? 'todo' : 'planning'}`}
            className="inline-flex items-center gap-1 text-link underline"
          >
            Open in {project.name} <ArrowTopRightOnSquareIcon size={11} />
          </Link>
        )}
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-2">
          <label className="block">
            <span className="text-[11px] font-medium uppercase text-muted-foreground">Title</span>
            <EditableText
              value={item.title}
              placeholder="Title"
              onSave={(v) => set({ title: v })}
              className="mt-0.5 font-medium"
            />
          </label>

          {item.source === 'todo' && (
            <label className="block">
              <span className="text-[11px] font-medium uppercase text-muted-foreground">Subtitle</span>
              <EditableText
                value={item.subtitle ?? ''}
                placeholder="add a subtitle…"
                onSave={(v) => set({ subtitle: v })}
                className="mt-0.5 text-xs text-muted-foreground"
              />
            </label>
          )}

          <label className="block">
            <span className="text-[11px] font-medium uppercase text-muted-foreground">
              Description{' '}
              {descStatus !== 'idle' && (
                <em className="not-italic text-primary">· {descStatus}</em>
              )}
            </span>
            <textarea
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              rows={4}
              placeholder="Full description…"
              className="mt-0.5 w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
            />
          </label>
        </div>

        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              <span className="text-[11px] font-medium uppercase text-muted-foreground">State</span>
              <Select
                value={item.status}
                onChange={(e) => set({ status: e.target.value })}
                className="mt-0.5 w-full"
              >
                {item.source === 'todo'
                  ? (['todo', 'completed'] as const).map((s) => (
                      <option key={s} value={s}>
                        {TODO_STATUS_LABEL[s]}
                      </option>
                    ))
                  : PLAN_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {PLAN_STATUS_LABEL[s]}
                      </option>
                    ))}
              </Select>
            </label>

            {item.source === 'todo' ? (
              <label className="block">
                <span className="text-[11px] font-medium uppercase text-muted-foreground">
                  Priority
                </span>
                <Select
                  value={item.todoPriority ?? 'medium'}
                  onChange={(e) => set({ priority: e.target.value })}
                  className="mt-0.5 w-full capitalize"
                >
                  {PRIORITIES.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </Select>
              </label>
            ) : (
              <label className="block">
                <span className="text-[11px] font-medium uppercase text-muted-foreground">
                  Priority · {item.planPriority}/10
                </span>
                <input
                  type="range"
                  min={0}
                  max={10}
                  value={item.planPriority ?? 5}
                  onChange={(e) => set({ priority: Number(e.target.value) })}
                  className="mt-2 w-full accent-[var(--primary)]"
                />
              </label>
            )}
          </div>

          {item.source === 'todo' && (
            <label className="block">
              <span className="text-[11px] font-medium uppercase text-muted-foreground">Type</span>
              <Select
                value={item.type ?? 'feature'}
                onChange={(e) => set({ type: e.target.value })}
                className="mt-0.5 w-full capitalize"
              >
                {TODO_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </Select>
            </label>
          )}

          {item.source === 'plan' && (
            <div className="grid grid-cols-2 gap-2">
              <label className="block">
                <span className="text-[11px] font-medium uppercase text-muted-foreground">
                  Start date
                </span>
                <Input
                  type="date"
                  value={item.startDate ?? ''}
                  onChange={(e) => set({ start_date: e.target.value || null })}
                  className="mt-0.5"
                />
              </label>
              <label className="block">
                <span className="text-[11px] font-medium uppercase text-muted-foreground">
                  Due date
                </span>
                <Input
                  type="date"
                  value={item.dueDate ?? ''}
                  onChange={(e) => set({ due_date: e.target.value || null })}
                  className="mt-0.5"
                />
              </label>
            </div>
          )}

          <div className="space-y-1">
            <span className="text-[11px] font-medium uppercase text-muted-foreground">
              Comments · {comments?.length ?? 0}
            </span>
            <div className="space-y-1">
              {(comments ?? []).map((c) => (
                <div key={c.id} className="group flex items-start gap-2 text-sm">
                  <span className="mt-0.5 shrink-0 text-xs text-muted-foreground">
                    {c.author.split('@')[0]}
                  </span>
                  <span className="flex-1 break-words">{c.body}</span>
                  <IconButton
                    onClick={() => void delComment(item.source, item.id, c.id)}
                    className="opacity-0 group-hover:opacity-100 hover:text-destructive"
                  >
                    <TrashIcon size={12} />
                  </IconButton>
                </div>
              ))}
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                if (!cText.trim()) return
                void addComment(item.source, item.id, cText)
                setCText('')
              }}
              className="flex gap-1.5"
            >
              <Input
                value={cText}
                onChange={(e) => setCText(e.target.value)}
                placeholder="Add a comment…"
              />
              <button className="h-7 shrink-0 rounded-md bg-primary px-2 text-xs font-medium text-primary-foreground hover:bg-primary/90">
                Post
              </button>
            </form>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-border pt-2">
        {item.source === 'plan' ? (
          <span className="text-[11px] text-muted-foreground">
            Photos are edited on the project's{' '}
            {project ? (
              <Link to={`/app/project/${project.id}/planning`} className="text-link underline">
                Planning tab
              </Link>
            ) : (
              'Planning tab'
            )}
            .
          </span>
        ) : (
          <span />
        )}
        <button
          type="button"
          onClick={() => {
            if (confirm(`Delete "${item.title || 'this item'}"? This removes the record permanently.`)) {
              void del(item.source, item.id)
              onDeleted()
            }
          }}
          className="inline-flex h-7 items-center gap-1 rounded-md border border-border px-2 text-xs text-muted-foreground hover:border-destructive hover:text-destructive"
        >
          <TrashIcon size={13} /> Delete
        </button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------

function AddItemDialog({
  open,
  onOpenChange,
  projects,
  todos,
  planItems,
  add,
  onCreated,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  projects: Project[]
  todos: ReturnType<typeof useItems.getState>['todos']
  planItems: ReturnType<typeof useItems.getState>['planItems']
  add: ReturnType<typeof useItems.getState>['add']
  onCreated: (key: string) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open && (
        <AddItemForm
          projects={projects}
          todos={todos}
          planItems={planItems}
          add={add}
          onClose={() => onOpenChange(false)}
          onCreated={onCreated}
        />
      )}
    </Dialog>
  )
}

function AddItemForm({
  projects,
  todos,
  planItems,
  add,
  onClose,
  onCreated,
}: {
  projects: Project[]
  todos: ReturnType<typeof useItems.getState>['todos']
  planItems: ReturnType<typeof useItems.getState>['planItems']
  add: ReturnType<typeof useItems.getState>['add']
  onClose: () => void
  onCreated: (key: string) => void
}) {
  const [kind, setKind] = useState<ItemSource>('todo')
  const [projectId, setProjectId] = useState(projects[0]?.id ?? '')
  const [title, setTitle] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!projectId || busy) return
    setBusy(true)
    const values =
      kind === 'todo'
        ? {
            project_id: projectId,
            title: title.trim() || 'New item',
            status: 'todo',
            priority: 'medium',
            type: 'feature',
            sort: todos.filter((t) => t.project_id === projectId).length,
          }
        : {
            project_id: projectId,
            title: title.trim() || 'New plan item',
            status: 'requested',
            priority: 5,
            sort: planItems.filter((p) => p.project_id === projectId).length,
          }
    const res = await add(kind, values)
    setBusy(false)
    onClose()
    if (res) onCreated(`${kind}:${res.id}`)
  }

  return (
    <DialogContent size="sm" focusFirstField aria-describedby={undefined}>
      <DialogHeader>
        <DialogTitle>Add item</DialogTitle>
      </DialogHeader>
      <form onSubmit={submit} className="space-y-3">
        <div className="flex gap-1.5">
          {(['todo', 'plan'] as const).map((k) => (
            <button
              key={k}
              type="button"
              onClick={() => setKind(k)}
              className={
                'h-7 flex-1 rounded-md border px-2 text-xs font-medium transition-colors ' +
                (kind === k
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border text-muted-foreground hover:bg-muted')
              }
            >
              {k === 'todo' ? 'To-Do' : 'Plan item'}
            </button>
          ))}
        </div>

        <label className="block space-y-1">
          <span className="text-[11px] font-medium uppercase text-muted-foreground">Project</span>
          <Select
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            className="w-full"
            required
          >
            <option value="" disabled>
              Choose a project…
            </option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
        </label>

        <label className="block space-y-1">
          <span className="text-[11px] font-medium uppercase text-muted-foreground">Title</span>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What needs doing?" />
        </label>

        <div className="flex justify-end gap-2 border-t border-border pt-3">
          <button
            type="button"
            onClick={onClose}
            className="h-7 rounded-md px-2 text-xs text-muted-foreground hover:bg-muted"
          >
            Cancel
          </button>
          <button
            disabled={!projectId || busy}
            className="h-7 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            Create
          </button>
        </div>
      </form>
    </DialogContent>
  )
}
