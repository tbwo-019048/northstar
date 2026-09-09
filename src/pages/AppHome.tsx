import { useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/store/useAuth'
import { useProjects } from '@/store/useProjects'
import { useClients } from '@/store/useClients'
import { useSettings } from '@/store/useSettings'
import { useGithubActivity, mergeCounts } from '@/store/useGithubActivity'
import { GithubCalendar } from '@/components/GithubCalendar'
import { WorldMap } from '@/components/WorldMap'

/** Authenticated home — where your projects are (left) and your GitHub
 * activity (right). */
export function AppHome() {
  const user = useAuth((s) => s.user)
  const member = useAuth((s) => s.member)
  const { projects, loaded: projectsLoaded, load: loadProjects, subscribe } = useProjects()
  const { clients, loaded: clientsLoaded, load: loadClients, subscribe: subscribeClients } = useClients()
  const { loaded: settingsLoaded, load: loadSettings } = useSettings()
  const byRepo = useGithubActivity((s) => s.byRepo)
  const loadGithub = useGithubActivity((s) => s.load)

  useEffect(() => {
    if (!projectsLoaded) void loadProjects()
    return subscribe()
  }, [projectsLoaded, loadProjects, subscribe])

  useEffect(() => {
    if (!clientsLoaded) void loadClients()
    return subscribeClients()
  }, [clientsLoaded, loadClients, subscribeClients])

  useEffect(() => {
    if (!settingsLoaded) void loadSettings()
  }, [settingsLoaded, loadSettings])

  const repos = useMemo(
    () => [...new Set(projects.map((p) => p.github_repo).filter(Boolean) as string[])],
    [projects],
  )
  const projectCountries = useMemo(
    () => [...new Set(projects.flatMap((p) => p.countries ?? []))].sort((a, b) => a.localeCompare(b)),
    [projects],
  )

  useEffect(() => {
    if (repos.length) void loadGithub(repos)
  }, [repos, loadGithub])

  const name = member?.display_name?.trim() || user?.email?.split('@')[0] || 'there'
  const counts = mergeCounts(byRepo, repos)
  const total = Object.values(counts).reduce((a, b) => a + b, 0)
  const anyData = repos.some((r) => Array.isArray(byRepo[r]))

  return (
    <div className="mx-auto w-full max-w-6xl space-y-5 px-1 py-2">
      <h1 className="text-2xl font-semibold tracking-tight">Welcome back, {name}.</h1>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="space-y-3">
          <div className="text-center">
            <div className="text-4xl font-semibold tabular-nums">{clients.length}</div>
            <div className="text-xs uppercase tracking-wide text-muted-foreground">
              client{clients.length === 1 ? '' : 's'}
            </div>
          </div>
          <div className="text-muted-foreground">
            <WorldMap highlight={projectCountries} />
          </div>
          <div className="flex flex-wrap justify-center gap-1">
            {projectCountries.length ? (
              projectCountries.map((c) => (
                <span key={c} className="rounded bg-primary/10 px-1.5 py-0.5 text-[11px] text-primary">
                  {c}
                </span>
              ))
            ) : (
              <span className="text-xs text-muted-foreground">
                No project locations yet — add countries on a project's Details tab.
              </span>
            )}
          </div>
        </section>

        <section className="space-y-2">
          <p className="text-sm text-muted-foreground">
            {anyData ? (
              <>
                {total.toLocaleString()} commit{total === 1 ? '' : 's'} across {repos.length} linked
                repo{repos.length === 1 ? '' : 's'} in the last year.
              </>
            ) : (
              <>
                Add a GitHub token in{' '}
                <Link to="/app/settings" className="text-link underline">
                  Settings
                </Link>{' '}
                and link a repo on each project's Git tab to see activity here.
              </>
            )}
          </p>
          <GithubCalendar counts={counts} />
        </section>
      </div>
    </div>
  )
}
