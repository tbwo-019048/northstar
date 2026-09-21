import { useEffect, useRef, useState } from 'react'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@/store/useAuth'
import { useProjects } from '@/store/useProjects'
import { useProjectData } from '@/store/useProjectData'
import { ThemeToggle } from '@/components/ThemeToggle'
import { NorthStarIcon } from '@/components/NorthStarIcon'
import { Dock } from '@/components/Dock'
import { Footer } from '@/components/Footer'
import { CloudArrowDownIcon, type CloudArrowDownIconHandle } from '@/components/ui/cloud-arrow-down'
import { CheckIcon, type CheckIconHandle } from '@/components/ui/check'
import { ArrowRightStartOnRectangleIcon } from '@/components/ui/arrow-right-start-on-rectangle'
import { notifySaved } from '@/store/useChangeNotifications'
import { useSettings } from '@/store/useSettings'
import { useClients } from '@/store/useClients'
import { useEmails } from '@/store/useEmails'
import { useItems } from '@/store/useItems'
import { useTemplates } from '@/store/useTemplates'
import { useNotes } from '@/store/useNotes'
import { useTopics } from '@/store/useTopics'
import { useTags } from '@/store/useTags'
import { WORKSPACE_STATE_LABEL } from '@/lib/workspaceState'

/** Everything here already autosaves — every field write goes straight to
 * Supabase. This button gives an explicit, reassuring action anyway: it
 * force-resyncs whatever's currently open (the active project, Notes,
 * Topics, or otherwise the projects list) from the server and confirms when
 * done, rather than being a no-op. */
function SaveButton() {
  const { pathname } = useLocation()
  const [state, setState] = useState<'idle' | 'saving' | 'saved'>('idle')
  const cloudRef = useRef<CloudArrowDownIconHandle>(null)
  const checkRef = useRef<CheckIconHandle>(null)

  const onClick = async () => {
    setState('saving')
    cloudRef.current?.startAnimation()
    const projectId = useProjectData.getState().projectId
    if (pathname.startsWith('/app/notes')) await useNotes.getState().load()
    else if (pathname.startsWith('/app/topics')) {
      await Promise.all([useTopics.getState().load(), useTags.getState().load()])
    } else if (projectId) await useProjectData.getState().load(projectId)
    else await useProjects.getState().load()
    cloudRef.current?.stopAnimation()
    setState('saved')
    notifySaved('Workspace synced with the server.', true)
    checkRef.current?.startAnimation()
    setTimeout(() => setState('idle'), 1200)
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={state === 'saving'}
      title="Save"
      className="grid size-7 place-items-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-60"
    >
      {state === 'saved' ? (
        <CheckIcon ref={checkRef} size={16} className="text-primary" />
      ) : (
        <CloudArrowDownIcon ref={cloudRef} size={16} />
      )}
    </button>
  )
}

export function AppLayout() {
  const nav = useNavigate()
  const { pathname } = useLocation()
  const isHome = pathname === '/app/landing'
  const { user, signOut, lockGate } = useAuth()
  const { activeEnvironment, loaded: settingsLoaded, load: loadSettings } = useSettings()

  useEffect(() => {
    if (!settingsLoaded) void loadSettings()
  }, [settingsLoaded, loadSettings])

  useEffect(() => {
    if (!settingsLoaded) return
    if (useProjects.getState().loaded) void useProjects.getState().load()
    if (useClients.getState().loaded) void useClients.getState().load()
    if (useEmails.getState().loaded) void useEmails.getState().load()
    if (useItems.getState().loaded) void useItems.getState().load()
    if (useTemplates.getState().loaded) void useTemplates.getState().load()
    if (useNotes.getState().loaded) void useNotes.getState().load()
    if (useTopics.getState().loaded) void useTopics.getState().load()
    if (useTags.getState().loaded) void useTags.getState().load()
    const projectId = useProjectData.getState().projectId
    if (projectId) void useProjectData.getState().load(projectId)
  }, [activeEnvironment, settingsLoaded])

  const initials = (user?.email ?? '?')
    .split('@')[0]
    .split(/[.\-_]/)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join('')

  const onLogout = async () => {
    await signOut()
    lockGate()
    nav('/login', { replace: true })
  }

  return (
    <div className="flex min-h-svh flex-col overflow-x-hidden bg-background text-foreground">
      <header className="sticky top-0 z-20 flex h-11 items-center gap-3 border-b border-border bg-panel/95 px-3 shadow-sm backdrop-blur">
        <Link to="/app" className="flex items-center gap-1.5 text-sm font-semibold">
          <NorthStarIcon className="size-4 text-primary" />
          NorthStar
        </Link>
        <div className="flex-1" />
        <button
          type="button"
          onClick={() =>
            void useSettings
              .getState()
              .setActiveEnvironment(activeEnvironment === 'production' ? 'staging' : 'production')
          }
          title="Click to switch workspace state"
          className={
            'rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide transition-colors ' +
            (activeEnvironment === 'production'
              ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
              : 'border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300')
          }
        >
          {WORKSPACE_STATE_LABEL[activeEnvironment]}
        </button>
        <div
          className="grid size-7 place-items-center rounded-full bg-primary/10 text-[11px] font-semibold text-primary"
          title={user?.email ?? ''}
        >
          {initials || 'U'}
        </div>
        <ThemeToggle />
        <SaveButton />
        <button
          type="button"
          onClick={onLogout}
          title="Log out"
          className="grid size-7 place-items-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <ArrowRightStartOnRectangleIcon size={16} />
        </button>
      </header>
      <main
        className={
          isHome
            ? 'w-full flex-1 px-4 py-4 pb-20 sm:px-6'
            : 'mx-auto w-full max-w-6xl flex-1 px-3 py-4 pb-20'
        }
      >
        {settingsLoaded ? (
          <Outlet />
        ) : (
          <div className="grid h-40 place-items-center text-sm text-muted-foreground">Loading…</div>
        )}
      </main>
      <Footer />
      <Dock />
    </div>
  )
}
