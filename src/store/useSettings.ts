import { create } from 'zustand'
import { supabase } from '@/lib/supabase'

interface SettingsState {
  githubTokenSet: boolean
  loaded: boolean
  error: string | null
  load: () => Promise<void>
  saveGithubToken: (token: string) => Promise<{ error: string | null }>
  clearGithubToken: () => Promise<void>
}

export const useSettings = create<SettingsState>((set) => ({
  githubTokenSet: false,
  loaded: false,
  error: null,

  load: async () => {
    const { data, error } = await supabase
      .from('app_settings')
      .select('github_token')
      .eq('id', 'default')
      .maybeSingle()
    set({
      githubTokenSet: Boolean(data?.github_token),
      loaded: true,
      error: error?.message ?? null,
    })
  },

  saveGithubToken: async (token) => {
    const { error } = await supabase
      .from('app_settings')
      .upsert({ id: 'default', github_token: token, updated_at: new Date().toISOString() })
    if (error) {
      set({ error: error.message })
      return { error: error.message }
    }
    set({ githubTokenSet: Boolean(token), error: null })
    return { error: null }
  },

  clearGithubToken: async () => {
    await supabase
      .from('app_settings')
      .upsert({ id: 'default', github_token: null, updated_at: new Date().toISOString() })
    set({ githubTokenSet: false })
  },
}))

/** Fetches the raw token for making a GitHub API call — not cached in the
 * store so it isn't sitting around in memory/devtools longer than needed. */
export async function getGithubToken(): Promise<string | null> {
  const { data } = await supabase
    .from('app_settings')
    .select('github_token')
    .eq('id', 'default')
    .maybeSingle()
  return data?.github_token ?? null
}
