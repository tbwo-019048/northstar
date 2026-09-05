import { useRef, useState } from 'react'
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

/** Everything here already autosaves — every field write goes straight to
 * Supabase. This button gives an explicit, reassuring action anyway: it
 * force-resyncs whatever's currently open (the active project if you're in
 * one, otherwise the projects list) from the server and confirms when done,
 * rather than being a no-op. */
function SaveButton() {
  const [state, setState] = useState<'idle' | 'saving' | 'saved'>('idle')
  const cloudRef = useRef<CloudArrowDownIconHandle>(null)
  const checkRef = useRef<CheckIconHandle>(null)

  const onClick = async () => {
    setState('saving')
    cloudRef.current?.startAnimation()
    const projectId = useProjectData.getState().projectId
    if (projectId) await useProjectData.getState().load(projectId)
    else await useProjects.getState().load()
    cloudRef.current?.stopAnimation()
    setState('saved')
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
  const { user, signOut, lockGate } = useAuth()
  const isHome = pathname === '/app/landing'

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
    <div className="flex min-h-svh flex-col bg-background text-foreground">
      <header className="sticky top-0 z-20 flex h-11 items-center gap-3 border-b border-border bg-panel/95 px-3 shadow-sm backdrop-blur">
        <Link to="/app" className="flex items-center gap-1.5 text-sm font-semibold">
          <NorthStarIcon className="size-4 text-primary" />
          NorthStar
        </Link>
        <div className="flex-1" />
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
            ? 'w-full flex-1 overflow-hidden'
            : 'mx-auto w-full max-w-6xl flex-1 px-3 py-4 pb-20'
        }
      >
        <Outlet />
      </main>
      {!isHome && <Footer />}
      <Dock />
    </div>
  )
}
