import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import type {
  Detail,
  EnvVar,
  Feature,
  Person,
  PersonColumn,
  PersonComment,
  Pipeline,
  PipelineItem,
  PlanComment,
  PlanItem,
  ProjectAsset,
  ProjectScreenshot,
  RequestItem,
  Todo,
  TodoComment,
} from '@/lib/types'
import { notifySaved, notifySaveError } from '@/store/useChangeNotifications'

type Row = { id: string; [k: string]: unknown }

export type TableName =
  | 'project_people'
  | 'person_comments'
  | 'person_columns'
  | 'env_vars'
  | 'todos'
  | 'todo_comments'
  | 'features'
  | 'details'
  | 'requests'
  | 'pipelines'
  | 'pipeline_items'
  | 'plan_items'
  | 'plan_comments'
  | 'project_screenshots'
  | 'project_assets'

const PROJECT_TABLES: TableName[] = [
  'project_people',
  'person_columns',
  'env_vars',
  'todos',
  'features',
  'details',
  'requests',
  'pipelines',
  'plan_items',
  'project_screenshots',
  'project_assets',
]

interface ProjectDataState {
  projectId: string | null
  loading: boolean
  rows: Record<TableName, Row[]>
  load: (projectId: string) => Promise<void>
  reset: () => void
  add: <T extends Row>(table: TableName, values: Record<string, unknown>) => Promise<T | null>
  patch: (
    table: TableName,
    id: string,
    values: Record<string, unknown>,
  ) => Promise<{ error: string | null }>
  del: (table: TableName, id: string) => Promise<void>
  reorder: (table: TableName, ordered: { id: string }[]) => Promise<void>
  subscribe: (projectId: string) => () => void
}

const empty = (): Record<TableName, Row[]> => ({
  project_people: [],
  person_comments: [],
  person_columns: [],
  env_vars: [],
  todos: [],
  todo_comments: [],
  features: [],
  details: [],
  requests: [],
  pipelines: [],
  pipeline_items: [],
  plan_items: [],
  plan_comments: [],
  project_screenshots: [],
  project_assets: [],
})

// --- Request → Planning → To-Do → Features workflow ----------------------
// A Request is mirrored into a plan item on creation. Moving that plan item
// out of "Requested" to anything except "Failed" (rejected) spawns a To-Do;
// moving it to "Completed" spawns a Feature and closes the To-Do.

const PRIORITY_TO_NUM: Record<string, number> = { urgent: 9, high: 7, medium: 5, low: 2 }
const numToPriority = (n: number): string =>
  n >= 8 ? 'urgent' : n >= 6 ? 'high' : n >= 3 ? 'medium' : 'low'

type Get = () => ProjectDataState

// Timestamp of the last local mutation. The realtime subscription defers its
// reload while this is recent so a burst of edits (e.g. typing in a kanban
// card) doesn't trigger a refetch on every keystroke's autosave.
let lastLocalWrite = 0
const markLocalWrite = () => {
  lastLocalWrite = Date.now()
}

async function mirrorRequestToPlan(get: Get, request: Row) {
  const projectId = get().projectId
  if (!projectId) return
  if (get().rows.plan_items.some((p) => p.source_request_id === request.id)) return
  await get().add('plan_items', {
    project_id: projectId,
    title: (request.title as string) || 'Request',
    description: [request.subtitle, request.notes].filter(Boolean).join('\n\n'),
    status: 'requested',
    priority: PRIORITY_TO_NUM[(request.priority as string) ?? 'medium'] ?? 5,
    source_request_id: request.id,
    sort: get().rows.plan_items.length,
  })
}

/** While a request's plan item is still "Requested" (not yet accepted), keep
 * its title/description in step with edits to the request. */
async function syncRequestEdits(get: Get, requestId: string, values: Record<string, unknown>) {
  const plan = get().rows.plan_items.find((p) => p.source_request_id === requestId)
  if (!plan || plan.status !== 'requested') return
  const patch: Record<string, unknown> = {}
  if (typeof values.title === 'string') patch.title = values.title
  if (typeof values.subtitle === 'string' || typeof values.notes === 'string') {
    const req = get().rows.requests.find((r) => r.id === requestId)
    const subtitle = (values.subtitle ?? req?.subtitle ?? '') as string
    const notes = (values.notes ?? req?.notes ?? '') as string
    patch.description = [subtitle, notes].filter(Boolean).join('\n\n')
  }
  if (Object.keys(patch).length) await get().patch('plan_items', plan.id, patch)
}

async function advancePlanItem(get: Get, planItemId: string, status: string) {
  const projectId = get().projectId
  if (!projectId) return
  const plan = get().rows.plan_items.find((p) => p.id === planItemId)
  if (!plan) return
  const accepted = status !== 'requested' && status !== 'failed'

  if (accepted) {
    const existingTodo = get().rows.todos.find((t) => t.source_plan_item_id === planItemId)
    if (!existingTodo) {
      await get().add('todos', {
        project_id: projectId,
        title: (plan.title as string) || 'Task',
        subtitle: '',
        description: (plan.description as string) ?? '',
        type: 'feature',
        priority: numToPriority((plan.priority as number) ?? 5),
        status: status === 'completed' ? 'completed' : 'todo',
        source_plan_item_id: planItemId,
        sort: get().rows.todos.length,
      })
    } else if (status === 'completed' && existingTodo.status !== 'completed') {
      await get().patch('todos', existingTodo.id, { status: 'completed' })
    }
  }

  if (status === 'completed' && !get().rows.features.some((f) => f.source_plan_item_id === planItemId)) {
    await get().add('features', {
      project_id: projectId,
      title: (plan.title as string) || 'Feature',
      description: (plan.description as string) ?? '',
      source: 'planning',
      source_plan_item_id: planItemId,
      sort: get().rows.features.length,
    })
  }
}

export const useProjectData = create<ProjectDataState>((set, get) => ({
  projectId: null,
  loading: false,
  rows: empty(),

  reset: () => set({ projectId: null, rows: empty(), loading: false }),

  load: async (projectId) => {
    // Keep the current rows on screen while a refetch of the SAME project is in
    // flight — otherwise a realtime-triggered reload blanks everything for a
    // round trip, which unmounts any open modal / drag context ("closing and
    // reopening as if loading"). Only clear when actually switching projects.
    const switching = get().projectId !== projectId
    set({ loading: true, projectId, ...(switching ? { rows: empty() } : {}) })
    const base = await Promise.all(
      PROJECT_TABLES.map((t) =>
        supabase.from(t).select('*').eq('project_id', projectId).order('sort', { ascending: true }),
      ),
    )
    const rows = empty()
    PROJECT_TABLES.forEach((t, i) => {
      rows[t] = (base[i].data as Row[]) ?? []
    })

    const personIds = rows.project_people.map((r) => r.id)
    const todoIds = rows.todos.map((r) => r.id)
    const pipelineIds = rows.pipelines.map((r) => r.id)
    const planIds = rows.plan_items.map((r) => r.id)

    const [pc, tc, pi, plc] = await Promise.all([
      personIds.length
        ? supabase.from('person_comments').select('*').in('person_id', personIds)
        : Promise.resolve({ data: [] }),
      todoIds.length
        ? supabase.from('todo_comments').select('*').in('todo_id', todoIds)
        : Promise.resolve({ data: [] }),
      pipelineIds.length
        ? supabase
            .from('pipeline_items')
            .select('*')
            .in('pipeline_id', pipelineIds)
            .order('sort', { ascending: true })
        : Promise.resolve({ data: [] }),
      planIds.length
        ? supabase.from('plan_comments').select('*').in('plan_item_id', planIds)
        : Promise.resolve({ data: [] }),
    ])
    rows.person_comments = (pc.data as Row[]) ?? []
    rows.todo_comments = (tc.data as Row[]) ?? []
    rows.pipeline_items = (pi.data as Row[]) ?? []
    rows.plan_comments = (plc.data as Row[]) ?? []

    set({ rows, loading: false })
  },

  add: async (table, values) => {
    const { data, error } = await supabase.from(table).insert(values).select('*').single()
    if (error || !data) {
      console.error('[NorthStar] add failed', table, error)
      notifySaveError(error?.message)
      return null
    }
    set((s) => ({ rows: { ...s.rows, [table]: [...s.rows[table], data as Row] } }))
    markLocalWrite()
    notifySaved('Item added.')
    if (table === 'requests') void mirrorRequestToPlan(get, data as Row)
    return data as never
  },

  patch: async (table, id, values) => {
    const previous = get().rows[table]
    set((s) => ({
      rows: {
        ...s.rows,
        [table]: s.rows[table].map((r) => (r.id === id ? { ...r, ...values } : r)),
      },
    }))
    const { error } = await supabase.from(table).update(values).eq('id', id)
    if (error) {
      console.error('[NorthStar] patch failed', table, error)
      set((s) => ({ rows: { ...s.rows, [table]: previous } })) // roll back
      notifySaveError(error.message)
      return { error: error.message }
    }
    markLocalWrite()
    notifySaved()
    if (table === 'plan_items' && typeof values.status === 'string') {
      void advancePlanItem(get, id, values.status)
    }
    if (table === 'requests' && values.status === 'completed') {
      const plan = get().rows.plan_items.find((p) => p.source_request_id === id)
      if (plan && plan.status !== 'completed') {
        void get().patch('plan_items', plan.id, { status: 'completed' })
      }
    }
    if (table === 'requests' && ('title' in values || 'subtitle' in values || 'notes' in values)) {
      void syncRequestEdits(get, id, values)
    }
    return { error: null }
  },

  del: async (table, id) => {
    const previous = get().rows[table]
    set((s) => ({ rows: { ...s.rows, [table]: s.rows[table].filter((r) => r.id !== id) } }))
    const { error } = await supabase.from(table).delete().eq('id', id)
    if (error) {
      console.error('[NorthStar] delete failed', table, error)
      set((s) => ({ rows: { ...s.rows, [table]: previous } }))
      notifySaveError(error.message)
      return
    }
    markLocalWrite()
    notifySaved('Item removed.')
  },

  reorder: async (table, ordered) => {
    const ids = ordered.map((o) => o.id)
    set((s) => {
      const map = new Map(s.rows[table].map((r) => [r.id, r]))
      const moved = ids
        .map((id, i) => {
          const row = map.get(id)
          return row ? { ...row, sort: i } : null
        })
        .filter(Boolean) as Row[]
      const others = s.rows[table].filter((r) => !ids.includes(r.id))
      return { rows: { ...s.rows, [table]: [...others, ...moved] } }
    })
    const results = await Promise.all(ids.map((id, i) => supabase.from(table).update({ sort: i }).eq('id', id)))
    const error = results.find((result) => result.error)?.error
    if (error) notifySaveError(error.message)
    else {
      markLocalWrite()
      notifySaved('Order saved.')
    }
  },

  subscribe: (projectId) => {
    let t: ReturnType<typeof setTimeout> | null = null
    const bump = () => {
      if (get().projectId !== projectId) return
      if (t) clearTimeout(t)
      // Hold off while local edits are still landing, so autosave keystrokes
      // don't each trigger a full refetch.
      const sinceWrite = Date.now() - lastLocalWrite
      const wait = sinceWrite < 1500 ? 1900 - sinceWrite : 400
      t = setTimeout(() => get().load(projectId), wait)
    }
    const ch = supabase.channel(`project-${projectId}`)
    const ALL: TableName[] = [
      'project_people',
      'person_comments',
      'person_columns',
      'env_vars',
      'todos',
      'todo_comments',
      'features',
      'details',
      'requests',
      'pipelines',
      'pipeline_items',
      'plan_items',
      'plan_comments',
      'project_screenshots',
      'project_assets',
    ]
    ALL.forEach((table) =>
      ch.on('postgres_changes', { event: '*', schema: 'public', table }, bump),
    )
    ch.subscribe()
    return () => {
      if (t) clearTimeout(t)
      supabase.removeChannel(ch)
    }
  },
}))

// Typed selectors ----------------------------------------------------------
export const asPeople = (r: Row[]) => r as unknown as Person[]
export const asPersonComments = (r: Row[]) => r as unknown as PersonComment[]
export const asPersonColumns = (r: Row[]) => r as unknown as PersonColumn[]
export const asEnvVars = (r: Row[]) => r as unknown as EnvVar[]
export const asTodos = (r: Row[]) => r as unknown as Todo[]
export const asTodoComments = (r: Row[]) => r as unknown as TodoComment[]
export const asFeatures = (r: Row[]) => r as unknown as Feature[]
export const asDetails = (r: Row[]) => r as unknown as Detail[]
export const asRequests = (r: Row[]) => r as unknown as RequestItem[]
export const asPipelines = (r: Row[]) => r as unknown as Pipeline[]
export const asPipelineItems = (r: Row[]) => r as unknown as PipelineItem[]
export const asPlanItems = (r: Row[]) => r as unknown as PlanItem[]
export const asPlanComments = (r: Row[]) => r as unknown as PlanComment[]
export const asScreenshots = (r: Row[]) => r as unknown as ProjectScreenshot[]
export const asAssets = (r: Row[]) => r as unknown as ProjectAsset[]
