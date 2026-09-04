import { create } from 'zustand'
import type { Session, User } from '@supabase/supabase-js'
import { supabase, APP_ACCESS_TOKEN } from '@/lib/supabase'

const GATE_KEY = 'northstar.gate'

interface AuthState {
  session: Session | null
  user: User | null
  ready: boolean
  gateOpen: boolean
  init: () => void
  unlockGate: (token: string) => boolean
  lockGate: () => void
  signIn: (email: string, password: string) => Promise<{ error: string | null }>
  signOut: () => Promise<void>
}

export const useAuth = create<AuthState>((set) => ({
  session: null,
  user: null,
  ready: false,
  gateOpen:
    (typeof localStorage !== 'undefined' && localStorage.getItem(GATE_KEY) === APP_ACCESS_TOKEN) ||
    !APP_ACCESS_TOKEN,

  init: () => {
    supabase.auth.getSession().then(({ data }) => {
      set({ session: data.session, user: data.session?.user ?? null, ready: true })
    })
    supabase.auth.onAuthStateChange((_event, session) => {
      set({ session, user: session?.user ?? null, ready: true })
    })
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
    set({ session: null, user: null })
  },
}))
