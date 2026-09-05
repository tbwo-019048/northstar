import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import type { Project, ProjectType } from '@/lib/types'
import { notifySaved, notifySaveError } from '@/store/useChangeNotifications'

interface ProjectsState {
  projects: Project[]
  loading: boolean
  loaded: boolean
  error: string | null
  load: () => Promise<void>
  create: (name: string, type: ProjectType) => Promise<{ project: Project | null; error: string | null }>
  update: (id: string, patch: Partial<Project>) => Promise<{ error: string | null }>
  remove: (id: string) => Promise<void>
  subscribe: () => () => void
  clearError: () => void
}

export const useProjects = create<ProjectsState>((set, get) => ({
  projects: [],
  loading: false,
  loaded: false,
  error: null,

  load: async () => {
    set({ loading: true })
    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .order('position', { ascending: true })
      .order('created_at', { ascending: true })
    set({
      projects: (data as Project[]) ?? [],
      loading: false,
      loaded: true,
      error: error?.message ?? null,
    })
  },

  create: async (name, type) => {
    const position = get().projects.length
    const { data, error } = await supabase
      .from('projects')
      .insert({ name, type, position })
      .select('*')
      .single()
    if (error) {
      console.error('[NorthStar] create project failed', error)
      set({ error: error.message })
      notifySaveError(error.message)
      return { project: null, error: error.message }
    }
    if (data) set({ projects: [...get().projects, data as Project] })
    notifySaved('Project created.')
    return { project: (data as Project) ?? null, error: null }
  },

  update: async (id, patch) => {
    const previous = get().projects
    set({ projects: previous.map((p) => (p.id === id ? { ...p, ...patch } : p)) })
    const { error } = await supabase.from('projects').update(patch).eq('id', id)
    if (error) {
      console.error('[NorthStar] update project failed', error)
      set({ projects: previous, error: error.message }) // roll back the optimistic write
      notifySaveError(error.message)
      return { error: error.message }
    }
    notifySaved()
    return { error: null }
  },

  remove: async (id) => {
    const previous = get().projects
    set({ projects: previous.filter((p) => p.id !== id) })
    const { error } = await supabase.from('projects').delete().eq('id', id)
    if (error) {
      set({ projects: previous, error: error.message })
      notifySaveError(error.message)
      return
    }
    notifySaved('Project removed.')
  },

  clearError: () => set({ error: null }),

  subscribe: () => {
    const ch = supabase
      .channel('projects-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, () => {
        get().load()
      })
      .subscribe()
    return () => {
      supabase.removeChannel(ch)
    }
  },
}))
