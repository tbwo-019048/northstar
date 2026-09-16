import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import { notifySaved, notifySaveError } from '@/store/useChangeNotifications'
import { isWorkspaceState, type WorkspaceState } from '@/lib/workspaceState'

interface SettingsState {
  githubTokenSet: boolean
  activeEnvironment: WorkspaceState
  loaded: boolean
  error: string | null
  load: () => Promise<void>
  saveGithubToken: (token: string) => Promise<{ error: string | null }>
  clearGithubToken: () => Promise<void>
  setActiveEnvironment: (environment: WorkspaceState) => Promise<{ error: string | null }>
}

export const useSettings = create<SettingsState>((set) => ({
  githubTokenSet: false,
  activeEnvironment: 'staging',
  loaded: false,
  error: null,

  load: async () => {
    const { data, error } = await supabase
      .from('app_settings')
      .select('github_token, active_environment')
      .eq('id', 'default')
      .maybeSingle()
    set({
      githubTokenSet: Boolean(data?.github_token),
      activeEnvironment: isWorkspaceState(data?.active_environment)
        ? data.active_environment
        : 'staging',
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
      notifySaveError(error.message)
      return { error: error.message }
    }
    set({ githubTokenSet: Boolean(token), error: null })
    notifySaved('GitHub token saved.')
    return { error: null }
  },

  clearGithubToken: async () => {
    const { error } = await supabase
      .from('app_settings')
      .upsert({ id: 'default', github_token: null, updated_at: new Date().toISOString() })
    if (error) notifySaveError(error.message)
    else {
      set({ githubTokenSet: false })
      notifySaved('GitHub token cleared.')
    }
  },

  setActiveEnvironment: async (environment) => {
    const previous = useSettings.getState().activeEnvironment
    set({ activeEnvironment: environment })
    const { error } = await supabase
      .from('app_settings')
      .upsert({ id: 'default', active_environment: environment, updated_at: new Date().toISOString() })
    if (error) {
      set({ activeEnvironment: previous, error: error.message })
      notifySaveError(error.message)
      return { error: error.message }
    }
    set({ error: null })
    notifySaved(`Showing ${environment === 'production' ? 'Production' : 'Staging'} content.`)
    return { error: null }
  },
}))

export function getActiveEnvironment(): WorkspaceState {
  return useSettings.getState().activeEnvironment
}

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
