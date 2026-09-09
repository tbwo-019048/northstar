import { useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/store/useAuth'
import { useProjects } from '@/store/useProjects'
import { useSettings } from '@/store/useSettings'
import { useGithubActivity, mergeCounts } from '@/store/useGithubActivity'
import { GithubCalendar } from '@/components/GithubCalendar'

/** Authenticated home — a welcome and a GitHub contribution calendar built
 * from every project's linked repo. */
export function AppHome() {
  const user = useAuth((s) => s.user)
  const member = useAuth((s) => s.member)
  const { projects, loaded: projectsLoaded, load: loadProjects, subscribe } = useProjects()
  const { loaded: settingsLoaded, load: loadSettings } = useSettings()
  const byRepo = useGithubActivity((s) => s.byRepo)
  const loadGithub = useGithubActivity((s) => s.load)

  useEffect(() => {
    if (!projectsLoaded) void loadProjects()
    return subscribe()
  }, [projectsLoaded, loadProjects, subscribe])

  useEffect(() => {
    if (!settingsLoaded) void loadSettings()
  }, [settingsLoaded, loadSettings])

  const repos = useMemo(
    () => [...new Set(projects.map((p) => p.github_repo).filter(Boolean) as string[])],
    [projects],
  )

  useEffect(() => {
    if (repos.length) void loadGithub(repos)
  }, [repos, loadGithub])

  const name =
    member?.display_name?.trim() || user?.email?.split('@')[0] || 'there'
  const counts = mergeCounts(byRepo, repos)
  const total = Object.values(counts).reduce((a, b) => a + b, 0)
  const anyData = repos.some((r) => Array.isArray(byRepo[r]))

  return (
    <div className="grid min-h-[calc(100svh-6rem)] place-items-center px-4">
      <div className="w-full max-w-3xl space-y-4 text-center">
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Welcome back, {name}.</h1>
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
        <div className="flex justify-center">
          <GithubCalendar counts={counts} />
        </div>
      </div>
    </div>
  )
}
