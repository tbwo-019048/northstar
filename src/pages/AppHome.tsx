import { lazy, Suspense, useEffect, useMemo } from 'react'
import { CountryGlobe, type CountryGlobeEntry } from '@/components/CountryGlobe'
import { useClients } from '@/store/useClients'
import { useProjects } from '@/store/useProjects'

const PhotonBeam = lazy(() => import('@/components/ui/photon-beam'))

/** Atmospheric authenticated home, distinct from the public marketing page. */
export function AppHome() {
  const { clients, loaded: clientsLoaded, load: loadClients, subscribe: subscribeClients } = useClients()
  const { projects, loaded: projectsLoaded, load: loadProjects, subscribe: subscribeProjects } = useProjects()

  useEffect(() => {
    if (!clientsLoaded) void loadClients()
    const unsubscribe = subscribeClients()
    return unsubscribe
  }, [clientsLoaded, loadClients, subscribeClients])

  useEffect(() => {
    if (!projectsLoaded) void loadProjects()
    const unsubscribe = subscribeProjects()
    return unsubscribe
  }, [projectsLoaded, loadProjects, subscribeProjects])

  const globeEntries = useMemo<CountryGlobeEntry[]>(
    () => [
      ...clients.flatMap((client) =>
        (client.countries ?? []).map((country) => ({
          id: client.id,
          country,
          kind: 'client' as const,
          label: client.name || client.company || 'Client',
        })),
      ),
      ...projects.flatMap((project) =>
        (project.countries ?? []).map((country) => ({
          id: project.id,
          country,
          kind: 'project' as const,
          label: project.name,
        })),
      ),
    ],
    [clients, projects],
  )

  return (
    <div className="grid h-[calc(100svh-2.75rem)] w-full grid-cols-3 overflow-hidden bg-[#050708]">
      <section className="relative col-span-2 overflow-hidden">
        <Suspense fallback={<div className="absolute inset-0 bg-[#050708]" />}>
          <div className="absolute inset-0">
            <PhotonBeam
              colorBg="#050708"
              colorLine="#12366b"
              colorSignal="#7dd3fc"
              colorSignal2="#1d4ed8"
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
        <div className="pointer-events-none absolute inset-y-0 left-1/2 border-l border-white/5" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/35 to-transparent" />
        <div className="pointer-events-none absolute left-6 top-6 text-white sm:left-8 sm:top-8">
          <p className="text-xs font-medium uppercase tracking-[0.28em] text-white/50">NorthStar</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">Leading the way.</h1>
        </div>
      </section>
      <CountryGlobe entries={globeEntries} />
    </div>
  )
}
