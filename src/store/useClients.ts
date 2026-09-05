import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import type { Client, ProjectClient } from '@/lib/types'
import { notifySaved, notifySaveError } from '@/store/useChangeNotifications'

interface ClientsState {
  clients: Client[]
  links: ProjectClient[]
  loading: boolean
  loaded: boolean
  error: string | null
  load: () => Promise<void>
  create: (fields: Partial<Client>) => Promise<Client | null>
  update: (id: string, patch: Partial<Client>) => Promise<{ error: string | null }>
  remove: (id: string) => Promise<void>
  linkToProject: (projectId: string, clientId: string) => Promise<void>
  unlinkFromProject: (projectId: string, clientId: string) => Promise<void>
  clientsForProject: (projectId: string) => Client[]
  projectIdsForClient: (clientId: string) => string[]
  subscribe: () => () => void
}

export const useClients = create<ClientsState>((set, get) => ({
  clients: [],
  links: [],
  loading: false,
  loaded: false,
  error: null,

  load: async () => {
    set({ loading: true })
    const [clientsRes, linksRes] = await Promise.all([
      supabase.from('clients').select('*').order('sort', { ascending: true }),
      supabase.from('project_clients').select('*'),
    ])
    set({
      clients: (clientsRes.data as Client[]) ?? [],
      links: (linksRes.data as ProjectClient[]) ?? [],
      loading: false,
      loaded: true,
      error: clientsRes.error?.message ?? linksRes.error?.message ?? null,
    })
  },

  create: async (fields) => {
    const { data, error } = await supabase
      .from('clients')
      .insert({ sort: get().clients.length, ...fields })
      .select('*')
      .single()
    if (error || !data) {
      console.error('[NorthStar] create client failed', error)
      set({ error: error?.message ?? null })
      notifySaveError(error?.message)
      return null
    }
    set({ clients: [...get().clients, data as Client] })
    notifySaved('Client created.')
    return data as Client
  },

  update: async (id, patch) => {
    const previous = get().clients
    set({ clients: previous.map((c) => (c.id === id ? { ...c, ...patch } : c)) })
    const { error } = await supabase.from('clients').update(patch).eq('id', id)
    if (error) {
      set({ clients: previous, error: error.message })
      notifySaveError(error.message)
      return { error: error.message }
    }
    notifySaved()
    return { error: null }
  },

  remove: async (id) => {
    const previous = get().clients
    set({ clients: previous.filter((c) => c.id !== id) })
    const { error } = await supabase.from('clients').delete().eq('id', id)
    if (error) {
      set({ clients: previous, error: error.message })
      notifySaveError(error.message)
      return
    }
    notifySaved('Client removed.')
  },

  linkToProject: async (projectId, clientId) => {
    if (get().links.some((l) => l.project_id === projectId && l.client_id === clientId)) return
    set({
      links: [
        ...get().links,
        { project_id: projectId, client_id: clientId, created_at: new Date().toISOString() },
      ],
    })
    const { error } = await supabase.from('project_clients').insert({ project_id: projectId, client_id: clientId })
    if (error) notifySaveError(error.message)
    else notifySaved('Client linked to project.')
  },

  unlinkFromProject: async (projectId, clientId) => {
    set({
      links: get().links.filter((l) => !(l.project_id === projectId && l.client_id === clientId)),
    })
    const { error } = await supabase
      .from('project_clients')
      .delete()
      .eq('project_id', projectId)
      .eq('client_id', clientId)
    if (error) notifySaveError(error.message)
    else notifySaved('Client unlinked from project.')
  },

  clientsForProject: (projectId) => {
    const ids = new Set(get().links.filter((l) => l.project_id === projectId).map((l) => l.client_id))
    return get().clients.filter((c) => ids.has(c.id))
  },

  projectIdsForClient: (clientId) =>
    get()
      .links.filter((l) => l.client_id === clientId)
      .map((l) => l.project_id),

  subscribe: () => {
    const ch = supabase
      .channel('clients-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'clients' }, () => get().load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'project_clients' }, () =>
        get().load(),
      )
      .subscribe()
    return () => {
      supabase.removeChannel(ch)
    }
  },
}))
