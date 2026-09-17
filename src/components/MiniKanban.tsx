import { useState, type ReactNode } from 'react'
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
import { GripVertical } from 'lucide-react'

export interface MiniKanbanColumn {
  id: string
  label: string
}

interface MiniKanbanProps<T extends { id: string }> {
  columns: MiniKanbanColumn[]
  items: T[]
  getColumn: (item: T) => string
  onMove: (id: string, toColumn: string) => void
  onReorder: (columnId: string, ordered: T[]) => void
  renderCard: (item: T) => ReactNode
  onCardClick?: (item: T) => void
}

/** A trimmed 3(ish)-column drag-and-drop board — same dnd-kit mechanics as
 * PlanningTab's BoardView, without swimlanes/WIP limits/timeline toggle, and
 * generic over whatever columns/items the caller passes. Used by the simple
 * Planning variant and by Grand Tour's Locations board. */
export function MiniKanban<T extends { id: string }>({
  columns,
  items,
  getColumn,
  onMove,
  onReorder,
  renderCard,
  onCardClick,
}: MiniKanbanProps<T>) {
  const [activeId, setActiveId] = useState<string | null>(null)
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }))
  const columnIds = new Set(columns.map((c) => c.id))

  const byColumn = new Map<string, T[]>(columns.map((c) => [c.id, []]))
  for (const item of items) {
    const col = getColumn(item)
    byColumn.get(col)?.push(item)
  }

  const locateColumn = (overId: string): string | null => {
    if (columnIds.has(overId)) return overId
    const found = items.find((i) => i.id === overId)
    return found ? getColumn(found) : null
  }

  const onDragStart = (e: DragStartEvent) => setActiveId(String(e.active.id))

  const onDragEnd = (e: DragEndEvent) => {
    setActiveId(null)
    const { active, over } = e
    if (!over) return
    const activeId = String(active.id)
    const moved = items.find((i) => i.id === activeId)
    const destColumn = locateColumn(String(over.id))
    if (!moved || !destColumn) return
    const fromColumn = getColumn(moved)

    if (destColumn !== fromColumn) onMove(activeId, destColumn)

    const destList = (byColumn.get(destColumn) ?? []).filter((i) => i.id !== activeId)
    const overItem = items.find((i) => i.id === String(over.id))
    const idx = overItem ? destList.findIndex((i) => i.id === overItem.id) : -1
    destList.splice(idx < 0 ? destList.length : idx, 0, moved)
    onReorder(destColumn, destList)
  }

  const activeItem = activeId ? items.find((i) => i.id === activeId) : null

  return (
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={onDragStart} onDragEnd={onDragEnd}>
      <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
        {columns.map((column) => (
          <MiniKanbanColumnView
            key={column.id}
            column={column}
            items={byColumn.get(column.id) ?? []}
            renderCard={renderCard}
            onCardClick={onCardClick}
          />
        ))}
      </div>
      <DragOverlay>
        {activeItem ? (
          <div className="rounded-md border border-border bg-background px-2 py-1 text-xs shadow-lg">
            {renderCard(activeItem)}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}

function MiniKanbanColumnView<T extends { id: string }>({
  column,
  items,
  renderCard,
  onCardClick,
}: {
  column: MiniKanbanColumn
  items: T[]
  renderCard: (item: T) => ReactNode
  onCardClick?: (item: T) => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id })
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {column.label}
        <span className="font-normal">{items.length}</span>
      </div>
      <div
        ref={setNodeRef}
        className={
          'min-h-16 space-y-1.5 rounded-md border p-1.5 transition-colors ' +
          (isOver ? 'border-primary bg-primary/5' : 'border-border')
        }
      >
        <SortableContext items={items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
          {items.map((item) => (
            <MiniKanbanCard key={item.id} item={item} onClick={onCardClick}>
              {renderCard(item)}
            </MiniKanbanCard>
          ))}
        </SortableContext>
        {items.length === 0 && <p className="py-3 text-center text-[11px] text-muted-foreground">Drop items here</p>}
      </div>
    </div>
  )
}

function MiniKanbanCard<T extends { id: string }>({
  item,
  onClick,
  children,
}: {
  item: T
  onClick?: (item: T) => void
  children: ReactNode
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id })
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }
  return (
    <div ref={setNodeRef} style={style} className="flex items-start gap-1 rounded-md border border-border bg-background p-2 shadow-sm">
      <button
        type="button"
        className="mt-0.5 cursor-grab text-muted-foreground/50 hover:text-foreground active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-3.5" />
      </button>
      {onClick ? (
        <button type="button" onClick={() => onClick(item)} className="min-w-0 flex-1 text-left">
          {children}
        </button>
      ) : (
        <div className="min-w-0 flex-1">{children}</div>
      )}
    </div>
  )
}
