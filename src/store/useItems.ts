import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import type { PlanComment, PlanItem, Todo, TodoComment } from '@/lib/types'
import type { ItemSource } from '@/lib/unifiedItem'
import { notifySaved, notifySaveError } from '@/store/useChangeNotifications'
import { useAuth } from '@/store/useAuth'
import { ensureTodoFeature } from '@/lib/todoToFeature'

type ItemComment = TodoComment | PlanComment

interface ItemsState {
  todos: Todo[]
  planItems: PlanItem[]
  /** Comment threads, loaded lazily. Key: `${source}:${itemId}`. */
  comments: Record<string, ItemComment[]>
  loading: boolean
  loaded: boolean
  error: string | null
  load: () => Promise<void>
  add: (source: ItemSource, values: Record<string, unknown>) => Promise<{ id: string } | null>
  patch: (
    source: ItemSource,
    id: string,
    values: Record<string, unknown>,
  ) => Promise<{ error: string | null }>
  del: (source: ItemSource, id: string) => Promise<void>
  loadComments: (source: ItemSource, id: string) => Promise<void>
  addComment: (source: ItemSource, id: string, body: string) => Promise<void>
  delComment: (source: ItemSource, itemId: string, commentId: string) => Promise<void>
  subscribe: () => () => void
}

const TABLE = (s: ItemSource) => (s === 'todo' ? 'todos' : 'plan_items')
const CT = (s: ItemSource) => (s === 'todo' ? 'todo_comments' : 'plan_comments')
const CFK = (s: ItemSource) => (s === 'todo' ? 'todo_id' : 'plan_item_id')
const ckey = (s: ItemSource, id: string) => `${s}:${id}`

// Timestamp of the last local mutation. The realtime subscription defers its
// reload while this is recent, so a burst of edits doesn't refetch per
// keystroke — mirrors the guard in `useProjectData`.
let lastLocalWrite = 0
const markLocalWrite = () => {
  lastLocalWrite = Date.now()
}

export const useItems = create<ItemsState>((set, get) => ({
  todos: [],
  planItems: [],
  comments: {},
  loading: false,
  loaded: false,
  error: null,

  load: async () => {
    set({ loading: true })
    // No project_id filter — the project-data tables are `for all to
    // authenticated using (true)`, so a global select is intended here.
    const [t, p] = await Promise.all([
      supabase.from('todos').select('*').order('updated_at', { ascending: false }),
      supabase.from('plan_items').select('*').order('updated_at', { ascending: false }),
    ])
    set({
      todos: (t.data as Todo[]) ?? [],
      planItems: (p.data as PlanItem[]) ?? [],
      loading: false,
      loaded: true,
      error: t.error?.message ?? p.error?.message ?? null,
    })
  },

  add: async (source, values) => {
    const { data, error } = await supabase.from(TABLE(source)).insert(values).select('*').single()
    if (error || !data) {
      console.error('[NorthStar] add item failed', source, error)
      notifySaveError(error?.message)
      return null
    }
    if (source === 'todo') set((s) => ({ todos: [data as Todo, ...s.todos] }))
    else set((s) => ({ planItems: [data as PlanItem, ...s.planItems] }))
    markLocalWrite()
    notifySaved('Item added.')
    return { id: (data as { id: string }).id }
  },

  patch: async (source, id, values) => {
    const before = { todos: get().todos, planItems: get().planItems }
    if (source === 'todo') {
      set((s) => ({ todos: s.todos.map((r) => (r.id === id ? { ...r, ...values } : r)) }))
    } else {
      set((s) => ({ planItems: s.planItems.map((r) => (r.id === id ? { ...r, ...values } : r)) }))
    }
    const { error } = await supabase.from(TABLE(source)).update(values).eq('id', id)
    if (error) {
      console.error('[NorthStar] patch item failed', source, error)
      set(before) // roll back
      notifySaveError(error.message)
      return { error: error.message }
    }
    markLocalWrite()
    notifySaved()
    if (source === 'todo' && values.status === 'completed') {
      const todo = get().todos.find((x) => x.id === id)
      if (todo) void ensureTodoFeature(todo)
    }
    return { error: null }
  },

  del: async (source, id) => {
    const before = { todos: get().todos, planItems: get().planItems }
    if (source === 'todo') set((s) => ({ todos: s.todos.filter((r) => r.id !== id) }))
    else set((s) => ({ planItems: s.planItems.filter((r) => r.id !== id) }))
    const { error } = await supabase.from(TABLE(source)).delete().eq('id', id)
    if (error) {
      console.error('[NorthStar] delete item failed', source, error)
      set(before) // roll back
      notifySaveError(error.message)
      return
    }
    markLocalWrite()
    notifySaved('Item removed.')
  },

  loadComments: async (source, id) => {
    const key = ckey(source, id)
    if (get().comments[key]) return
    const { data } = await supabase
      .from(CT(source))
      .select('*')
      .eq(CFK(source), id)
      .order('created_at', { ascending: true })
    set((s) => ({ comments: { ...s.comments, [key]: (data as ItemComment[]) ?? [] } }))
  },

  addComment: async (source, id, body) => {
    const text = body.trim()
    if (!text) return
    const key = ckey(source, id)
    const author = useAuth.getState().user?.email ?? 'unknown'
    const { data, error } = await supabase
      .from(CT(source))
      .insert({ [CFK(source)]: id, author, body: text })
      .select('*')
      .single()
    if (error || !data) {
      notifySaveError(error?.message)
      return
    }
    set((s) => ({
      comments: { ...s.comments, [key]: [...(s.comments[key] ?? []), data as ItemComment] },
    }))
    markLocalWrite()
    notifySaved('Comment added.')
  },

  delComment: async (source, itemId, commentId) => {
    const key = ckey(source, itemId)
    const previous = get().comments[key] ?? []
    set((s) => ({
      comments: { ...s.comments, [key]: previous.filter((c) => c.id !== commentId) },
    }))
    const { error } = await supabase.from(CT(source)).delete().eq('id', commentId)
    if (error) {
      set((s) => ({ comments: { ...s.comments, [key]: previous } }))
      notifySaveError(error.message)
      return
    }
    markLocalWrite()
    notifySaved('Comment removed.')
  },

  subscribe: () => {
    let t: ReturnType<typeof setTimeout> | null = null
    let ct: ReturnType<typeof setTimeout> | null = null
    const bump = () => {
      if (t) clearTimeout(t)
      const sinceWrite = Date.now() - lastLocalWrite
      const wait = sinceWrite < 1500 ? 1900 - sinceWrite : 400
      t = setTimeout(() => get().load(), wait)
    }
    const bumpComments = () => {
      if (ct) clearTimeout(ct)
      ct = setTimeout(() => {
        for (const key of Object.keys(get().comments)) {
          const [s, id] = key.split(':') as [ItemSource, string]
          void supabase
            .from(CT(s))
            .select('*')
            .eq(CFK(s), id)
            .order('created_at', { ascending: true })
            .then(({ data }) =>
              set((st) => ({ comments: { ...st.comments, [key]: (data as ItemComment[]) ?? [] } })),
            )
        }
      }, 500)
    }
    const ch = supabase
      .channel('items-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'todos' }, bump)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'plan_items' }, bump)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'todo_comments' }, bumpComments)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'plan_comments' }, bumpComments)
      .subscribe()
    return () => {
      if (t) clearTimeout(t)
      if (ct) clearTimeout(ct)
      supabase.removeChannel(ch)
    }
  },
}))
