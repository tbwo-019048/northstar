import { useEffect, useRef } from 'react'
import { geoCentroid, geoDistance, geoOrthographic, geoPath } from 'd3-geo'
import { feature } from 'topojson-client'
import type { FeatureCollection, Geometry } from 'geojson'
import atlas from 'world-atlas/countries-50m.json'

export interface CountryGlobeEntry {
  id: string
  country: string
  kind: 'client' | 'project'
  label: string
}

interface CountryGlobeProps {
  entries: CountryGlobeEntry[]
  theme: 'light' | 'dark'
}

const WIDTH = 420
const HEIGHT = 570
const CENTER_X = WIDTH / 2
const CENTER_Y = 285
const RADIUS = 168
const START_ROTATION = -10
const ROTATION_DEGREES_PER_MS = 0.0025
const FRAME_INTERVAL_MS = 100
const COLORS = ['#7dd3fc', '#38bdf8', '#2563eb', '#1d4ed8', '#60a5fa', '#0ea5e9']

const collection = feature(
  atlas as unknown as Parameters<typeof feature>[0],
  atlas.objects.countries as unknown as Parameters<typeof feature>[1],
) as unknown as FeatureCollection<Geometry, { name?: string }>

export function CountryGlobe({ entries, theme }: CountryGlobeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')
    if (!canvas || !context) return

    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2)
    canvas.width = WIDTH * pixelRatio
    canvas.height = HEIGHT * pixelRatio
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0)

    const selectedCountries = new Set(entries.map((entry) => entry.country))
    const countryColor = new Map(
      [...selectedCountries].map((country, index) => [country, COLORS[index % COLORS.length]]),
    )
    const startedAt = performance.now()
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let animationFrame = 0
    let lastDrawnAt = -Infinity

    const draw = (now: number) => {
      if (now - lastDrawnAt < FRAME_INTERVAL_MS) {
        animationFrame = window.requestAnimationFrame(draw)
        return
      }
      lastDrawnAt = now

      const rotation = reduceMotion
        ? START_ROTATION
        : (START_ROTATION + (now - startedAt) * ROTATION_DEGREES_PER_MS) % 360
      const projection = geoOrthographic()
        .translate([CENTER_X, CENTER_Y])
        .scale(RADIUS)
        .rotate([rotation, -12])
        .clipAngle(90)
        .precision(0.55)
      const path = geoPath(projection).context(context)
      const centre: [number, number] = [-rotation, 12]

      context.clearRect(0, 0, WIDTH, HEIGHT)

      const ocean = context.createRadialGradient(
        CENTER_X - 58,
        CENTER_Y - 72,
        8,
        CENTER_X,
        CENTER_Y,
        RADIUS,
      )
      ocean.addColorStop(0, theme === 'dark' ? '#12366b' : '#dbeafe')
      ocean.addColorStop(0.58, theme === 'dark' ? '#071a38' : '#bfdbfe')
      ocean.addColorStop(1, theme === 'dark' ? '#020817' : '#93c5fd')

      context.save()
      context.shadowColor = theme === 'dark' ? 'rgba(14, 165, 233, 0.35)' : 'rgba(37, 99, 235, 0.2)'
      context.shadowBlur = 16
      context.beginPath()
      context.arc(CENTER_X, CENTER_Y, RADIUS, 0, Math.PI * 2)
      context.fillStyle = ocean
      context.fill()
      context.strokeStyle = 'rgba(56, 189, 248, 0.36)'
      context.lineWidth = 1.2
      context.stroke()
      context.restore()

      for (const country of collection.features) {
        const name = country.properties?.name ?? ''
        const active = selectedCountries.has(name)
        context.beginPath()
        path(country)
        context.fillStyle = active
          ? (countryColor.get(name) ?? '#38bdf8')
          : theme === 'dark'
            ? '#10294d'
            : '#eff6ff'
        context.globalAlpha = active ? 0.9 : 0.66
        context.fill()
        context.strokeStyle = active ? (theme === 'dark' ? '#dbeafe' : '#1e3a8a') : '#3b82f6'
        context.globalAlpha = active ? 0.74 : 0.2
        context.lineWidth = active ? 0.8 : 0.45
        context.stroke()
      }
      context.globalAlpha = 1

      entries.forEach((entry, index) => {
        const country = collection.features.find((item) => item.properties?.name === entry.country)
        if (!country) return
        const centroid = geoCentroid(country)
        if (geoDistance(centroid, centre) >= Math.PI / 2) return
        const point = projection(centroid)
        if (!point) return

        const occurrences = entries
          .slice(0, index)
          .filter((item) => item.country === entry.country).length
        const angle =
          Math.atan2(point[1] - CENTER_Y, point[0] - CENTER_X) + (occurrences - 1) * 0.075
        const endRadius = RADIUS + 34 + occurrences * 7
        const endX = CENTER_X + Math.cos(angle) * endRadius
        const endY = CENTER_Y + Math.sin(angle) * endRadius
        const color = entry.kind === 'client' ? '#7dd3fc' : '#2563eb'

        context.save()
        context.shadowColor = color
        context.shadowBlur = 7
        context.beginPath()
        context.moveTo(point[0], point[1])
        context.lineTo(endX, endY)
        context.setLineDash([3, 4])
        context.strokeStyle = color
        context.globalAlpha = 0.82
        context.lineWidth = 1.15
        context.stroke()
        context.setLineDash([])
        context.beginPath()
        context.arc(point[0], point[1], 2.7, 0, Math.PI * 2)
        context.fillStyle = color
        context.fill()
        context.beginPath()
        context.arc(endX, endY, 1.7, 0, Math.PI * 2)
        context.fill()
        context.restore()
      })

      if (!reduceMotion) animationFrame = window.requestAnimationFrame(draw)
    }

    animationFrame = window.requestAnimationFrame(draw)
    return () => window.cancelAnimationFrame(animationFrame)
  }, [entries, theme])

  return (
    <div className="relative h-full w-full overflow-hidden" aria-label="Global client and project activity">
      <div
        className={
          'pointer-events-none absolute inset-0 ' +
          (theme === 'dark'
            ? 'bg-[radial-gradient(circle_at_center,rgba(7,26,56,0.32),transparent_66%)]'
            : 'bg-[radial-gradient(circle_at_center,rgba(147,197,253,0.22),transparent_66%)]')
        }
      />
      <canvas
        ref={canvasRef}
        className="absolute inset-0 size-full"
        role="img"
        aria-label={`${new Set(entries.map((entry) => entry.country)).size} active countries, ${entries.length} outbound signals`}
      />
    </div>
  )
}
