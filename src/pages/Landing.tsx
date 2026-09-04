import { Suspense, lazy } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { useAuth } from '@/store/useAuth'
import { ThemeToggle } from '@/components/ThemeToggle'
import { NorthStarIcon } from '@/components/NorthStarIcon'

// three.js is a heavy dependency purely for this decorative effect — load it
// only when someone actually lands on this page, not in the main app bundle.
const GhostCursor = lazy(() =>
  import('@/components/GhostCursor').then((m) => ({ default: m.GhostCursor })),
)

export function Landing() {
  const session = useAuth((s) => s.session)
  const gateOpen = useAuth((s) => s.gateOpen)

  return (
    <div className="min-h-svh bg-background text-foreground">
      <Suspense fallback={null}>
        <GhostCursor color="#4aacff" trailLength={40} bloomStrength={0.15} zIndex={0} />
      </Suspense>

      <div className="fixed right-4 top-4 z-10">
        <ThemeToggle />
      </div>

      <main className="relative z-10 mx-auto flex max-w-5xl flex-col items-start gap-6 px-4 pt-24">
        <div className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-widest text-muted-foreground">
          <NorthStarIcon className="size-3.5 text-primary" />
          NorthStar
        </div>
        <h1 className="max-w-2xl text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
          Projects — run with Intelligence and Efficiency.
        </h1>
        <Link
          to={session && gateOpen ? '/app' : '/login'}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          {session && gateOpen ? 'Open workspace' : 'Login'}
          <ArrowRight className="size-4" />
        </Link>
      </main>
    </div>
  )
}
