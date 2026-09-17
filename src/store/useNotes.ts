import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import type { ChecklistItem, Note } from '@/lib/types'
import { notifySaved, notifySaveError } from '@/store/useChangeNotifications'
import { getActiveEnvironment } from '@/store/useSettings'

interface NotesState {
  notes: Note[]
  loading: boolean
  loaded: boolean
  error: string | null
  load: () => Promise<void>
  create: () => Promise<Note | null>
  update: (id: string, patch: Partial<Note>) => Promise<{ error: string | null }>
  remove: (id: string) => Promise<void>
  reorder: (orderedIds: string[]) => Promise<void>
  toggleChecklistItem: (noteId: string, itemId: string) => Promise<void>
  addChecklistItem: (noteId: string, text: string) => Promise<void>
  removeChecklistItem: (noteId: string, itemId: string) => Promise<void>
  subscribe: () => () => void
}

/** Not-done items keep their authored order; done items keep the order they
 * were checked off in — this is what produces "click → moves to the bottom". */
function sortChecklist(items: ChecklistItem[]): ChecklistItem[] {
  return [...items].sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1
    return a.order - b.order
  })
}

export const useNotes = create<NotesState>((set, get) => ({
  notes: [],
  loading: false,
  loaded: false,
  error: null,

  load: async () => {
    set({ loading: true })
    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .eq('environment', getActiveEnvironment())
      .order('sort', { ascending: true })
    set({ notes: (data as Note[]) ?? [], loading: false, loaded: true, error: error?.message ?? null })
  },

  create: async () => {
    const { data, error } = await supabase
      .from('notes')
      .insert({
        title: 'Untitled note',
        body: '',
        checklist: [],
        sort: get().notes.length,
        environment: getActiveEnvironment(),
      })
      .select('*')
      .single()
    if (error || !data) {
      console.error('[NorthStar] create note failed', error)
      notifySaveError(error?.message)
      return null
    }
    set({ notes: [...get().notes, data as Note] })
    notifySaved('Note created.')
    return data as Note
  },

  update: async (id, patch) => {
    const previous = get().notes
    set({ notes: previous.map((n) => (n.id === id ? { ...n, ...patch } : n)) })
    const { error } = await supabase.from('notes').update(patch).eq('id', id)
    if (error) {
      set({ notes: previous, error: error.message })
      notifySaveError(error.message)
      return { error: error.message }
    }
    if (patch.environment && patch.environment !== getActiveEnvironment()) {
      set({ notes: get().notes.filter((note) => note.id !== id) })
    }
    notifySaved()
    return { error: null }
  },

  remove: async (id) => {
    const previous = get().notes
    set({ notes: previous.filter((n) => n.id !== id) })
    const { error } = await supabase.from('notes').delete().eq('id', id)
    if (error) {
      set({ notes: previous, error: error.message })
      notifySaveError(error.message)
      return
    }
    notifySaved('Note removed.')
  },

  reorder: async (orderedIds) => {
    const previous = get().notes
    const pos = new Map(orderedIds.map((id, i) => [id, i]))
    set({
      notes: previous
        .map((n) => (pos.has(n.id) ? { ...n, sort: pos.get(n.id)! } : n))
        .sort((a, b) => a.sort - b.sort),
    })
    const results = await Promise.all(
      orderedIds.map((id, i) => supabase.from('notes').update({ sort: i }).eq('id', id)),
    )
    const error = results.find((r) => r.error)?.error
    if (error) {
      set({ notes: previous, error: error.message })
      notifySaveError(error.message)
    } else notifySaved('Order saved.')
  },

  toggleChecklistItem: async (noteId, itemId) => {
    const previous = get().notes
    const note = previous.find((n) => n.id === noteId)
    if (!note) return
    const toggled = note.checklist.map((it) => (it.id === itemId ? { ...it, done: !it.done } : it))
    const reordered = sortChecklist(toggled)
    set({ notes: previous.map((n) => (n.id === noteId ? { ...n, checklist: reordered } : n)) })
    const { error } = await supabase.from('notes').update({ checklist: reordered }).eq('id', noteId)
    if (error) {
      set({ notes: previous, error: error.message })
      notifySaveError(error.message)
    }
  },

  addChecklistItem: async (noteId, text) => {
    const previous = get().notes
    const note = previous.find((n) => n.id === noteId)
    if (!note || !text.trim()) return
    const nextOrder = note.checklist.length ? Math.max(...note.checklist.map((it) => it.order)) + 1 : 0
    const item: ChecklistItem = { id: crypto.randomUUID(), text: text.trim(), done: false, order: nextOrder }
    const updated = [...note.checklist, item]
    set({ notes: previous.map((n) => (n.id === noteId ? { ...n, checklist: updated } : n)) })
    const { error } = await supabase.from('notes').update({ checklist: updated }).eq('id', noteId)
    if (error) {
      set({ notes: previous, error: error.message })
      notifySaveError(error.message)
    }
  },

  removeChecklistItem: async (noteId, itemId) => {
    const previous = get().notes
    const note = previous.find((n) => n.id === noteId)
    if (!note) return
    const updated = note.checklist.filter((it) => it.id !== itemId)
    set({ notes: previous.map((n) => (n.id === noteId ? { ...n, checklist: updated } : n)) })
    const { error } = await supabase.from('notes').update({ checklist: updated }).eq('id', noteId)
    if (error) {
      set({ notes: previous, error: error.message })
      notifySaveError(error.message)
    }
  },

  subscribe: () => {
    const ch = supabase
      .channel('notes-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notes' }, () => get().load())
      .subscribe()
    return () => {
      supabase.removeChannel(ch)
    }
  },
}))
