import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const supabaseConfigured = Boolean(url && anonKey)

if (!supabaseConfigured) {
  console.warn(
    '[NorthStar] Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. ' +
      'These are inlined at BUILD time — set them in your host (e.g. Vercel → Project → ' +
      'Settings → Environment Variables) and trigger a new deploy.',
  )
}

// Fall back to harmless placeholders so `createClient` does not throw at module
// load — the app renders a config screen instead of a blank page.
export const supabase = createClient(
  url || 'https://placeholder.supabase.co',
  anonKey || 'placeholder-anon-key',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  },
)

export const APP_ACCESS_TOKEN = (import.meta.env.VITE_APP_ACCESS_TOKEN as string) ?? ''
