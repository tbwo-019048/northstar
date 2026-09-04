import { Fragment, useMemo, useState } from 'react'
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useDroppable } from '@dnd-kit/core'
import { ChevronRight, GripVertical, Paperclip, Plus, Trash2, X } from 'lucide-react'
import { useProjectData, asTodos, asTodoComments } from '@/store/useProjectData'
import { useAuth } from '@/store/useAuth'
import { PRIORITIES, TODO_TYPES, type Todo, type TodoStatus } from '@/lib/types'
import { Chip, EditableText, IconButton, Input, Select } from '@/components/ui-lite'
import { useDebouncedSave } from '@/hooks/useDebouncedSave'

export function TodoTab({ projectId }: { projectId: string }) {
  const rows = useProjectData((s) => s.rows.todos)
  const { add, patch, del, reorder } = useProjectData()
  const todos = asTodos(rows)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)

  const lists = useMemo(() => {
    const by = (st: TodoStatus) =>
      todos.filter((t) => t.status === st).sort((a, b) => a.sort - b.sort)
    return { todo: by('todo'), completed: by('completed') }
  }, [todos])

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }))

  const findList = (id: string): TodoStatus | null => {
    if (id === 'todo' || id === 'completed') return id
    const t = todos.find((x) => x.id === id)
    return t ? t.status : null
  }

  const onDragStart = (e: DragStartEvent) => setActiveId(String(e.active.id))

  const onDragEnd = (e: DragEndEvent) => {
    setActiveId(null)
    const { active, over } = e
    if (!over) return
    const activeIdStr = String(active.id)
    const from = findList(activeIdStr)
    const to = findList(String(over.id))
    if (!from || !to) return

    const moved = todos.find((t) => t.id === activeIdStr)
    if (!moved) return

    const target = lists[to].filter((t) => t.id !== activeIdStr)
    const overIdx =
      over.id === to ? target.length : target.findIndex((t) => t.id === String(over.id))
    const insertAt = overIdx < 0 ? target.length : overIdx
    target.splice(insertAt, 0, moved)

    if (from !== to) {
      patch('todos', activeIdStr, { status: to })
      reorder('todos', lists[from].filter((t) => t.id !== activeIdStr))
    }
    reorder('todos', target)
  }

  const addTodo = () =>
    add('todos', {
      project_id: projectId,
      title: 'New item',
      status: 'todo',
      priority: 'medium',
      type: 'feature',
      sort: lists.todo.length,
    })

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
    >
      <div className="space-y-4">
        <TodoList
          id="todo"
          title="To do"
          items={lists.todo}
          expanded={expanded}
          setExpanded={setExpanded}
          patch={patch}
          del={del}
          onAdd={addTodo}
        />
        <TodoList
          id="completed"
          title="Completed"
          items={lists.completed}
          expanded={expanded}
          setExpanded={setExpanded}
          patch={patch}
          del={del}
          dim
        />
      </div>
      <DragOverlay>
        {activeId ? (
          <div className="rounded-md border border-border bg-background px-2 py-1 text-sm shadow-lg">
            {todos.find((t) => t.id === activeId)?.title}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}

type PatchFn = ReturnType<typeof useProjectData.getState>['patch']
type DelFn = ReturnType<typeof useProjectData.getState>['del']

function TodoList({
  id,
  title,
  items,
  expanded,
  setExpanded,
  patch,
  del,
  onAdd,
  dim,
}: {
  id: TodoStatus
  title: string
  items: Todo[]
  expanded: string | null
  setExpanded: (v: string | null) => void
  patch: PatchFn
  del: DelFn
  onAdd?: () => void
  dim?: boolean
}) {
  const { setNodeRef, isOver } = useDroppable({ id })
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {title} · {items.length}
        </h2>
        {onAdd && (
          <button
            type="button"
            onClick={onAdd}
            className="inline-flex h-6 items-center gap-1 rounded-md border border-border px-1.5 text-xs hover:bg-muted"
          >
            <Plus className="size-3" /> Add
          </button>
        )}
      </div>
      <div
        ref={setNodeRef}
        className={
          'overflow-hidden rounded-md border transition-colors ' +
          (isOver ? 'border-primary bg-primary/5' : 'border-border') +
          (dim ? ' opacity-90' : '')
        }
      >
        <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
          <table className="w-full text-sm">
            <tbody>
              {items.map((t) => (
                <TodoRow
                  key={t.id}
                  todo={t}
                  open={expanded === t.id}
                  toggle={() => setExpanded(expanded === t.id ? null : t.id)}
                  patch={patch}
                  del={del}
                />
              ))}
              {items.length === 0 && (
                <tr>
                  <td className="px-2 py-5 text-center text-xs text-muted-foreground">
                    Drop items here
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </SortableContext>
      </div>
    </div>
  )
}

function TodoRow({
  todo,
  open,
  toggle,
  patch,
  del,
}: {
  todo: Todo
  open: boolean
  toggle: () => void
  patch: PatchFn
  del: DelFn
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: todo.id,
  })
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }

  return (
    <Fragment>
      <tr ref={setNodeRef} style={style} className="border-b border-border last:border-0 hover:bg-muted/30">
        <td className="w-6 px-1">
          <button
            type="button"
            className="cursor-grab text-muted-foreground/60 hover:text-foreground active:cursor-grabbing"
            {...attributes}
            {...listeners}
          >
            <GripVertical className="size-3.5" />
          </button>
        </td>
        <td className="w-6 px-0">
          <IconButton onClick={toggle}>
            <ChevronRight className={'size-3.5 transition-transform ' + (open ? 'rotate-90' : '')} />
          </IconButton>
        </td>
        <td className="w-24 px-1 py-0.5">
          <Select
            value={todo.priority}
            onChange={(e) => patch('todos', todo.id, { priority: e.target.value })}
            className="h-5 w-full border-0 bg-transparent px-0"
          >
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </Select>
        </td>
        <td className="w-24 px-1 py-0.5">
          <Select
            value={todo.type}
            onChange={(e) => patch('todos', todo.id, { type: e.target.value })}
            className="h-5 w-full border-0 bg-transparent px-0"
          >
            {TODO_TYPES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </Select>
        </td>
        <td className="px-1 py-0.5">
          <EditableText
            value={todo.title}
            onSave={(v) => patch('todos', todo.id, { title: v })}
            className="font-medium"
          />
          <EditableText
            value={todo.subtitle}
            placeholder="add subtitle…"
            onSave={(v) => patch('todos', todo.id, { subtitle: v })}
            className="text-xs text-muted-foreground"
          />
        </td>
        <td className="w-16 px-1 py-0.5 text-right">
          <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
            {todo.attachments.length > 0 && (
              <>
                <Paperclip className="size-3" />
                {todo.attachments.length}
              </>
            )}
          </span>
        </td>
        <td className="w-8 px-1">
          <IconButton
            onClick={() => del('todos', todo.id)}
            className="hover:text-destructive"
          >
            <Trash2 className="size-3.5" />
          </IconButton>
        </td>
      </tr>
      {open && (
        <tr className="border-b border-border bg-muted/20">
          <td colSpan={7} className="px-3 py-2">
            <TodoDetail todo={todo} patch={patch} />
          </td>
        </tr>
      )}
    </Fragment>
  )
}

function TodoDetail({ todo, patch }: { todo: Todo; patch: PatchFn }) {
  const commentRows = useProjectData((s) => s.rows.todo_comments)
  const { add, del } = useProjectData()
  const email = useAuth((s) => s.user?.email ?? 'unknown')
  const comments = asTodoComments(commentRows).filter((c) => c.todo_id === todo.id)
  const [desc, setDesc, status] = useDebouncedSave(todo.description, async (v) => {
    await patch('todos', todo.id, { description: v })
  })
  const [cText, setCText] = useState('')
  const [aName, setAName] = useState('')
  const [aUrl, setAUrl] = useState('')

  const addAttachment = (e: React.FormEvent) => {
    e.preventDefault()
    if (!aUrl.trim()) return
    patch('todos', todo.id, {
      attachments: [...todo.attachments, { name: aName.trim() || aUrl.trim(), url: aUrl.trim() }],
    })
    setAName('')
    setAUrl('')
  }

  return (
    <div className="grid gap-3 md:grid-cols-2">
      <div className="space-y-1">
        <span className="text-[11px] font-medium uppercase text-muted-foreground">
          Description {status !== 'idle' && <em className="not-italic text-primary">· {status}</em>}
        </span>
        <textarea
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          rows={4}
          className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
          placeholder="Full description…"
        />
        <div className="space-y-1 pt-1">
          <span className="text-[11px] font-medium uppercase text-muted-foreground">
            Attachments
          </span>
          {todo.attachments.map((a, i) => (
            <div key={i} className="flex items-center gap-1.5 text-xs">
              <Paperclip className="size-3 text-muted-foreground" />
              <a href={a.url} target="_blank" rel="noreferrer" className="flex-1 truncate text-link underline">
                {a.name}
              </a>
              <IconButton
                onClick={() =>
                  patch('todos', todo.id, {
                    attachments: todo.attachments.filter((_, j) => j !== i),
                  })
                }
                className="hover:text-destructive"
              >
                <X className="size-3" />
              </IconButton>
            </div>
          ))}
          <form onSubmit={addAttachment} className="flex gap-1">
            <Input value={aName} onChange={(e) => setAName(e.target.value)} placeholder="label" className="w-24" />
            <Input value={aUrl} onChange={(e) => setAUrl(e.target.value)} placeholder="https://… (image or file URL)" />
            <button className="h-7 shrink-0 rounded-md border border-border px-2 text-xs hover:bg-muted">
              Add
            </button>
          </form>
        </div>
      </div>

      <div className="space-y-1">
        <span className="text-[11px] font-medium uppercase text-muted-foreground">
          Comments · {comments.length}
        </span>
        <div className="space-y-1">
          {comments.map((c) => (
            <div key={c.id} className="group flex items-start gap-2 text-sm">
              <span className="mt-0.5 text-xs text-muted-foreground">{c.author.split('@')[0]}</span>
              <span className="flex-1">{c.body}</span>
              <IconButton
                onClick={() => del('todo_comments', c.id)}
                className="opacity-0 group-hover:opacity-100 hover:text-destructive"
              >
                <Trash2 className="size-3" />
              </IconButton>
            </div>
          ))}
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (!cText.trim()) return
            add('todo_comments', { todo_id: todo.id, author: email, body: cText.trim() })
            setCText('')
          }}
          className="flex gap-1.5"
        >
          <Input value={cText} onChange={(e) => setCText(e.target.value)} placeholder="Add a comment…" />
          <button className="h-7 shrink-0 rounded-md bg-primary px-2 text-xs font-medium text-primary-foreground hover:bg-primary/90">
            Post
          </button>
        </form>

        <div className="flex flex-wrap gap-1 pt-1">
          <Chip tone="priority">{todo.priority}</Chip>
          <Chip tone="type">{todo.type}</Chip>
        </div>
      </div>
    </div>
  )
}
