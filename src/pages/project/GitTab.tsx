import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, ExternalLink, GitCommitHorizontal, Pencil } from 'lucide-react'
import { useProjects } from '@/store/useProjects'
import { useSettings, getGithubToken } from '@/store/useSettings'
import { fetchCommits, type GithubCommit } from '@/lib/github'
import { Input } from '@/components/ui-lite'

function timeAgo(iso: string) {
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60) return 'just now'
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  if (s < 2592000) return `${Math.floor(s / 86400)}d ago`
  return new Date(iso).toLocaleDateString()
}

export function GitTab({ projectId }: { projectId: string }) {
  const { projects, update } = useProjects()
  const { githubTokenSet, loaded: settingsLoaded, load: loadSettings } = useSettings()
  const project = projects.find((p) => p.id === projectId)

  const [editing, setEditing] = useState(false)
  const [repoDraft, setRepoDraft] = useState(project?.github_repo ?? '')
  const [commits, setCommits] = useState<GithubCommit[]>([])
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!settingsLoaded) loadSettings()
  }, [settingsLoaded, loadSettings])

  const load = async (repo: string, targetPage: number, append: boolean) => {
    setLoading(true)
    setError(null)
    const token = await getGithubToken()
    if (!token) {
      setError('No GitHub token configured yet.')
      setLoading(false)
      return
    }
    try {
      const { commits: page1, hasMore: more } = await fetchCommits(repo, token, targetPage)
      setCommits((prev) => (append ? [...prev, ...page1] : page1))
      setHasMore(more)
      setPage(targetPage)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load commits.')
    }
    setLoading(false)
  }

  useEffect(() => {
    if (project?.github_repo && githubTokenSet) {
      void load(project.github_repo, 1, false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project?.github_repo, githubTokenSet])

  if (!project) return null

  const saveRepo = async (e: React.FormEvent) => {
    e.preventDefault()
    await update(projectId, { github_repo: repoDraft.trim() || null })
    setEditing(false)
  }

  if (!githubTokenSet) {
    return (
      <div className="flex items-start gap-2 rounded-md border border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
        <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
        <span>
          No GitHub token configured. Add one in{' '}
          <Link to="/app/settings" className="text-link underline">
            Settings
          </Link>{' '}
          to view commit history here.
        </span>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Git history
        </h2>
        {!editing && project.github_repo && (
          <>
            <span className="text-xs text-muted-foreground">{project.github_repo}</span>
            <a
              href={`https://github.com/${project.github_repo}`}
              target="_blank"
              rel="noreferrer"
              className="text-muted-foreground hover:text-foreground"
            >
              <ExternalLink className="size-3" />
            </a>
            <button
              type="button"
              onClick={() => {
                setRepoDraft(project.github_repo ?? '')
                setEditing(true)
              }}
              className="text-muted-foreground hover:text-foreground"
            >
              <Pencil className="size-3" />
            </button>
          </>
        )}
      </div>

      {(editing || !project.github_repo) && (
        <form onSubmit={saveRepo} className="flex items-center gap-1.5">
          <Input
            autoFocus
            value={repoDraft}
            onChange={(e) => setRepoDraft(e.target.value)}
            placeholder="owner/repo or https://github.com/owner/repo"
            className="max-w-xs"
          />
          <button className="h-7 shrink-0 rounded-md bg-primary px-2.5 text-xs font-medium text-primary-foreground hover:bg-primary/90">
            Save
          </button>
          {editing && (
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="h-7 shrink-0 rounded-md px-2 text-xs text-muted-foreground hover:bg-muted"
            >
              Cancel
            </button>
          )}
        </form>
      )}

      {error && (
        <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-2.5 py-1.5 text-xs text-destructive">
          <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
          {error}
        </div>
      )}

      {project.github_repo && !editing && (
        <div className="divide-y divide-border rounded-md border border-border">
          {commits.map((c) => (
            <a
              key={c.sha}
              href={c.url}
              target="_blank"
              rel="noreferrer"
              className="group flex items-center gap-2 px-2 py-1 text-sm hover:bg-muted/40"
            >
              <GitCommitHorizontal className="size-3.5 shrink-0 text-muted-foreground" />
              <span className="min-w-0 flex-1 truncate group-hover:underline">{c.message}</span>
              <span className="shrink-0 text-xs text-muted-foreground">{c.authorLogin ?? c.authorName}</span>
              <span className="w-14 shrink-0 text-right text-xs text-muted-foreground">
                {timeAgo(c.date)}
              </span>
              <code className="shrink-0 text-[11px] text-muted-foreground">{c.sha.slice(0, 7)}</code>
            </a>
          ))}
          {commits.length === 0 && !loading && !error && (
            <p className="px-2 py-6 text-center text-xs text-muted-foreground">No commits found.</p>
          )}
          {loading && (
            <p className="px-2 py-3 text-center text-xs text-muted-foreground">Loading…</p>
          )}
        </div>
      )}

      {project.github_repo && !editing && hasMore && !loading && (
        <button
          type="button"
          onClick={() => load(project.github_repo!, page + 1, true)}
          className="h-7 w-full rounded-md border border-border text-xs text-muted-foreground hover:bg-muted"
        >
          Load more
        </button>
      )}
    </div>
  )
}
