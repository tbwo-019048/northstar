import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronLeft, GitBranch, ShieldAlert } from 'lucide-react'
import { useAuth } from '@/store/useAuth'
import { useSettings } from '@/store/useSettings'
import { Input } from '@/components/ui-lite'
import { MembersSettings } from '@/components/MembersSettings'

export function Settings() {
  const isMaster = useAuth((s) => s.isMaster)
  const { githubTokenSet, loaded, load, saveGithubToken, clearGithubToken } = useSettings()
  const [token, setToken] = useState('')
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!loaded) load()
  }, [loaded, load])

  const onSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token.trim()) return
    setError(null)
    const { error: err } = await saveGithubToken(token.trim())
    if (err) {
      setError(err)
      return
    }
    setToken('')
    setStatus('Token saved.')
  }

  const onClear = async () => {
    if (!confirm('Remove the stored GitHub token? Git history tabs will stop loading until a new one is added.'))
      return
    await clearGithubToken()
    setStatus('Token removed.')
  }

  return (
    <div className="max-w-lg space-y-4">
      <div className="flex items-center gap-2">
        <Link
          to="/app"
          className="grid size-6 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <ChevronLeft className="size-4" />
        </Link>
        <h1 className="text-sm font-semibold">Settings</h1>
      </div>

      <section className="space-y-2 rounded-md border border-border p-3">
        <h2 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <GitBranch className="size-3.5" /> GitHub
        </h2>
        <p className="text-xs text-muted-foreground">
          Add a personal access token to link a repo to any project and view its commit history in
          the project's <strong>Git</strong> tab. A fine-grained token scoped to just the repos you
          need, with read-only <em>Contents</em> access, is enough.
        </p>

        <div className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 p-2 text-xs text-amber-700 dark:text-amber-400">
          <ShieldAlert className="mt-0.5 size-3.5 shrink-0" />
          <span>
            NorthStar is a shared workspace — this token is stored in the database and readable by
            anyone signed in to this app, not just you. Don't use a token with more access than you'd
            hand to every other person who can log in here.
          </span>
        </div>

        {isMaster ? (
          <>
            <form onSubmit={onSave} className="flex items-center gap-2">
              <Input
                type="password"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder={githubTokenSet ? 'Token saved — enter a new one to replace it' : 'ghp_… or github_pat_…'}
                className="max-w-sm"
              />
              <button className="h-7 shrink-0 rounded-md bg-primary px-2.5 text-xs font-medium text-primary-foreground hover:bg-primary/90">
                Save
              </button>
              {githubTokenSet && (
                <button
                  type="button"
                  onClick={onClear}
                  className="h-7 shrink-0 rounded-md px-2 text-xs text-muted-foreground hover:bg-muted"
                >
                  Remove
                </button>
              )}
            </form>
            {githubTokenSet && !status && (
              <p className="text-xs text-muted-foreground">A token is currently configured.</p>
            )}
            {status && <p className="text-xs text-primary">{status}</p>}
            {error && <p className="text-xs text-destructive">{error}</p>}
          </>
        ) : (
          <p className="text-xs text-muted-foreground">
            {githubTokenSet ? 'A token is currently configured.' : 'No token configured.'} Only the
            Master can change it.
          </p>
        )}
      </section>

      <MembersSettings />
    </div>
  )
}
