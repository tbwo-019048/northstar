import { useEffect, useMemo, useState } from 'react'
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
import { GripVertical } from 'lucide-react'
import { CheckCircleIcon } from '@/components/ui/check-circle'
import { CheckIcon } from '@/components/ui/check'
import { DocumentIcon } from '@/components/ui/document'
import { ArrowDownTrayIcon } from '@/components/ui/arrow-down-tray'
import { PlusIcon } from '@/components/ui/plus'
import { TrashIcon } from '@/components/ui/trash'
import { useProjectData, asPipelines, asPipelineItems } from '@/store/useProjectData'
import { useProjects } from '@/store/useProjects'
import { EditableText, IconButton, Input, Select } from '@/components/ui-lite'
import { useConfirm } from '@/store/useConfirm'
import type { PipelineItem, Project } from '@/lib/types'

export function PipelineTab({ project }: { project: Project }) {
  const projectId = project.id
  const { update: updateProject } = useProjects()
  const pipeRows = useProjectData((s) => s.rows.pipelines)
  const itemRows = useProjectData((s) => s.rows.pipeline_items)
  const { add, patch, del, reorder } = useProjectData()
  const confirm = useConfirm()
  const pipelines = asPipelines(pipeRows).sort((a, b) => a.sort - b.sort)
  const items = asPipelineItems(itemRows)

  const active = pipelines.filter((p) => p.status === 'active')
  const archived = pipelines.filter((p) => p.status !== 'active')
  const [selected, setSelected] = useState<string | null>(null)
  const [focusId, setFocusId] = useState<string | null>(null)

  useEffect(() => {
    if (!selected || !pipelines.some((p) => p.id === selected)) {
      setSelected(active[0]?.id ?? pipelines[0]?.id ?? null)
    }
  }, [pipelines, active, selected])

  const current = pipelines.find((p) => p.id === selected) ?? null
  const currentItems = useMemo(
    () => items.filter((i) => i.pipeline_id === selected).sort((a, b) => a.sort - b.sort),
    [items, selected],
  )
  const autoEstimate = currentItems.reduce((sum, i) => sum + (i.estimate_hours || 0), 0)
  const estimateHours =
    current && current.estimate_manual ? current.estimate_hours || 0 : autoEstimate

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }))

  const newPipeline = async () => {
    const p = await add('pipelines', {
      project_id: projectId,
      name: `Pipeline ${pipelines.length + 1}`,
      status: 'active',
      sort: pipelines.length,
    })
    if (p) setSelected((p as { id: string }).id)
  }

  const addItem = async () => {
    if (!current) return
    const created = (await add('pipeline_items', {
      pipeline_id: current.id,
      body: '',
      sort: currentItems.length,
    })) as PipelineItem | null
    if (created) setFocusId(created.id)
  }

  /** Insert a fresh bullet right after `afterId` (Enter inside a point). */
  const addItemAfter = async (afterId: string) => {
    if (!current) return
    const idx = currentItems.findIndex((i) => i.id === afterId)
    const created = (await add('pipeline_items', {
      pipeline_id: current.id,
      body: '',
      sort: currentItems.length,
    })) as PipelineItem | null
    if (!created) return
    const withNew = [...currentItems]
    withNew.splice(idx + 1, 0, created)
    await reorder('pipeline_items', withNew)
    setFocusId(created.id)
  }

  const onDragEnd = (e: DragEndEvent) => {
    const { active: a, over } = e
    if (!over || a.id === over.id) return
    const oldI = currentItems.findIndex((i) => i.id === a.id)
    const newI = currentItems.findIndex((i) => i.id === over.id)
    reorder('pipeline_items', arrayMove(currentItems, oldI, newI))
  }

  const pipelineText = () =>
    !current
      ? ''
      : `# ${current.name}\n\n` +
        currentItems.map((i) => `- [${i.done ? 'x' : ' '}] ${i.body}`).join('\n') +
        '\n'

  const exportTxt = () => {
    if (!current) return
    const blob = new Blob([pipelineText()], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${current.name.replace(/\s+/g, '-').toLowerCase()}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  const [copied, setCopied] = useState(false)
  const copyToClipboard = async () => {
    if (!current) return
    try {
      await navigator.clipboard.writeText(pipelineText())
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      /* clipboard blocked — ignore */
    }
  }

  const completePipeline = async () => {
    if (!current) return
    const estimate = estimateHours
    const hoursNote = estimate > 0 ? ` and ${estimate}h added to the project total` : ''
    if (
      !(await confirm({
        title: `Complete "${current.name}"?`,
        message: `Its ${currentItems.length} points move to Features${hoursNote}.`,
        confirmLabel: 'Complete',
        tone: 'default',
      }))
    )
      return
    for (const it of currentItems) {
      if (!it.body.trim()) continue
      await add('features', {
        project_id: projectId,
        title: it.body.trim(),
        source: 'pipeline',
        sort: 0,
      })
    }
    await patch('pipelines', current.id, {
      status: 'completed',
      completed_at: new Date().toISOString(),
    })
    if (estimate > 0) {
      await updateProject(projectId, { hours_worked: (project.hours_worked || 0) + estimate })
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-1.5">
        {active.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setSelected(p.id)}
            className={
              'h-7 rounded-md border px-2 text-xs font-medium ' +
              (selected === p.id
                ? 'border-primary bg-primary/10 text-foreground'
                : 'border-border text-muted-foreground hover:bg-muted')
            }
          >
            {p.name}
          </button>
        ))}
        <button
          type="button"
          onClick={newPipeline}
          className="inline-flex h-7 items-center gap-1 rounded-md border border-dashed border-border px-2 text-xs hover:bg-muted"
        >
          <PlusIcon size={12} /> New pipeline
        </button>
        {archived.length > 0 && (
          <Select
            value=""
            onChange={(e) => e.target.value && setSelected(e.target.value)}
            className="ml-auto"
          >
            <option value="">Past pipelines…</option>
            {archived.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.status})
              </option>
            ))}
          </Select>
        )}
      </div>

      {current ? (
        <div className="space-y-2 rounded-md border border-border p-2">
          <div className="flex items-center gap-2">
            <EditableText
              value={current.name}
              onSave={(v) => patch('pipelines', current.id, { name: v })}
              className="font-semibold"
            />
            {current.status !== 'active' && (
              <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] uppercase text-muted-foreground">
                {current.status}
              </span>
            )}
            <div className="flex-1" />
            <label className="flex items-center gap-1 text-[11px] text-muted-foreground">
              Estimate
              <Input
                type="number"
                step="0.25"
                min="0"
                disabled={current.status !== 'active'}
                value={estimateHours}
                onChange={(e) =>
                  patch('pipelines', current.id, {
                    estimate_hours: Number(e.target.value) || 0,
                    estimate_manual: true,
                  })
                }
                className="h-6 w-16"
                title={
                  current.estimate_manual
                    ? 'Manual estimate — overrides the sum of point times'
                    : 'Auto: sum of point times'
                }
              />
              h
              {current.estimate_manual && current.status === 'active' && (
                <button
                  type="button"
                  onClick={() =>
                    patch('pipelines', current.id, {
                      estimate_manual: false,
                      estimate_hours: autoEstimate,
                    })
                  }
                  className="text-muted-foreground hover:text-foreground"
                  title={`Reset to the sum of point times (${autoEstimate}h)`}
                >
                  ↺ auto
                </button>
              )}
            </label>
            <button
              type="button"
              onClick={copyToClipboard}
              className="inline-flex h-6 items-center gap-1 rounded-md border border-border px-1.5 text-xs hover:bg-muted"
            >
              {copied ? <CheckIcon size={12} className="text-primary" /> : <DocumentIcon size={12} />}
              {copied ? 'Copied' : 'Copy'}
            </button>
            <button
              type="button"
              onClick={exportTxt}
              className="inline-flex h-6 items-center gap-1 rounded-md border border-border px-1.5 text-xs hover:bg-muted"
            >
              <ArrowDownTrayIcon size={12} /> .txt
            </button>
            {current.status === 'active' && (
              <>
                <button
                  type="button"
                  onClick={addItem}
                  className="inline-flex h-6 items-center gap-1 rounded-md bg-primary px-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
                >
                  <PlusIcon size={12} /> Point
                </button>
                <button
                  type="button"
                  onClick={completePipeline}
                  className="inline-flex h-6 items-center gap-1 rounded-md bg-primary px-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90"
                >
                  <CheckCircleIcon size={12} /> Complete
                </button>
              </>
            )}
          </div>

          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext
              items={currentItems.map((i) => i.id)}
              strategy={verticalListSortingStrategy}
            >
              <ul className="space-y-0.5">
                {currentItems.map((it) => (
                  <PipelineRow
                    key={it.id}
                    item={it}
                    editable={current.status === 'active'}
                    autoFocus={focusId === it.id}
                    patch={(v) => patch('pipeline_items', it.id, v)}
                    remove={() => del('pipeline_items', it.id)}
                    onEnter={() => addItemAfter(it.id)}
                  />
                ))}
              </ul>
            </SortableContext>
          </DndContext>
          {currentItems.length === 0 && (
            <p className="px-1 py-4 text-center text-xs text-muted-foreground">
              No points yet — add the things that need doing next.
            </p>
          )}
        </div>
      ) : (
        <p className="rounded-md border border-dashed border-border px-2 py-8 text-center text-xs text-muted-foreground">
          No pipelines. Create one to start planning what's next.
        </p>
      )}
    </div>
  )
}

function PipelineRow({
  item,
  editable,
  autoFocus,
  patch,
  remove,
  onEnter,
}: {
  item: PipelineItem
  editable: boolean
  autoFocus?: boolean
  patch: (v: Record<string, unknown>) => void
  remove: () => void
  onEnter: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }
  const [draft, setDraft] = useState(item.body)
  useEffect(() => setDraft(item.body), [item.body])

  return (
    <li ref={setNodeRef} style={style} className="group flex items-center gap-1.5">
      {editable && (
        <button
          type="button"
          className="cursor-grab text-muted-foreground/50 hover:text-foreground"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="size-3.5" />
        </button>
      )}
      <input
        type="checkbox"
        checked={item.done}
        onChange={(e) => patch({ done: e.target.checked })}
        className="size-3.5 accent-[var(--primary)]"
      />
      <input
        value={draft}
        disabled={!editable}
        autoFocus={autoFocus}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => draft !== item.body && patch({ body: draft })}
        onKeyDown={(e) => {
          if (e.key !== 'Enter') return
          e.preventDefault()
          if (draft !== item.body) patch({ body: draft })
          onEnter()
        }}
        placeholder="Bullet point…"
        className={
          'h-6 flex-1 rounded border-0 bg-transparent px-1 text-sm outline-none focus:bg-muted/60 ' +
          (item.done ? 'text-muted-foreground line-through' : '')
        }
      />
      <label className="flex shrink-0 items-center gap-0.5 text-[10px] text-muted-foreground">
        <input
          type="number"
          step="0.25"
          min="0"
          disabled={!editable}
          value={item.estimate_hours || 0}
          onChange={(e) => patch({ estimate_hours: Number(e.target.value) || 0 })}
          title="Estimated hours for this point"
          className="h-6 w-12 rounded border border-border bg-background px-1 text-right text-[11px] tabular-nums outline-none focus:border-ring disabled:opacity-60"
        />
        h
      </label>
      {editable && (
        <IconButton onClick={remove} className="opacity-0 group-hover:opacity-100 hover:text-destructive">
          <TrashIcon size={14} />
        </IconButton>
      )}
    </li>
  )
}
