import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import type { Member, MemberGroup } from '@/lib/types'
import { notifySaved, notifySaveError } from '@/store/useChangeNotifications'

interface MembersState {
  members: Member[]
  groups: MemberGroup[]
  loaded: boolean
  error: string | null
  load: () => Promise<void>
  addMember: (email: string, displayName: string, groupName: string) => Promise<{ error: string | null }>
  updateMember: (id: string, patch: Partial<Member>) => Promise<{ error: string | null }>
  removeMember: (id: string) => Promise<{ error: string | null }>
  addGroup: (name: string) => Promise<{ error: string | null }>
  updateGroupPermissions: (name: string, permissions: Record<string, boolean>) => Promise<{ error: string | null }>
  removeGroup: (name: string) => Promise<{ error: string | null }>
}

export const useMembers = create<MembersState>((set, get) => ({
  members: [],
  groups: [],
  loaded: false,
  error: null,

  load: async () => {
    const [m, g] = await Promise.all([
      supabase.from('members').select('*').order('created_at', { ascending: true }),
      supabase.from('member_groups').select('*').order('created_at', { ascending: true }),
    ])
    set({
      members: (m.data as Member[]) ?? [],
      groups: (g.data as MemberGroup[]) ?? [],
      loaded: true,
      error: m.error?.message ?? g.error?.message ?? null,
    })
  },

  addMember: async (email, displayName, groupName) => {
    const { data, error } = await supabase
      .from('members')
      .insert({ email: email.trim().toLowerCase(), display_name: displayName.trim(), group_name: groupName })
      .select('*')
      .single()
    if (error) {
      set({ error: error.message })
      notifySaveError(error.message)
      return { error: error.message }
    }
    set({ members: [...get().members, data as Member] })
    notifySaved('Member added.')
    return { error: null }
  },

  updateMember: async (id, patch) => {
    const previous = get().members
    set({ members: previous.map((m) => (m.id === id ? { ...m, ...patch } : m)) })
    const { error } = await supabase.from('members').update(patch).eq('id', id)
    if (error) {
      set({ members: previous, error: error.message })
      notifySaveError(error.message)
      return { error: error.message }
    }
    notifySaved()
    return { error: null }
  },

  removeMember: async (id) => {
    const previous = get().members
    set({ members: previous.filter((m) => m.id !== id) })
    const { error } = await supabase.from('members').delete().eq('id', id)
    if (error) {
      set({ members: previous, error: error.message })
      notifySaveError(error.message)
      return { error: error.message }
    }
    notifySaved('Member removed.')
    return { error: null }
  },

  addGroup: async (name) => {
    const { data, error } = await supabase
      .from('member_groups')
      .insert({ name: name.trim() })
      .select('*')
      .single()
    if (error) {
      set({ error: error.message })
      notifySaveError(error.message)
      return { error: error.message }
    }
    set({ groups: [...get().groups, data as MemberGroup] })
    notifySaved('Group created.')
    return { error: null }
  },

  updateGroupPermissions: async (name, permissions) => {
    const previous = get().groups
    set({ groups: previous.map((g) => (g.name === name ? { ...g, permissions } : g)) })
    const { error } = await supabase.from('member_groups').update({ permissions }).eq('name', name)
    if (error) {
      set({ groups: previous, error: error.message })
      notifySaveError(error.message)
      return { error: error.message }
    }
    notifySaved('Permissions saved.')
    return { error: null }
  },

  removeGroup: async (name) => {
    const previous = get().groups
    set({ groups: previous.filter((g) => g.name !== name) })
    const { error } = await supabase.from('member_groups').delete().eq('name', name)
    if (error) {
      set({ groups: previous, error: error.message })
      notifySaveError(error.message)
      return { error: error.message }
    }
    notifySaved('Group removed.')
    return { error: null }
  },
}))
