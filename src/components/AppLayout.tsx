import { Link, Outlet, useNavigate } from 'react-router-dom'
import { Compass, LogOut } from 'lucide-react'
import { useAuth } from '@/store/useAuth'
import { ThemeToggle } from '@/components/ThemeToggle'

export function AppLayout() {
  const nav = useNavigate()
  const { user, signOut, lockGate } = useAuth()

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
    <div className="min-h-svh bg-background text-foreground">
      <header className="sticky top-0 z-20 flex h-11 items-center gap-3 border-b border-border bg-background/90 px-3 backdrop-blur">
        <Link to="/app" className="flex items-center gap-1.5 text-sm font-semibold">
          <Compass className="size-4 text-primary" />
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
        <button
          type="button"
          onClick={onLogout}
          title="Log out"
          className="grid size-7 place-items-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <LogOut className="size-4" />
        </button>
      </header>
      <main className="mx-auto max-w-6xl px-3 py-4">
        <Outlet />
      </main>
    </div>
  )
}
