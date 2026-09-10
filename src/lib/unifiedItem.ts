import {
  planBand,
  PLAN_STATUS_LABEL,
  type PlanItem,
  type PlanStatus,
  type Priority,
  type Project,
  type Todo,
  type TodoStatus,
} from '@/lib/types'

/**
 * The Items page surfaces two different underlying records — `todos` and
 * `plan_items` — in one table. This module normalises both into a single
 * `UnifiedItem` shape and owns everything that has to reason across the two
 * sources: field mapping, priority ranking, lifecycle predicates and sort
 * comparators. Nothing here touches React or Supabase.
 */

export type ItemSource = 'todo' | 'plan'
export type Completion = 'active' | 'done' | 'all'
export type PriorityBand = 'urgent' | 'high' | 'medium' | 'low'

export interface UnifiedItem {
  source: ItemSource
  id: string
  key: string // `${source}:${id}` — React key + comment-map key
  projectId: string
  title: string
  subtitle: string | null // todo only
  description: string
  status: TodoStatus | PlanStatus
  statusLabel: string
  done: boolean // terminal: todo 'completed' | plan 'completed' | 'failed'
  ready: boolean // actionable: todo 'todo' | plan 'requested' | 'in_progress'
  priorityRank: number // 0..10, comparable across sources (higher = hotter)
  priorityBand: PriorityBand
  priorityLabel: string
  todoPriority: Priority | null
  planPriority: number | null // 0..10
  type: string | null // todo only
  startDate: string | null // plan only
  dueDate: string | null // plan only
  createdAt: string
  updatedAt: string
  hidden: boolean
}

export const TODO_PRIORITY_RANK: Record<Priority, number> = {
  urgent: 9,
  high: 7,
  medium: 4,
  low: 1,
}

export const TODO_STATUS_LABEL: Record<TodoStatus, string> = {
  todo: 'To-Do',
  completed: 'Completed',
}

/** Plan-status → chip class. Kept here so the Items page doesn't fork a third
 * copy; `PlanningTab`'s private `STATUS_CLASS` is intentionally left alone. */
export const PLAN_STATUS_CHIP: Record<PlanStatus, string> = {
  requested: 'bg-sky-500/15 text-sky-600 dark:text-sky-400',
  in_progress: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
  delayed: 'bg-orange-500/15 text-orange-600 dark:text-orange-400',
  completed: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
  failed: 'bg-red-500/15 text-red-600 dark:text-red-400',
}

export const TODO_STATUS_CHIP: Record<TodoStatus, string> = {
  todo: 'bg-sky-500/15 text-sky-600 dark:text-sky-400',
  completed: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
}

const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s)

export function toUnifiedFromTodo(t: Todo): UnifiedItem {
  return {
    source: 'todo',
    id: t.id,
    key: `todo:${t.id}`,
    projectId: t.project_id,
    title: t.title,
    subtitle: t.subtitle || null,
    description: t.description,
    status: t.status,
    statusLabel: TODO_STATUS_LABEL[t.status],
    done: t.status === 'completed',
    ready: t.status === 'todo',
    priorityRank: TODO_PRIORITY_RANK[t.priority] ?? 0,
    priorityBand: t.priority,
    priorityLabel: cap(t.priority),
    todoPriority: t.priority,
    planPriority: null,
    type: t.type || null,
    startDate: null,
    dueDate: null,
    createdAt: t.created_at,
    updatedAt: t.updated_at,
    hidden: t.hidden ?? false,
  }
}

export function toUnifiedFromPlan(p: PlanItem): UnifiedItem {
  return {
    source: 'plan',
    id: p.id,
    key: `plan:${p.id}`,
    projectId: p.project_id,
    title: p.title,
    subtitle: null,
    description: p.description,
    status: p.status,
    statusLabel: PLAN_STATUS_LABEL[p.status],
    done: p.status === 'completed' || p.status === 'failed',
    ready: p.status === 'requested' || p.status === 'in_progress',
    priorityRank: p.priority,
    priorityBand: planBand(p.priority),
    priorityLabel: `${p.priority}/10`,
    todoPriority: null,
    planPriority: p.priority,
    type: null,
    startDate: p.start_date,
    dueDate: p.due_date,
    createdAt: p.created_at,
    updatedAt: p.updated_at,
    hidden: p.hidden ?? false,
  }
}

export function matchesCompletion(item: UnifiedItem, c: Completion): boolean {
  if (c === 'active') return !item.done
  if (c === 'done') return item.done
  return true
}

// Sorting -----------------------------------------------------------------

export type SortKey =
  | 'updated'
  | '-updated'
  | 'project'
  | 'state'
  | 'priority'
  | 'title'
  | 'due'

export interface SortCtx {
  projectsById: Map<string, Project>
}

type Cmp = (a: UnifiedItem, b: UnifiedItem, ctx: SortCtx) => number

/** Lower = closer to "being worked on right now". */
const STATE_ORDER: Record<string, number> = {
  in_progress: 0,
  requested: 1,
  todo: 2,
  delayed: 3,
  failed: 4,
  completed: 5,
}

const byUpdatedDesc: Cmp = (a, b) => b.updatedAt.localeCompare(a.updatedAt)

export const SORTS: Record<SortKey, { label: string; cmp: Cmp }> = {
  updated: { label: 'Recently updated', cmp: byUpdatedDesc },
  '-updated': { label: 'Oldest updated', cmp: (a, b) => a.updatedAt.localeCompare(b.updatedAt) },
  project: {
    label: 'Project',
    cmp: (a, b, ctx) => {
      const an = ctx.projectsById.get(a.projectId)?.name ?? ''
      const bn = ctx.projectsById.get(b.projectId)?.name ?? ''
      if (an !== bn) {
        if (!an) return 1
        if (!bn) return -1
        return an.localeCompare(bn)
      }
      return byUpdatedDesc(a, b, ctx)
    },
  },
  state: {
    label: 'State',
    cmp: (a, b, ctx) => {
      const d = (STATE_ORDER[a.status] ?? 9) - (STATE_ORDER[b.status] ?? 9)
      if (d) return d
      if (a.priorityRank !== b.priorityRank) return b.priorityRank - a.priorityRank
      return byUpdatedDesc(a, b, ctx)
    },
  },
  priority: {
    label: 'Priority',
    cmp: (a, b, ctx) => {
      if (a.priorityRank !== b.priorityRank) return b.priorityRank - a.priorityRank
      return byUpdatedDesc(a, b, ctx)
    },
  },
  title: {
    label: 'Item title',
    cmp: (a, b, ctx) => {
      if (!a.title && !b.title) return 0
      if (!a.title) return 1
      if (!b.title) return -1
      const d = a.title.localeCompare(b.title, undefined, { sensitivity: 'base' })
      return d || byUpdatedDesc(a, b, ctx)
    },
  },
  due: {
    label: 'Due date',
    cmp: (a, b, ctx) => {
      if (a.dueDate && b.dueDate) return a.dueDate.localeCompare(b.dueDate) || byUpdatedDesc(a, b, ctx)
      if (a.dueDate) return -1
      if (b.dueDate) return 1
      return byUpdatedDesc(a, b, ctx)
    },
  },
}

export const SORT_KEYS = Object.keys(SORTS) as SortKey[]
