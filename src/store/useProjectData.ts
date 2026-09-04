import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import type {
  Detail,
  Feature,
  Person,
  PersonComment,
  Pipeline,
  PipelineItem,
  RequestItem,
  Todo,
  TodoComment,
} from '@/lib/types'

type Row = { id: string; [k: string]: unknown }

export type TableName =
  | 'project_people'
  | 'person_comments'
  | 'todos'
  | 'todo_comments'
  | 'features'
  | 'details'
  | 'requests'
  | 'pipelines'
  | 'pipeline_items'

const PROJECT_TABLES: TableName[] = [
  'project_people',
  'todos',
  'features',
  'details',
  'requests',
  'pipelines',
]

interface ProjectDataState {
  projectId: string | null
  loading: boolean
  rows: Record<TableName, Row[]>
  load: (projectId: string) => Promise<void>
  reset: () => void
  add: <T extends Row>(table: TableName, values: Record<string, unknown>) => Promise<T | null>
  patch: (table: TableName, id: string, values: Record<string, unknown>) => Promise<void>
  del: (table: TableName, id: string) => Promise<void>
  reorder: (table: TableName, ordered: { id: string }[]) => Promise<void>
  subscribe: (projectId: string) => () => void
}

const empty = (): Record<TableName, Row[]> => ({
  project_people: [],
  person_comments: [],
  todos: [],
  todo_comments: [],
  features: [],
  details: [],
  requests: [],
  pipelines: [],
  pipeline_items: [],
})

export const useProjectData = create<ProjectDataState>((set, get) => ({
  projectId: null,
  loading: false,
  rows: empty(),

  reset: () => set({ projectId: null, rows: empty(), loading: false }),

  load: async (projectId) => {
    set({ loading: true, projectId, rows: empty() })
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

    const [pc, tc, pi] = await Promise.all([
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
    ])
    rows.person_comments = (pc.data as Row[]) ?? []
    rows.todo_comments = (tc.data as Row[]) ?? []
    rows.pipeline_items = (pi.data as Row[]) ?? []

    set({ rows, loading: false })
  },

  add: async (table, values) => {
    const { data, error } = await supabase.from(table).insert(values).select('*').single()
    if (error || !data) {
      console.error('[NorthStar] add failed', table, error)
      return null
    }
    set((s) => ({ rows: { ...s.rows, [table]: [...s.rows[table], data as Row] } }))
    return data as never
  },

  patch: async (table, id, values) => {
    set((s) => ({
      rows: {
        ...s.rows,
        [table]: s.rows[table].map((r) => (r.id === id ? { ...r, ...values } : r)),
      },
    }))
    const { error } = await supabase.from(table).update(values).eq('id', id)
    if (error) console.error('[NorthStar] patch failed', table, error)
  },

  del: async (table, id) => {
    set((s) => ({ rows: { ...s.rows, [table]: s.rows[table].filter((r) => r.id !== id) } }))
    const { error } = await supabase.from(table).delete().eq('id', id)
    if (error) console.error('[NorthStar] delete failed', table, error)
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
    await Promise.all(ids.map((id, i) => supabase.from(table).update({ sort: i }).eq('id', id)))
  },

  subscribe: (projectId) => {
    let t: ReturnType<typeof setTimeout> | null = null
    const bump = () => {
      if (get().projectId !== projectId) return
      if (t) clearTimeout(t)
      t = setTimeout(() => get().load(projectId), 400)
    }
    const ch = supabase.channel(`project-${projectId}`)
    const ALL: TableName[] = [
      'project_people',
      'person_comments',
      'todos',
      'todo_comments',
      'features',
      'details',
      'requests',
      'pipelines',
      'pipeline_items',
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
export const asTodos = (r: Row[]) => r as unknown as Todo[]
export const asTodoComments = (r: Row[]) => r as unknown as TodoComment[]
export const asFeatures = (r: Row[]) => r as unknown as Feature[]
export const asDetails = (r: Row[]) => r as unknown as Detail[]
export const asRequests = (r: Row[]) => r as unknown as RequestItem[]
export const asPipelines = (r: Row[]) => r as unknown as Pipeline[]
export const asPipelineItems = (r: Row[]) => r as unknown as PipelineItem[]
