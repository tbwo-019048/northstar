import { supabaseConfigured } from '@/lib/supabase'

/**
 * Shown instead of a blank page when the Supabase env vars were missing at
 * build time (the usual cause: added to the host after the last deploy, or
 * missing the `VITE_` prefix / Production scope, then not redeployed).
 */
export function ConfigGate({ children }: { children: React.ReactNode }) {
  if (supabaseConfigured) return <>{children}</>

  return (
    <div className="grid min-h-svh place-items-center bg-background px-4 text-foreground">
      <div className="max-w-md space-y-3 text-sm">
        <h1 className="text-base font-semibold">NorthStar isn’t configured</h1>
        <p className="text-muted-foreground">
          The Supabase environment variables were not present when this build was created.
          Vite inlines <code className="rounded bg-muted px-1">VITE_*</code> values at build time,
          so setting them requires a fresh deploy.
        </p>
        <ol className="list-decimal space-y-1 pl-5 text-muted-foreground">
          <li>
            In your host (Vercel → Project → Settings → Environment Variables) add, for the
            <strong> Production</strong> environment:
            <ul className="mt-1 list-disc pl-5 font-mono text-xs">
              <li>VITE_SUPABASE_URL</li>
              <li>VITE_SUPABASE_ANON_KEY</li>
              <li>VITE_APP_ACCESS_TOKEN</li>
            </ul>
          </li>
          <li>Redeploy (Deployments → ⋯ → Redeploy, or push a commit).</li>
        </ol>
      </div>
    </div>
  )
}
