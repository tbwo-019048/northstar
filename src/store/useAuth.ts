import { create } from 'zustand'
import type { Session, User } from '@supabase/supabase-js'
import { supabase, APP_ACCESS_TOKEN } from '@/lib/supabase'
import type { Member } from '@/lib/types'

const GATE_KEY = 'northstar.gate'

interface AuthState {
  session: Session | null
  user: User | null
  member: Member | null
  isMaster: boolean
  ready: boolean
  gateOpen: boolean
  init: () => void
  unlockGate: (token: string) => boolean
  lockGate: () => void
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
  refreshMember: () => Promise<void>
}

export const useAuth = create<AuthState>((set, get) => ({
  session: null,
  user: null,
  member: null,
  isMaster: false,
  ready: false,
  gateOpen:
    (typeof localStorage !== 'undefined' && localStorage.getItem(GATE_KEY) === APP_ACCESS_TOKEN) ||
    !APP_ACCESS_TOKEN,

  init: () => {
    supabase.auth.getSession().then(({ data }) => {
      set({ session: data.session, user: data.session?.user ?? null, ready: true })
      get().refreshMember()
    })
    supabase.auth.onAuthStateChange((_event, session) => {
      set({ session, user: session?.user ?? null, ready: true })
      get().refreshMember()
    })
  },

  refreshMember: async () => {
    const email = get().user?.email
    if (!email) {
      set({ member: null, isMaster: false })
      return
    }
    const { data } = await supabase.from('members').select('*').eq('email', email).maybeSingle()
    const member = (data as Member) ?? null
    set({ member, isMaster: Boolean(member?.is_master) })
  },

  unlockGate: (token: string) => {
    if (APP_ACCESS_TOKEN && token.trim() !== APP_ACCESS_TOKEN) return false
    try {
      localStorage.setItem(GATE_KEY, APP_ACCESS_TOKEN)
    } catch {
      /* ignore */
    }
    set({ gateOpen: true })
    return true
  },

  lockGate: () => {
    try {
      localStorage.removeItem(GATE_KEY)
    } catch {
      /* ignore */
    }
    set({ gateOpen: false })
  },

  signIn: async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    return { error: error?.message ?? null }
  },

  signOut: async () => {
    await supabase.auth.signOut()
    set({ session: null, user: null, member: null, isMaster: false })
  },
}))
