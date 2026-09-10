import { useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/store/useAuth'
import { useProjects } from '@/store/useProjects'
import { useClients } from '@/store/useClients'
import { useSettings } from '@/store/useSettings'
import { useGithubActivity, mergeCounts } from '@/store/useGithubActivity'
import { GithubCalendar } from '@/components/GithubCalendar'
import { WorldMap } from '@/components/WorldMap'

/** A ramp of blue "shades" for the map — light tints → brand → deep shades of
 * `var(--primary)`, spread evenly across `n` projects so each project's
 * countries read as its own blue. */
function projectBlue(i: number, n: number): string {
  if (n <= 1) return 'var(--primary)'
  const t = i / (n - 1) // 0 = first project … 1 = last
  if (t < 0.5) return `color-mix(in srgb, var(--primary) ${Math.round(55 + t * 90)}%, white)`
  return `color-mix(in srgb, var(--primary) ${Math.round(100 - (t - 0.5) * 80)}%, black)`
}

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
  const shadeByCountry = useMemo(() => {
    const map: Record<string, string> = {}
    const ordered = [...projects].sort((a, b) => a.position - b.position)
    ordered.forEach((p, i) => {
      const blue = projectBlue(i, ordered.length)
      for (const c of p.countries ?? []) if (!(c in map)) map[c] = blue // first project wins a shared country
    })
    return map
  }, [projects])

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
          <div className="flex items-center justify-center gap-2">
            <span className="text-5xl font-semibold leading-none tabular-nums">{clients.length}</span>
            <span className="text-xs uppercase leading-tight tracking-wide text-muted-foreground">
              client{clients.length === 1 ? '' : 's'}
            </span>
          </div>
          <div className="flex-1 text-muted-foreground">
            <WorldMap
              highlight={projectCountries}
              shadeByCountry={shadeByCountry}
              className="h-full w-full"
            />
          </div>
          <div className="flex flex-wrap justify-center gap-1">
            {projectCountries.length ? (
              projectCountries.map((c) => (
                <span
                  key={c}
                  className="inline-flex items-center gap-1 rounded bg-primary/10 px-1.5 py-0.5 text-[11px] text-primary"
                >
                  <span
                    className="inline-block size-2 rounded-full"
                    style={{ background: shadeByCountry[c] ?? 'var(--primary)' }}
                  />
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

        <section className="flex flex-col justify-center gap-3">
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
