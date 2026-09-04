import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import type { Project, ProjectType } from '@/lib/types'

interface ProjectsState {
  projects: Project[]
  loading: boolean
  loaded: boolean
  load: () => Promise<void>
  create: (name: string, type: ProjectType) => Promise<Project | null>
  update: (id: string, patch: Partial<Project>) => Promise<void>
  remove: (id: string) => Promise<void>
  subscribe: () => () => void
}

export const useProjects = create<ProjectsState>((set, get) => ({
  projects: [],
  loading: false,
  loaded: false,

  load: async () => {
    set({ loading: true })
    const { data } = await supabase
      .from('projects')
      .select('*')
      .order('position', { ascending: true })
      .order('created_at', { ascending: true })
    set({ projects: (data as Project[]) ?? [], loading: false, loaded: true })
  },

  create: async (name, type) => {
    const position = get().projects.length
    const { data } = await supabase
      .from('projects')
      .insert({ name, type, position })
      .select('*')
      .single()
    if (data) set({ projects: [...get().projects, data as Project] })
    return (data as Project) ?? null
  },

  update: async (id, patch) => {
    set({ projects: get().projects.map((p) => (p.id === id ? { ...p, ...patch } : p)) })
    await supabase.from('projects').update(patch).eq('id', id)
  },

  remove: async (id) => {
    set({ projects: get().projects.filter((p) => p.id !== id) })
    await supabase.from('projects').delete().eq('id', id)
  },

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
