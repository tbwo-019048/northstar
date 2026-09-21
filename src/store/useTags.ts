import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import type { Tag, TopicTag } from '@/lib/types'
import { notifySaved, notifySaveError } from '@/store/useChangeNotifications'
import { getActiveEnvironment } from '@/store/useSettings'
import { tagsForTopic, topicIdsForTag } from '@/lib/topicTags'

// Tags are a Topics-only addition (Notes has no equivalent) — modeled on the
// Client<->Project link store (see useClients.ts's `links`/linkToProject):
// tags themselves plus a many-to-many join table (`topic_tags`) managed
// together in one store, same pattern.

interface TagsState {
  tags: Tag[]
  links: TopicTag[]
  loading: boolean
  loaded: boolean
  error: string | null
  load: () => Promise<void>
  subscribe: () => () => void
  createTag: (name: string) => Promise<Tag | null>
  removeTag: (id: string) => Promise<void>
  assignTag: (topicId: string, tagId: string) => Promise<void>
  unassignTag: (topicId: string, tagId: string) => Promise<void>
  tagsForTopic: (topicId: string) => Tag[]
  topicIdsForTag: (tagId: string) => string[]
}

export const useTags = create<TagsState>((set, get) => ({
  tags: [],
  links: [],
  loading: false,
  loaded: false,
  error: null,

  load: async () => {
    set({ loading: true })
    const [{ data: tags, error: tagsError }, { data: links, error: linksError }] = await Promise.all([
      supabase.from('tags').select('*').eq('environment', getActiveEnvironment()).order('name', { ascending: true }),
      supabase.from('topic_tags').select('*'),
    ])
    set({
      tags: (tags as Tag[]) ?? [],
      links: (links as TopicTag[]) ?? [],
      loading: false,
      loaded: true,
      error: tagsError?.message ?? linksError?.message ?? null,
    })
  },

  subscribe: () => {
    const ch = supabase
      .channel('tags-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tags' }, () => get().load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'topic_tags' }, () => get().load())
      .subscribe()
    return () => {
      supabase.removeChannel(ch)
    }
  },

  createTag: async (name) => {
    const trimmed = name.trim()
    if (!trimmed) return null
    const existing = get().tags.find((t) => t.name.toLowerCase() === trimmed.toLowerCase())
    if (existing) return existing
    const { data, error } = await supabase
      .from('tags')
      .insert({ name: trimmed, environment: getActiveEnvironment() })
      .select('*')
      .single()
    if (error || !data) {
      notifySaveError(error?.message)
      return null
    }
    set({ tags: [...get().tags, data as Tag].sort((a, b) => a.name.localeCompare(b.name)) })
    notifySaved('Tag created.')
    return data as Tag
  },

  removeTag: async (id) => {
    const previousTags = get().tags
    const previousLinks = get().links
    set({
      tags: previousTags.filter((t) => t.id !== id),
      links: previousLinks.filter((l) => l.tag_id !== id),
    })
    const { error } = await supabase.from('tags').delete().eq('id', id)
    if (error) {
      set({ tags: previousTags, links: previousLinks, error: error.message })
      notifySaveError(error.message)
      return
    }
    notifySaved('Tag removed.')
  },

  assignTag: async (topicId, tagId) => {
    if (get().links.some((l) => l.topic_id === topicId && l.tag_id === tagId)) return
    const previous = get().links
    set({ links: [...previous, { topic_id: topicId, tag_id: tagId, created_at: new Date().toISOString() }] })
    const { error } = await supabase.from('topic_tags').insert({ topic_id: topicId, tag_id: tagId })
    if (error) {
      set({ links: previous, error: error.message })
      notifySaveError(error.message)
    }
  },

  unassignTag: async (topicId, tagId) => {
    const previous = get().links
    set({ links: previous.filter((l) => !(l.topic_id === topicId && l.tag_id === tagId)) })
    const { error } = await supabase
      .from('topic_tags')
      .delete()
      .eq('topic_id', topicId)
      .eq('tag_id', tagId)
    if (error) {
      set({ links: previous, error: error.message })
      notifySaveError(error.message)
    }
  },

  tagsForTopic: (topicId) => tagsForTopic(get().tags, get().links, topicId),

  topicIdsForTag: (tagId) => topicIdsForTag(get().links, tagId),
}))
