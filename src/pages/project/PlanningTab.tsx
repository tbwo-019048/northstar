import { useMemo, useRef, useState } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, Loader2 } from 'lucide-react'
import { PhotoIcon } from '@/components/ui/photo'
import { PlusIcon } from '@/components/ui/plus'
import { TrashIcon } from '@/components/ui/trash'
import { XMarkIcon } from '@/components/ui/x-mark'
import { useProjectData, asPlanItems, asPlanComments } from '@/store/useProjectData'
import { useProjects } from '@/store/useProjects'
import { useDiagnostic } from '@/store/useDiagnostic'
import { visibleRows } from '@/lib/hidden'
import { HideToggle } from '@/components/HideToggle'
import { useAuth } from '@/store/useAuth'
import { supabase } from '@/lib/supabase'
import {
  PLAN_BANDS,
  PLAN_BAND_LABEL,
  PLAN_BAND_PRIORITY,
  PLAN_STATUSES,
  PLAN_STATUS_LABEL,
  planBand,
  type PlanBand,
  type PlanItem,
  type PlanningPrefs,
  type PlanStatus,
} from '@/lib/types'
import { EditableText, IconButton, Input, Select } from '@/components/ui-lite'
import { useDebouncedSave } from '@/hooks/useDebouncedSave'
import { useConfirm } from '@/store/useConfirm'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/velobits/dialog'

type PatchFn = ReturnType<typeof useProjectData.getState>['patch']

const STATUS_CLASS: Record<PlanStatus, string> = {
  requested: 'bg-sky-500/15 text-sky-600 dark:text-sky-400',
  in_progress: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
  delayed: 'bg-orange-500/15 text-orange-600 dark:text-orange-400',
  completed: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
  failed: 'bg-red-500/15 text-red-600 dark:text-red-400',
}

function StatusChip({ status }: { status: PlanStatus }) {
  return (
    <span className={'inline-flex shrink-0 items-center rounded px-1.5 py-0.5 text-[11px] font-medium ' + STATUS_CLASS[status]}>
      {PLAN_STATUS_LABEL[status]}
    </span>
  )
}

function PriorityBadge({ n }: { n: number }) {
  const tone =
    n >= 8
      ? 'bg-red-500/15 text-red-600 dark:text-red-400'
      : n >= 5
        ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
        : 'bg-muted text-muted-foreground'
  return (
    <span className={'inline-flex shrink-0 items-center rounded px-1.5 py-0.5 text-[11px] font-semibold tabular-nums ' + tone}>
      {n}/10
    </span>
  )
}

const VIEW_KEY = 'northstar.planning.view'
type PlanView = 'timeline' | 'board'

function fmtDate(d: string | null) {
  if (!d) return null
  return new Date(`${d}T00:00:00`).toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

export function PlanningTab({ projectId }: { projectId: string }) {
  const rows = useProjectData((s) => s.rows.plan_items)
  const { add, patch, del, reorder } = useProjectData()
  const diagnostic = useDiagnostic((s) => s.on)
  const items = visibleRows(asPlanItems(rows), diagnostic)
  const project = useProjects((s) => s.projects.find((p) => p.id === projectId))
  const updateProject = useProjects((s) => s.update)
  const prefs: PlanningPrefs = project?.planning_prefs ?? {}
  const savePrefs = (next: PlanningPrefs) =>
    void updateProject(projectId, { planning_prefs: { ...prefs, ...next } })
  const [view, setView] = useState<PlanView>(() => {
    try {
      return (localStorage.getItem(VIEW_KEY) as PlanView) || 'timeline'
    } catch {
      return 'timeline'
    }
  })
  const [openId, setOpenId] = useState<string | null>(null)
  const openItem = items.find((i) => i.id === openId) ?? null

  const setViewPersist = (next: PlanView) => {
    setView(next)
    try {
      localStorage.setItem(VIEW_KEY, next)
    } catch {
      /* ignore */
    }
  }

  const addItem = () =>
    add('plan_items', {
      project_id: projectId,
      title: 'New plan item',
      status: 'requested',
      priority: 5,
      sort: items.length,
    })

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Planning · {items.length}
        </h2>
        <button
          type="button"
          onClick={addItem}
          className="inline-flex h-6 items-center gap-1 rounded-md border border-border px-1.5 text-xs hover:bg-muted"
        >
          <PlusIcon size={12} /> Add
        </button>
        {view === 'board' && (
          <label className="ml-auto flex items-center gap-1 text-[11px] text-muted-foreground">
            Swimlanes
            <Select
              value={prefs.swimlane ?? 'none'}
              onChange={(e) => savePrefs({ swimlane: e.target.value as 'none' | 'priority' })}
              className="h-6"
            >
              <option value="none">None</option>
              <option value="priority">Priority</option>
            </Select>
          </label>
        )}
        <div
          className={
            (view === 'board' ? '' : 'ml-auto ') +
            'flex items-center gap-0.5 rounded-md border border-border p-0.5'
          }
        >
          <button
            type="button"
            onClick={() => setViewPersist('timeline')}
            className={
              'h-6 rounded px-2 text-xs ' +
              (view === 'timeline' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground')
            }
          >
            Timeline
          </button>
          <button
            type="button"
            onClick={() => setViewPersist('board')}
            className={
              'h-6 rounded px-2 text-xs ' +
              (view === 'board' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground')
            }
          >
            Board
          </button>
        </div>
      </div>

      {view === 'timeline' ? (
        <TimelineView items={items} onOpen={setOpenId} patch={patch} diagnostic={diagnostic} />
      ) : (
        <BoardView
          items={items}
          patch={patch}
          reorder={reorder}
          onOpen={setOpenId}
          prefs={prefs}
          savePrefs={savePrefs}
          diagnostic={diagnostic}
        />
      )}

      <Dialog open={!!openItem} onOpenChange={(v) => !v && setOpenId(null)}>
        {openItem && (
          <PlanItemModal item={openItem} patch={patch} del={del} onClose={() => setOpenId(null)} />
        )}
      </Dialog>
    </div>
  )
}

/** Ordered chronological list — the default view. */
function TimelineView({
  items,
  onOpen,
  patch,
  diagnostic,
}: {
  items: PlanItem[]
  onOpen: (id: string) => void
  patch: PatchFn
  diagnostic: boolean
}) {
  const ordered = useMemo(
    () =>
      items.slice().sort((a, b) => {
        const da = a.start_date ?? a.due_date ?? ''
        const db = b.start_date ?? b.due_date ?? ''
        if (da && db && da !== db) return da < db ? -1 : 1
        if (da && !db) return -1
        if (!da && db) return 1
        return a.sort - b.sort
      }),
    [items],
  )

  if (ordered.length === 0) {
    return (
      <p className="rounded-md border border-dashed border-border px-3 py-8 text-center text-xs text-muted-foreground">
        No plan items yet — add one to start the timeline.
      </p>
    )
  }

  return (
    <ol className="relative space-y-0.5 border-l border-border pl-4">
      {ordered.map((item) => (
        <li
          key={item.id}
          className={'relative flex items-center gap-1.5' + (item.hidden ? ' opacity-50' : '')}
        >
          <span className="absolute -left-5 top-3 size-2 rounded-full border-2 border-background bg-primary" />
          {diagnostic && (
            <HideToggle
              hidden={item.hidden}
              onToggle={(v) => patch('plan_items', item.id, { hidden: v })}
            />
          )}
          <button
            type="button"
            onClick={() => onOpen(item.id)}
            className="flex w-full min-w-0 flex-1 items-center gap-2 rounded-md px-2 py-1.5 text-left hover:bg-muted/50"
          >
            <span className="w-24 shrink-0 text-[11px] tabular-nums text-muted-foreground">
              {fmtDate(item.start_date) ?? fmtDate(item.due_date) ?? '—'}
            </span>
            <StatusChip status={item.status} />
            <span className="min-w-0 flex-1 truncate text-sm font-medium">{item.title || 'Untitled'}</span>
            {item.photos.length > 0 && (
              <span className="inline-flex shrink-0 items-center gap-0.5 text-[10px] text-muted-foreground">
                <PhotoIcon size={11} /> {item.photos.length}
              </span>
            )}
            <PriorityBadge n={item.priority} />
          </button>
        </li>
      ))}
    </ol>
  )
}

const colId = (status: PlanStatus, band?: PlanBand) => (band ? `${status}__${band}` : status)
const parseColId = (id: string): { status: PlanStatus; band?: PlanBand } | null => {
  const [s, b] = id.split('__')
  if (!(PLAN_STATUSES as string[]).includes(s)) return null
  return { status: s as PlanStatus, band: (b as PlanBand) || undefined }
}
const GRID = 'grid gap-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5'

/** Kanban board — one column per status, drag cards between them. Optional
 * per-column WIP limits and priority swimlanes (dragging into another lane
 * snaps the card's priority to that band). */
function BoardView({
  items,
  patch,
  reorder,
  onOpen,
  prefs,
  savePrefs,
  diagnostic,
}: {
  items: PlanItem[]
  patch: PatchFn
  reorder: ReturnType<typeof useProjectData.getState>['reorder']
  onOpen: (id: string) => void
  prefs: PlanningPrefs
  savePrefs: (next: PlanningPrefs) => void
  diagnostic: boolean
}) {
  const swim = prefs.swimlane === 'priority'
  const [activeId, setActiveId] = useState<string | null>(null)
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }))

  const byStatus = useMemo(() => {
    const map: Record<PlanStatus, PlanItem[]> = {
      requested: [],
      in_progress: [],
      delayed: [],
      completed: [],
      failed: [],
    }
    for (const item of items.slice().sort((a, b) => a.sort - b.sort)) map[item.status].push(item)
    return map
  }, [items])

  const locate = (id: string): { status: PlanStatus; band?: PlanBand } | null => {
    const parsed = parseColId(id)
    if (parsed) return parsed
    const it = items.find((i) => i.id === id)
    return it ? { status: it.status, band: planBand(it.priority) } : null
  }

  const onDragStart = (e: DragStartEvent) => setActiveId(String(e.active.id))

  const onDragEnd = (e: DragEndEvent) => {
    setActiveId(null)
    const { active, over } = e
    if (!over) return
    const activeIdStr = String(active.id)
    const moved = items.find((i) => i.id === activeIdStr)
    const dest = locate(String(over.id))
    if (!moved || !dest) return
    const fromStatus = moved.status

    const patchValues: Record<string, unknown> = {}
    if (dest.status !== fromStatus) patchValues.status = dest.status
    if (swim && dest.band && dest.band !== planBand(moved.priority)) {
      patchValues.priority = PLAN_BAND_PRIORITY[dest.band]
    }
    if (Object.keys(patchValues).length) patch('plan_items', activeIdStr, patchValues)

    const destList = byStatus[dest.status].filter((i) => i.id !== activeIdStr)
    const overItem = items.find((i) => i.id === String(over.id))
    const idx = overItem ? destList.findIndex((i) => i.id === overItem.id) : -1
    destList.splice(idx < 0 ? destList.length : idx, 0, moved)
    if (fromStatus !== dest.status) {
      reorder('plan_items', byStatus[fromStatus].filter((i) => i.id !== activeIdStr))
    }
    reorder('plan_items', destList)
  }

  const columns = (band?: PlanBand) =>
    PLAN_STATUSES.map((status) => (
      <BoardColumn
        key={colId(status, band)}
        droppableId={colId(status, band)}
        status={status}
        items={band ? byStatus[status].filter((i) => planBand(i.priority) === band) : byStatus[status]}
        total={byStatus[status].length}
        limit={prefs.wip?.[status]}
        onLimitChange={
          !band || band === PLAN_BANDS[0]
            ? (n) => savePrefs({ wip: { ...prefs.wip, [status]: n || undefined } })
            : undefined
        }
        onOpen={onOpen}
        patch={patch}
        diagnostic={diagnostic}
      />
    ))

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      {swim ? (
        <div className="space-y-3">
          {PLAN_BANDS.map((band) => (
            <div key={band} className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                {PLAN_BAND_LABEL[band]}
                <span className="font-normal">
                  {items.filter((i) => planBand(i.priority) === band).length}
                </span>
              </div>
              <div className={GRID}>{columns(band)}</div>
            </div>
          ))}
        </div>
      ) : (
        <div className={GRID}>{columns()}</div>
      )}
      <DragOverlay>
        {activeId ? (
          <div className="rounded-md border border-border bg-background px-2 py-1 text-xs shadow-lg">
            {items.find((i) => i.id === activeId)?.title || 'Untitled'}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}

function BoardColumn({
  status,
  droppableId,
  items,
  total,
  limit,
  onLimitChange,
  onOpen,
  patch,
  diagnostic,
}: {
  status: PlanStatus
  droppableId: string
  items: PlanItem[]
  total: number
  limit?: number
  onLimitChange?: (n: number) => void
  onOpen: (id: string) => void
  patch: PatchFn
  diagnostic: boolean
}) {
  const { setNodeRef, isOver } = useDroppable({ id: droppableId })
  const overLimit = !!limit && limit > 0 && total > limit
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5">
        <StatusChip status={status} />
        <span
          className={
            'text-[11px] tabular-nums ' +
            (overLimit ? 'font-semibold text-red-600 dark:text-red-400' : 'text-muted-foreground')
          }
        >
          {total}
          {limit ? ` / ${limit}` : ''}
        </span>
        {onLimitChange && (
          <input
            type="number"
            min={0}
            value={limit ?? ''}
            onChange={(e) => onLimitChange(Number(e.target.value))}
            placeholder="WIP"
            title="Work-in-progress limit (0 = none)"
            className="ml-auto h-5 w-11 rounded border border-border bg-background px-1 text-[10px] tabular-nums outline-none focus:border-ring"
          />
        )}
      </div>
      <div
        ref={setNodeRef}
        className={
          'min-h-16 space-y-1.5 rounded-md border p-1.5 transition-colors ' +
          (isOver
            ? 'border-primary bg-primary/5'
            : overLimit
              ? 'border-red-500/60 bg-red-500/5'
              : 'border-border')
        }
      >
        <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
          {items.map((item) => (
            <BoardCard
              key={item.id}
              item={item}
              onOpen={onOpen}
              onToggleHidden={
                diagnostic ? (v) => patch('plan_items', item.id, { hidden: v }) : undefined
              }
            />
          ))}
        </SortableContext>
        {items.length === 0 && (
          <p className="py-3 text-center text-[11px] text-muted-foreground">Drop items here</p>
        )}
      </div>
    </div>
  )
}

function BoardCard({
  item,
  onOpen,
  onToggleHidden,
}: {
  item: PlanItem
  onOpen: (id: string) => void
  onToggleHidden?: (v: boolean) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : item.hidden ? 0.5 : 1,
  }
  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-start gap-1 rounded-md border border-border bg-background p-2 shadow-sm"
    >
      {onToggleHidden && (
        <HideToggle hidden={item.hidden} onToggle={onToggleHidden} className="mt-0.5" />
      )}
      <button
        type="button"
        className="mt-0.5 cursor-grab text-muted-foreground/50 hover:text-foreground active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-3.5" />
      </button>
      <button type="button" onClick={() => onOpen(item.id)} className="min-w-0 flex-1 text-left">
        <p className="truncate text-xs font-medium">{item.title || 'Untitled'}</p>
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          <StatusChip status={item.status} />
          <PriorityBadge n={item.priority} />
        </div>
      </button>
    </div>
  )
}

function PlanItemModal({
  item,
  patch,
  del,
  onClose,
}: {
  item: PlanItem
  patch: PatchFn
  del: ReturnType<typeof useProjectData.getState>['del']
  onClose: () => void
}) {
  const { add: addRow, del: delRow } = useProjectData()
  const confirm = useConfirm()
  const commentRows = useProjectData((s) => s.rows.plan_comments)
  const comments = asPlanComments(commentRows)
    .filter((c) => c.plan_item_id === item.id)
    .sort((a, b) => (a.created_at < b.created_at ? -1 : 1))
  const email = useAuth((s) => s.user?.email ?? 'unknown')
  const [desc, setDesc, descStatus] = useDebouncedSave(item.description, async (v) => {
    await patch('plan_items', item.id, { description: v })
  })
  const [cText, setCText] = useState('')
  const [busy, setBusy] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const uploadPhoto = async (file: File) => {
    setBusy(true)
    setUploadError(null)
    const ext = file.name.split('.').pop() || 'png'
    const path = `${item.project_id}/${item.id}/${Date.now()}.${ext}`
    const { error } = await supabase.storage
      .from('plan-media')
      .upload(path, file, { upsert: true, cacheControl: '3600' })
    if (error) {
      setUploadError(error.message)
      setBusy(false)
      return
    }
    const { data } = supabase.storage.from('plan-media').getPublicUrl(path)
    await patch('plan_items', item.id, { photos: [...item.photos, { url: data.publicUrl }] })
    setBusy(false)
  }

  return (
    <DialogContent size="lg" aria-describedby={undefined}>
      <DialogHeader>
        <DialogTitle className="sr-only">{item.title || 'Plan item'}</DialogTitle>
        <EditableText
          value={item.title}
          placeholder="Title"
          onSave={(v) => patch('plan_items', item.id, { title: v })}
          className="!text-base font-semibold"
        />
      </DialogHeader>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="text-[11px] font-medium uppercase text-muted-foreground">Status</span>
          <Select
            value={item.status}
            onChange={(e) => patch('plan_items', item.id, { status: e.target.value })}
            className="mt-1 w-full"
          >
            {PLAN_STATUSES.map((s) => (
              <option key={s} value={s}>
                {PLAN_STATUS_LABEL[s]}
              </option>
            ))}
          </Select>
        </label>
        <label className="block">
          <span className="text-[11px] font-medium uppercase text-muted-foreground">
            Priority · {item.priority}/10
          </span>
          <input
            type="range"
            min={0}
            max={10}
            value={item.priority}
            onChange={(e) => patch('plan_items', item.id, { priority: Number(e.target.value) })}
            className="mt-2 w-full accent-[var(--primary)]"
          />
        </label>
        <label className="block">
          <span className="text-[11px] font-medium uppercase text-muted-foreground">Start date</span>
          <Input
            type="date"
            value={item.start_date ?? ''}
            onChange={(e) => patch('plan_items', item.id, { start_date: e.target.value || null })}
            className="mt-1"
          />
        </label>
        <label className="block">
          <span className="text-[11px] font-medium uppercase text-muted-foreground">Due date</span>
          <Input
            type="date"
            value={item.due_date ?? ''}
            onChange={(e) => patch('plan_items', item.id, { due_date: e.target.value || null })}
            className="mt-1"
          />
        </label>
      </div>

      <label className="block">
        <span className="text-[11px] font-medium uppercase text-muted-foreground">
          Description {descStatus !== 'idle' && <em className="not-italic text-primary">· {descStatus}</em>}
        </span>
        <textarea
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          rows={4}
          className="mt-1 w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
          placeholder="Full description…"
        />
      </label>

      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-medium uppercase text-muted-foreground">
            Photos · {item.photos.length}
          </span>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={busy}
            className="inline-flex h-6 items-center gap-1 rounded-md border border-border px-1.5 text-xs hover:bg-muted disabled:opacity-50"
          >
            {busy ? <Loader2 className="size-3 animate-spin" /> : <PhotoIcon size={12} />} Upload
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) void uploadPhoto(file)
              e.target.value = ''
            }}
          />
        </div>
        {uploadError && <p className="text-xs text-destructive">{uploadError}</p>}
        {item.photos.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {item.photos.map((p, i) => (
              <div key={i} className="group relative">
                <a href={p.url} target="_blank" rel="noreferrer">
                  <img
                    src={p.url}
                    alt={p.caption ?? ''}
                    className="size-16 rounded-md border border-border object-cover"
                  />
                </a>
                <button
                  type="button"
                  onClick={() =>
                    patch('plan_items', item.id, {
                      photos: item.photos.filter((_, j) => j !== i),
                    })
                  }
                  className="absolute -right-1.5 -top-1.5 hidden rounded-full bg-destructive p-0.5 text-white group-hover:block"
                >
                  <XMarkIcon size={10} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-1.5">
        <span className="text-[11px] font-medium uppercase text-muted-foreground">
          Comments · {comments.length}
        </span>
        <div className="space-y-1">
          {comments.map((c) => (
            <div key={c.id} className="group flex items-start gap-2 text-sm">
              <span className="mt-0.5 shrink-0 text-xs text-muted-foreground">
                {c.author.split('@')[0]}
              </span>
              <span className="min-w-0 flex-1 whitespace-pre-wrap">{c.body}</span>
              <IconButton
                onClick={() => delRow('plan_comments', c.id)}
                className="opacity-0 group-hover:opacity-100 hover:text-destructive"
              >
                <TrashIcon size={12} />
              </IconButton>
            </div>
          ))}
          {comments.length === 0 && <p className="text-xs text-muted-foreground">No comments yet.</p>}
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (!cText.trim()) return
            addRow('plan_comments', { plan_item_id: item.id, author: email, body: cText.trim() })
            setCText('')
          }}
          className="flex gap-1.5"
        >
          <Input value={cText} onChange={(e) => setCText(e.target.value)} placeholder="Add a comment…" />
          <button className="h-7 shrink-0 rounded-md bg-primary px-2 text-xs font-medium text-primary-foreground hover:bg-primary/90">
            Post
          </button>
        </form>
      </div>

      <div className="flex justify-end border-t border-border pt-3">
        <button
          type="button"
          onClick={async () => {
            if (await confirm({ title: 'Delete this plan item?' })) {
              del('plan_items', item.id)
              onClose()
            }
          }}
          className="inline-flex h-7 items-center gap-1 rounded-md px-2 text-xs text-muted-foreground hover:bg-muted hover:text-destructive"
        >
          <TrashIcon size={12} /> Delete
        </button>
      </div>
    </DialogContent>
  )
}
