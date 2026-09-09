import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import type { ProjectLink } from '@/lib/types'
import { notifySaved, notifySaveError } from '@/store/useChangeNotifications'

/** Symmetric project↔project links. Rows are stored one per unordered pair
 * with `a < b`; selectors hide that detail. */
interface ProjectLinksState {
  links: ProjectLink[]
  loaded: boolean
  load: () => Promise<void>
  linkedIds: (projectId: string) => string[]
  toggle: (projectId: string, otherId: string) => Promise<void>
  subscribe: () => () => void
}

const pair = (x: string, y: string) => (x < y ? { a: x, b: y } : { a: y, b: x })

export const useProjectLinks = create<ProjectLinksState>((set, get) => ({
  links: [],
  loaded: false,

  load: async () => {
    const { data, error } = await supabase.from('project_links').select('*')
    set({ links: (data as ProjectLink[]) ?? [], loaded: true })
    if (error) notifySaveError(error.message)
  },

  linkedIds: (projectId) =>
    get()
      .links.filter((l) => l.a === projectId || l.b === projectId)
      .map((l) => (l.a === projectId ? l.b : l.a)),

  toggle: async (projectId, otherId) => {
    if (projectId === otherId) return
    const { a, b } = pair(projectId, otherId)
    const exists = get().links.some((l) => l.a === a && l.b === b)
    if (exists) {
      set({ links: get().links.filter((l) => !(l.a === a && l.b === b)) })
      const { error } = await supabase.from('project_links').delete().eq('a', a).eq('b', b)
      if (error) notifySaveError(error.message)
      else notifySaved('Projects unlinked.')
    } else {
      set({ links: [...get().links, { a, b, created_at: new Date().toISOString() }] })
      const { error } = await supabase.from('project_links').insert({ a, b })
      if (error) notifySaveError(error.message)
      else notifySaved('Projects linked.')
    }
  },

  subscribe: () => {
    const ch = supabase
      .channel('project-links-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'project_links' }, () =>
        get().load(),
      )
      .subscribe()
    return () => {
      supabase.removeChannel(ch)
    }
  },
}))
