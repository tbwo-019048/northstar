import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import type { ChecklistItem, ChecklistSection, Note } from '@/lib/types'
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
  addChecklistSection: (noteId: string, title: string) => Promise<void>
  renameChecklistSection: (noteId: string, sectionId: string, title: string) => Promise<void>
  removeChecklistSection: (noteId: string, sectionId: string) => Promise<void>
  toggleChecklistItem: (noteId: string, sectionId: string, itemId: string) => Promise<void>
  addChecklistItem: (noteId: string, sectionId: string, text: string) => Promise<void>
  removeChecklistItem: (noteId: string, sectionId: string, itemId: string) => Promise<void>
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

export const useNotes = create<NotesState>((set, get) => {
  /** Shared optimistic-update-then-persist path for every checklist_sections
   * mutation: apply `updater` to the note's sections locally first, persist
   * the whole array, roll back on error. */
  const updateSections = async (noteId: string, updater: (sections: ChecklistSection[]) => ChecklistSection[]) => {
    const previous = get().notes
    const note = previous.find((n) => n.id === noteId)
    if (!note) return
    const nextSections = updater(note.checklist_sections)
    set({ notes: previous.map((n) => (n.id === noteId ? { ...n, checklist_sections: nextSections } : n)) })
    const { error } = await supabase.from('notes').update({ checklist_sections: nextSections }).eq('id', noteId)
    if (error) {
      set({ notes: previous, error: error.message })
      notifySaveError(error.message)
    }
  }

  return {
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
          checklist_sections: [],
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

    addChecklistSection: (noteId, title) =>
      updateSections(noteId, (sections) => [
        ...sections,
        {
          id: crypto.randomUUID(),
          title: title.trim() || 'Checklist',
          items: [],
          order: sections.length ? Math.max(...sections.map((s) => s.order)) + 1 : 0,
        },
      ]),

    renameChecklistSection: (noteId, sectionId, title) =>
      updateSections(noteId, (sections) =>
        sections.map((s) => (s.id === sectionId ? { ...s, title } : s)),
      ),

    removeChecklistSection: (noteId, sectionId) =>
      updateSections(noteId, (sections) => sections.filter((s) => s.id !== sectionId)),

    toggleChecklistItem: (noteId, sectionId, itemId) =>
      updateSections(noteId, (sections) =>
        sections.map((s) =>
          s.id === sectionId
            ? { ...s, items: sortChecklist(s.items.map((it) => (it.id === itemId ? { ...it, done: !it.done } : it))) }
            : s,
        ),
      ),

    addChecklistItem: (noteId, sectionId, text) =>
      updateSections(noteId, (sections) =>
        sections.map((s) => {
          if (s.id !== sectionId || !text.trim()) return s
          const nextOrder = s.items.length ? Math.max(...s.items.map((it) => it.order)) + 1 : 0
          const item: ChecklistItem = { id: crypto.randomUUID(), text: text.trim(), done: false, order: nextOrder }
          return { ...s, items: [...s.items, item] }
        }),
      ),

    removeChecklistItem: (noteId, sectionId, itemId) =>
      updateSections(noteId, (sections) =>
        sections.map((s) => (s.id === sectionId ? { ...s, items: s.items.filter((it) => it.id !== itemId) } : s)),
      ),

    subscribe: () => {
      const ch = supabase
        .channel('notes-rt')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'notes' }, () => get().load())
        .subscribe()
      return () => {
        supabase.removeChannel(ch)
      }
    },
  }
})
