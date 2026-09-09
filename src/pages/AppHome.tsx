import { lazy, Suspense } from 'react'
import { NorthStarIcon } from '@/components/NorthStarIcon'
import { useTheme } from '@/store/useTheme'

const PhotonBeam = lazy(() => import('@/components/ui/photon-beam'))

/** Atmospheric authenticated home, distinct from the public marketing page. */
export function AppHome() {
  const theme = useTheme((state) => state.theme)

  return (
    <div
      className={
        'relative h-[calc(100svh-2.75rem)] w-full overflow-hidden ' +
        (theme === 'dark' ? 'bg-[#050708]' : 'bg-[#e5f1ff]')
      }
    >
      <Suspense
        fallback={
          <div className={theme === 'dark' ? 'absolute inset-0 bg-[#050708]' : 'absolute inset-0 bg-[#e5f1ff]'} />
        }
      >
        <div className="absolute inset-0">
          <PhotonBeam
            colorBg={theme === 'dark' ? '#050708' : '#e5f1ff'}
            colorLine={theme === 'dark' ? '#12366b' : '#2563eb'}
            colorSignal={theme === 'dark' ? '#7dd3fc' : '#0756b8'}
            colorSignal2={theme === 'dark' ? '#1d4ed8' : '#0284c7'}
            useColor2
            lineCount={80}
            spreadHeight={48}
            lineOpacity={theme === 'dark' ? 0.557 : 0.72}
            signalCount={94}
            speedGlobal={0.345}
            trailLength={3}
            bloomStrength={theme === 'dark' ? 2.4 : 0}
            bloomRadius={0.5}
          />
        </div>
      </Suspense>
      <div
        className={
          'pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b to-transparent ' +
          (theme === 'dark' ? 'from-black/35' : 'from-white/70')
        }
      />
      <div
        className={
          'pointer-events-none absolute left-6 top-6 z-10 sm:left-8 sm:top-8 ' +
          (theme === 'dark' ? 'text-white' : 'text-slate-950')
        }
      >
        <p
          className={
            'text-xs font-medium uppercase tracking-[0.28em] ' +
            (theme === 'dark' ? 'text-white/50' : 'text-slate-600')
          }
        >
          NorthStar
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">Leading the way.</h1>
      </div>
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <NorthStarIcon
          className={
            'w-[min(52vw,68vh)] ' +
            (theme === 'dark'
              ? 'drop-shadow-[0_0_80px_rgba(56,169,226,0.4)]'
              : 'drop-shadow-[0_0_60px_rgba(37,99,235,0.25)]')
          }
        />
      </div>
    </div>
  )
}
