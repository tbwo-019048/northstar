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
    <div className="flex min-h-[calc(100svh-8rem)] w-full flex-col gap-6">
      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Welcome back, {name}.</h1>

      <div className="grid flex-1 gap-8 lg:grid-cols-[3fr_2fr]">
        <section className="flex flex-col gap-3">
          <div className="flex items-baseline justify-center gap-2">
            <span className="text-5xl font-semibold tabular-nums">{clients.length}</span>
            <span className="text-xs uppercase tracking-wide text-muted-foreground">
              client{clients.length === 1 ? '' : 's'}
            </span>
          </div>
          <div className="flex-1 text-muted-foreground">
            <WorldMap highlight={projectCountries} className="h-full w-full" />
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

        <section className="flex flex-col gap-3">
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
          <div className="rounded-xl border border-border bg-panel p-3">
            <GithubCalendar counts={counts} />
          </div>
        </section>
      </div>
    </div>
  )
}
