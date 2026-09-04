import { Link } from 'react-router-dom'
import { ArrowRight, Compass } from 'lucide-react'
import { useAuth } from '@/store/useAuth'
import { ThemeToggle } from '@/components/ThemeToggle'

export function Landing() {
  const session = useAuth((s) => s.session)
  const gateOpen = useAuth((s) => s.gateOpen)

  return (
    <div className="min-h-svh bg-background text-foreground">
      <header className="mx-auto flex h-12 max-w-5xl items-center justify-between px-4">
        <div className="flex items-center gap-2 font-semibold">
          <Compass className="size-4 text-primary" />
          NorthStar
        </div>
        <ThemeToggle />
      </header>

      <main className="mx-auto flex max-w-5xl flex-col items-start gap-6 px-4 pt-24">
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
          Project intelligence
        </p>
        <h1 className="max-w-2xl text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
          One compact console for every project you run.
        </h1>
        <p className="max-w-xl text-sm text-muted-foreground">
          Software, physical, written or other — track people, to-dos, features, details, requests
          and pipelines in a single dense workspace that autosaves and syncs across your devices.
        </p>
        <Link
          to={session && gateOpen ? '/app' : '/login'}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          {session && gateOpen ? 'Open workspace' : 'Login'}
          <ArrowRight className="size-4" />
        </Link>

        <div className="mt-16 grid w-full grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border text-sm sm:grid-cols-4">
          {[
            ['People', 'Credentials, roles & notes'],
            ['To-dos', 'Drag between states'],
            ['Pipelines', 'Plan, export, promote'],
            ['Analysis', 'Live project summary'],
          ].map(([t, d]) => (
            <div key={t} className="bg-background p-3">
              <div className="font-medium">{t}</div>
              <div className="text-xs text-muted-foreground">{d}</div>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
