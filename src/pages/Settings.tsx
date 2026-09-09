import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { GitBranch, Lock, LockOpen, Wrench } from 'lucide-react'
import { ChevronLeftIcon } from '@/components/ui/chevron-left'
import { ShieldExclamationIcon } from '@/components/ui/shield-exclamation'
import { useAuth } from '@/store/useAuth'
import { useSettings } from '@/store/useSettings'
import { useProjects } from '@/store/useProjects'
import { useDiagnostic } from '@/store/useDiagnostic'
import { useGridCols } from '@/store/useGridCols'
import { SITE_TYPES } from '@/lib/types'
import { IconButton, Input } from '@/components/ui-lite'
import { MembersSettings } from '@/components/MembersSettings'

export function Settings() {
  const isMaster = useAuth((s) => s.isMaster)
  const member = useAuth((s) => s.member)
  const setDisplayName = useAuth((s) => s.setDisplayName)
  const diagnostic = useDiagnostic((s) => s.on)
  const setDiagnostic = useDiagnostic((s) => s.setOn)
  const gridCols = useGridCols((s) => s.cols)
  const setGridCols = useGridCols((s) => s.setCols)
  const { githubTokenSet, loaded, load, saveGithubToken, clearGithubToken } = useSettings()
  const [token, setToken] = useState('')
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const memberName = member?.display_name ?? ''
  const [nameDraft, setNameDraft] = useState(memberName)
  const [nameSeeded, setNameSeeded] = useState(memberName)
  const [nameStatus, setNameStatus] = useState<string | null>(null)
  if (memberName !== nameSeeded) {
    // member row arrived / changed elsewhere — adopt it as the field's baseline
    setNameSeeded(memberName)
    setNameDraft(memberName)
  }

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
    <div className="w-full space-y-5">
      <div className="flex items-start gap-3 border-b border-border pb-4">
        <Link
          to="/app"
          className="mt-0.5 grid size-7 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="Back to projects"
        >
          <ChevronLeftIcon size={16} />
        </Link>
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Settings</h1>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Manage workspace access, permissions, and connected services.
          </p>
        </div>
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(19rem,1fr)]">
        <MembersSettings />

      <div className="space-y-4 lg:sticky lg:top-15">
      <section className="space-y-3 rounded-xl border border-border bg-panel p-4 shadow-sm">
        <h2 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <Wrench className="size-3.5" /> Display
        </h2>
        <form
          className="space-y-1"
          onSubmit={async (e) => {
            e.preventDefault()
            setNameStatus(null)
            const { error: err } = await setDisplayName(nameDraft.trim())
            setNameStatus(err ?? 'Saved.')
          }}
        >
          <span className="text-sm">Display name</span>
          <div className="flex items-center gap-1.5">
            <Input value={nameDraft} onChange={(e) => setNameDraft(e.target.value)} placeholder="Your name" />
            <button className="h-7 shrink-0 rounded-md bg-primary px-2.5 text-xs font-medium text-primary-foreground hover:bg-primary/90">
              Save
            </button>
          </div>
          <span className="block text-xs text-muted-foreground">
            Shown as your name across the workspace and on the home greeting.
            {nameStatus && <em className="ml-1 not-italic text-primary">{nameStatus}</em>}
          </span>
        </form>
        <label className="flex cursor-pointer items-start gap-2 text-sm">
          <input
            type="checkbox"
            checked={diagnostic}
            onChange={(e) => setDiagnostic(e.target.checked)}
            className="mt-0.5 size-3.5 accent-primary"
          />
          <span>
            Diagnostic mode
            <span className="mt-0.5 block text-xs text-muted-foreground">
              Shows a hide checkbox on every list. Hidden items disappear when this is off. This
              setting is per-browser; the hidden items themselves are shared with everyone.
            </span>
          </span>
        </label>
        <label className="block text-sm">
          <span className="flex items-center justify-between">
            Grid columns
            <span className="tabular-nums text-muted-foreground">{gridCols}</span>
          </span>
          <input
            type="range"
            min={2}
            max={12}
            value={gridCols}
            onChange={(e) => setGridCols(Number(e.target.value))}
            className="mt-1 w-full accent-primary"
          />
          <span className="mt-0.5 block text-xs text-muted-foreground">
            Columns in the grid views on Projects, Clients and Emails.
          </span>
        </label>
      </section>

      <section className="space-y-3 rounded-xl border border-border bg-panel p-4 shadow-sm">
        <h2 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <GitBranch className="size-3.5" /> GitHub
        </h2>
        <p className="text-xs text-muted-foreground">
          Add a personal access token to link a repo to any project and view its commit history in
          the project's <strong>Git</strong> tab. A fine-grained token scoped to just the repos you
          need, with read-only <em>Contents</em> access, is enough.
        </p>

        <div className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 p-2 text-xs text-amber-700 dark:text-amber-400">
          <ShieldExclamationIcon size={14} className="mt-0.5 shrink-0" />
          <span>
            NorthStar is a shared workspace — this token is stored in the database and readable by
            anyone signed in to this app, not just you. Don't use a token with more access than you'd
            hand to every other person who can log in here.
          </span>
        </div>

        {isMaster ? (
          <>
            <form onSubmit={onSave} className="space-y-2">
              <Input
                type="password"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder={githubTokenSet ? 'Token saved — enter a new one to replace it' : 'ghp_… or github_pat_…'}
              />
              <div className="flex items-center gap-2">
                <button className="h-7 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground hover:bg-primary/90">
                  Save token
                </button>
                {githubTokenSet && (
                  <button
                    type="button"
                    onClick={onClear}
                    className="h-7 rounded-md px-2 text-xs text-muted-foreground hover:bg-muted"
                  >
                    Remove
                  </button>
                )}
              </div>
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

      <RepoTable />
      </div>
      </div>
    </div>
  )
}

function RepoTable() {
  const { projects, loaded, load, subscribe, update } = useProjects()

  useEffect(() => {
    if (!loaded) load()
    return subscribe()
  }, [loaded, load, subscribe])

  const sites = projects.filter((p) => SITE_TYPES.includes(p.type))

  return (
    <section className="space-y-3 rounded-xl border border-border bg-panel p-4 shadow-sm">
      <h2 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <GitBranch className="size-3.5" /> GitHub repositories
      </h2>
      <p className="text-xs text-muted-foreground">
        Every website / app project and the repo it tracks. Lock a repo to make it read-only on
        that project's Git tab.
      </p>
      <div className="divide-y divide-border rounded-md border border-border">
        {sites.map((p) => (
          <div key={p.id} className="flex items-center gap-2 px-2 py-1.5">
            <Link
              to={`/app/project/${p.id}/git`}
              className="w-32 shrink-0 truncate text-sm font-medium hover:underline"
            >
              {p.name}
            </Link>
            <Input
              defaultValue={p.github_repo ?? ''}
              placeholder="owner/repo"
              onBlur={(e) => {
                const v = e.target.value.trim()
                if (v !== (p.github_repo ?? '')) update(p.id, { github_repo: v || null })
              }}
              className="h-7 flex-1"
            />
            <IconButton
              title={p.github_repo_locked ? 'Unlock (editable in the project)' : 'Lock to Settings only'}
              onClick={() => update(p.id, { github_repo_locked: !p.github_repo_locked })}
              className={p.github_repo_locked ? 'text-primary' : ''}
            >
              {p.github_repo_locked ? <Lock className="size-3.5" /> : <LockOpen className="size-3.5" />}
            </IconButton>
          </div>
        ))}
        {sites.length === 0 && (
          <p className="px-2 py-4 text-center text-xs text-muted-foreground">
            No website or app projects yet.
          </p>
        )}
      </div>
    </section>
  )
}
