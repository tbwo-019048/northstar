import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import type { EmailAccount, EmailGroup } from '@/lib/types'

interface EmailsState {
  groups: EmailGroup[]
  accounts: EmailAccount[]
  loading: boolean
  loaded: boolean
  error: string | null
  load: () => Promise<void>
  addGroup: (name: string) => Promise<EmailGroup | null>
  removeGroup: (id: string) => Promise<void>
  addAccount: (groupId: string, fields: Partial<EmailAccount>) => Promise<EmailAccount | null>
  updateAccount: (id: string, patch: Partial<EmailAccount>) => Promise<{ error: string | null }>
  removeAccount: (id: string) => Promise<void>
  subscribe: () => () => void
}

export const useEmails = create<EmailsState>((set, get) => ({
  groups: [],
  accounts: [],
  loading: false,
  loaded: false,
  error: null,

  load: async () => {
    set({ loading: true })
    const [groupsRes, accountsRes] = await Promise.all([
      supabase.from('email_groups').select('*').order('sort', { ascending: true }),
      supabase.from('email_accounts').select('*').order('sort', { ascending: true }),
    ])
    set({
      groups: (groupsRes.data as EmailGroup[]) ?? [],
      accounts: (accountsRes.data as EmailAccount[]) ?? [],
      loading: false,
      loaded: true,
      error: groupsRes.error?.message ?? accountsRes.error?.message ?? null,
    })
  },

  addGroup: async (name) => {
    const { data, error } = await supabase
      .from('email_groups')
      .insert({ name, sort: get().groups.length })
      .select('*')
      .single()
    if (error || !data) {
      set({ error: error?.message ?? null })
      return null
    }
    set({ groups: [...get().groups, data as EmailGroup] })
    return data as EmailGroup
  },

  removeGroup: async (id) => {
    set({
      groups: get().groups.filter((g) => g.id !== id),
      accounts: get().accounts.filter((a) => a.group_id !== id),
    })
    await supabase.from('email_groups').delete().eq('id', id)
  },

  addAccount: async (groupId, fields) => {
    const { data, error } = await supabase
      .from('email_accounts')
      .insert({
        group_id: groupId,
        sort: get().accounts.filter((a) => a.group_id === groupId).length,
        ...fields,
      })
      .select('*')
      .single()
    if (error || !data) {
      set({ error: error?.message ?? null })
      return null
    }
    set({ accounts: [...get().accounts, data as EmailAccount] })
    return data as EmailAccount
  },

  updateAccount: async (id, patch) => {
    const previous = get().accounts
    set({ accounts: previous.map((a) => (a.id === id ? { ...a, ...patch } : a)) })
    const { error } = await supabase.from('email_accounts').update(patch).eq('id', id)
    if (error) {
      set({ accounts: previous, error: error.message })
      return { error: error.message }
    }
    return { error: null }
  },

  removeAccount: async (id) => {
    set({ accounts: get().accounts.filter((a) => a.id !== id) })
    await supabase.from('email_accounts').delete().eq('id', id)
  },

  subscribe: () => {
    const ch = supabase
      .channel('emails-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'email_groups' }, () =>
        get().load(),
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'email_accounts' }, () =>
        get().load(),
      )
      .subscribe()
    return () => {
      supabase.removeChannel(ch)
    }
  },
}))
