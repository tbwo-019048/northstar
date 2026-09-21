import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import type { ChecklistItem, ChecklistSection, Topic } from '@/lib/types'
import { notifySaved, notifySaveError } from '@/store/useChangeNotifications'
import { getActiveEnvironment } from '@/store/useSettings'

// Cloned from useNotes.ts (Notes is the template — see src/pages/Notes.tsx /
// src/store/useNotes.ts) and rebranded as Topics. Notes itself is untouched;
// this is a separate store over its own `topics` table.

interface TopicsState {
  topics: Topic[]
  loading: boolean
  loaded: boolean
  error: string | null
  load: () => Promise<void>
  create: () => Promise<Topic | null>
  update: (id: string, patch: Partial<Topic>) => Promise<{ error: string | null }>
  remove: (id: string) => Promise<void>
  reorder: (orderedIds: string[]) => Promise<void>
  addChecklistSection: (topicId: string, title: string) => Promise<void>
  renameChecklistSection: (topicId: string, sectionId: string, title: string) => Promise<void>
  removeChecklistSection: (topicId: string, sectionId: string) => Promise<void>
  toggleChecklistItem: (topicId: string, sectionId: string, itemId: string) => Promise<void>
  addChecklistItem: (topicId: string, sectionId: string, text: string) => Promise<void>
  removeChecklistItem: (topicId: string, sectionId: string, itemId: string) => Promise<void>
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

export const useTopics = create<TopicsState>((set, get) => {
  /** Shared optimistic-update-then-persist path for every checklist_sections
   * mutation: apply `updater` to the topic's sections locally first, persist
   * the whole array, roll back on error. */
  const updateSections = async (topicId: string, updater: (sections: ChecklistSection[]) => ChecklistSection[]) => {
    const previous = get().topics
    const topic = previous.find((t) => t.id === topicId)
    if (!topic) return
    const nextSections = updater(topic.checklist_sections)
    set({ topics: previous.map((t) => (t.id === topicId ? { ...t, checklist_sections: nextSections } : t)) })
    const { error } = await supabase.from('topics').update({ checklist_sections: nextSections }).eq('id', topicId)
    if (error) {
      set({ topics: previous, error: error.message })
      notifySaveError(error.message)
    }
  }

  return {
    topics: [],
    loading: false,
    loaded: false,
    error: null,

    load: async () => {
      set({ loading: true })
      const { data, error } = await supabase
        .from('topics')
        .select('*')
        .eq('environment', getActiveEnvironment())
        .order('sort', { ascending: true })
      set({ topics: (data as Topic[]) ?? [], loading: false, loaded: true, error: error?.message ?? null })
    },

    create: async () => {
      const { data, error } = await supabase
        .from('topics')
        .insert({
          title: 'Untitled topic',
          body: '',
          checklist_sections: [],
          sort: get().topics.length,
          environment: getActiveEnvironment(),
        })
        .select('*')
        .single()
      if (error || !data) {
        console.error('[NorthStar] create topic failed', error)
        notifySaveError(error?.message)
        return null
      }
      set({ topics: [...get().topics, data as Topic] })
      notifySaved('Topic created.')
      return data as Topic
    },

    update: async (id, patch) => {
      const previous = get().topics
      set({ topics: previous.map((t) => (t.id === id ? { ...t, ...patch } : t)) })
      const { error } = await supabase.from('topics').update(patch).eq('id', id)
      if (error) {
        set({ topics: previous, error: error.message })
        notifySaveError(error.message)
        return { error: error.message }
      }
      if (patch.environment && patch.environment !== getActiveEnvironment()) {
        set({ topics: get().topics.filter((topic) => topic.id !== id) })
      }
      notifySaved()
      return { error: null }
    },

    remove: async (id) => {
      const previous = get().topics
      set({ topics: previous.filter((t) => t.id !== id) })
      const { error } = await supabase.from('topics').delete().eq('id', id)
      if (error) {
        set({ topics: previous, error: error.message })
        notifySaveError(error.message)
        return
      }
      notifySaved('Topic removed.')
    },

    reorder: async (orderedIds) => {
      const previous = get().topics
      const pos = new Map(orderedIds.map((id, i) => [id, i]))
      set({
        topics: previous
          .map((t) => (pos.has(t.id) ? { ...t, sort: pos.get(t.id)! } : t))
          .sort((a, b) => a.sort - b.sort),
      })
      const results = await Promise.all(
        orderedIds.map((id, i) => supabase.from('topics').update({ sort: i }).eq('id', id)),
      )
      const error = results.find((r) => r.error)?.error
      if (error) {
        set({ topics: previous, error: error.message })
        notifySaveError(error.message)
      } else notifySaved('Order saved.')
    },

    addChecklistSection: (topicId, title) =>
      updateSections(topicId, (sections) => [
        ...sections,
        {
          id: crypto.randomUUID(),
          title: title.trim() || 'Checklist',
          items: [],
          order: sections.length ? Math.max(...sections.map((s) => s.order)) + 1 : 0,
        },
      ]),

    renameChecklistSection: (topicId, sectionId, title) =>
      updateSections(topicId, (sections) =>
        sections.map((s) => (s.id === sectionId ? { ...s, title } : s)),
      ),

    removeChecklistSection: (topicId, sectionId) =>
      updateSections(topicId, (sections) => sections.filter((s) => s.id !== sectionId)),

    toggleChecklistItem: (topicId, sectionId, itemId) =>
      updateSections(topicId, (sections) =>
        sections.map((s) =>
          s.id === sectionId
            ? { ...s, items: sortChecklist(s.items.map((it) => (it.id === itemId ? { ...it, done: !it.done } : it))) }
            : s,
        ),
      ),

    addChecklistItem: (topicId, sectionId, text) =>
      updateSections(topicId, (sections) =>
        sections.map((s) => {
          if (s.id !== sectionId || !text.trim()) return s
          const nextOrder = s.items.length ? Math.max(...s.items.map((it) => it.order)) + 1 : 0
          const item: ChecklistItem = { id: crypto.randomUUID(), text: text.trim(), done: false, order: nextOrder }
          return { ...s, items: [...s.items, item] }
        }),
      ),

    removeChecklistItem: (topicId, sectionId, itemId) =>
      updateSections(topicId, (sections) =>
        sections.map((s) => (s.id === sectionId ? { ...s, items: s.items.filter((it) => it.id !== itemId) } : s)),
      ),

    subscribe: () => {
      const ch = supabase
        .channel('topics-rt')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'topics' }, () => get().load())
        .subscribe()
      return () => {
        supabase.removeChannel(ch)
      }
    },
  }
})
