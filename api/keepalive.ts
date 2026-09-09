/**
 * Supabase keep-alive.
 *
 * Supabase pauses free-plan projects after a stretch of inactivity. A daily
 * Vercel Cron request to this route runs one trivial query so the project keeps
 * registering activity and never gets paused.
 *
 * The app is a static Vite build; this file is the server-side piece, deployed
 * as a Vercel Serverless Function (Node). Vercel Cron automatically sends
 * `Authorization: Bearer <CRON_SECRET>` when the CRON_SECRET environment
 * variable is set on the project; the check below rejects anything else.
 *
 * GET /api/keepalive
 */
import { createClient } from "@supabase/supabase-js"

const SUPABASE_URL =
  process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? ""
const SUPABASE_ANON_KEY =
  process.env.SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY ?? ""

// Minimal request/response typing so this compiles without @vercel/node.
type Req = {
  method?: string
  headers: Record<string, string | string[] | undefined>
}
type Res = {
  status: (code: number) => Res
  json: (body: unknown) => void
}

export default async function handler(req: Req, res: Res) {
  if (req.method && req.method !== "GET") {
    res.status(405).json({ ok: false, error: "Method not allowed." })
    return
  }

  const raw = req.headers["authorization"]
  const authHeader = Array.isArray(raw) ? raw[0] : raw ?? ""
  if (authHeader !== `Bearer ${process.env.CRON_SECRET ?? ""}`) {
    res.status(401).json({ ok: false, error: "Unauthorized" })
    return
  }

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    res.status(500).json({ ok: false, error: "Supabase is not configured." })
    return
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { error } = await supabase.from("app_settings").select("id").limit(1)

  if (error) {
    res.status(500).json({ ok: false, error: error.message })
    return
  }

  res.status(200).json({ ok: true, checkedAt: new Date().toISOString() })
}
