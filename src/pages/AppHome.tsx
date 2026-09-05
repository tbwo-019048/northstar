import { lazy, Suspense } from 'react'

const PhotonBeam = lazy(() => import('@/components/ui/photon-beam'))

/** Atmospheric authenticated home, distinct from the public marketing page. */
export function AppHome() {
  return (
    <div className="relative min-h-[calc(100svh-9rem)] overflow-hidden rounded-xl border border-white/10 bg-[#050708]">
      <Suspense fallback={<div className="absolute inset-0 bg-[#050708]" />}>
        <div className="absolute inset-0">
          <PhotonBeam
            colorBg="#050708"
            colorLine="#103944"
            colorSignal="#37d8c5"
            colorSignal2="#adfa1f"
            useColor2
            lineCount={80}
            spreadHeight={48}
            signalCount={94}
            speedGlobal={0.345}
            trailLength={3}
            bloomStrength={2.4}
            bloomRadius={0.5}
          />
        </div>
      </Suspense>
      <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/35 to-transparent" />
      <div className="pointer-events-none absolute left-6 top-6 text-white sm:left-8 sm:top-8">
        <p className="text-xs font-medium uppercase tracking-[0.28em] text-white/50">NorthStar</p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">Leading the way.</h1>
      </div>
    </div>
  )
}
