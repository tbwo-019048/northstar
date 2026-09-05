import { useMemo } from 'react'
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
}

const WIDTH = 420
const HEIGHT = 570
const CENTER_X = WIDTH / 2
const CENTER_Y = 270
const RADIUS = 168
const ROTATION = -10
const COLORS = ['#7dd3fc', '#38bdf8', '#2563eb', '#1d4ed8', '#60a5fa', '#0ea5e9']

const collection = feature(
  atlas as unknown as Parameters<typeof feature>[0],
  atlas.objects.countries as unknown as Parameters<typeof feature>[1],
) as unknown as FeatureCollection<Geometry, { name?: string }>

const projection = geoOrthographic()
  .translate([CENTER_X, CENTER_Y])
  .scale(RADIUS)
  .rotate([ROTATION, -12])
  .clipAngle(90)
  .precision(0.4)

const drawPath = geoPath(projection)
const countries = collection.features.map((country) => ({
  country,
  path: drawPath(country) ?? '',
}))

export function CountryGlobe({ entries }: CountryGlobeProps) {
  const selectedCountries = useMemo(() => new Set(entries.map((entry) => entry.country)), [entries])
  const countryColor = useMemo(
    () => new Map([...selectedCountries].map((country, index) => [country, COLORS[index % COLORS.length]])),
    [selectedCountries],
  )

  const visibleEntries = useMemo(() => {
    const centre: [number, number] = [-ROTATION, 12]
    return entries.flatMap((entry, index) => {
      const country = collection.features.find((item) => item.properties?.name === entry.country)
      if (!country) return []
      const centroid = geoCentroid(country)
      if (geoDistance(centroid, centre) >= Math.PI / 2) return []
      const point = projection(centroid)
      if (!point) return []
      const occurrences = entries.slice(0, index).filter((item) => item.country === entry.country).length
      const angle = Math.atan2(point[1] - CENTER_Y, point[0] - CENTER_X) + (occurrences - 1) * 0.075
      const endRadius = RADIUS + 34 + occurrences * 7
      return [{ ...entry, point, angle, endRadius, index }]
    })
  }, [entries])

  return (
    <div
      className="relative h-full w-full overflow-hidden"
      aria-label="Global client and project activity"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(7,26,56,0.32),transparent_66%)]" />
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="absolute inset-0 size-full"
        role="img"
        aria-label={`${selectedCountries.size} active countries, ${entries.length} outbound signals`}
      >
          <defs>
            <radialGradient id="globe-ocean" cx="35%" cy="25%">
              <stop offset="0" stopColor="#12366b" />
              <stop offset="0.58" stopColor="#071a38" />
              <stop offset="1" stopColor="#020817" />
            </radialGradient>
            <filter id="globe-glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3.5" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>
          <circle cx={CENTER_X} cy={CENTER_Y} r={RADIUS + 3} fill="#0ea5e9" opacity="0.12" filter="url(#globe-glow)" />
          <circle cx={CENTER_X} cy={CENTER_Y} r={RADIUS} fill="url(#globe-ocean)" stroke="#38bdf8" strokeOpacity="0.32" />

          {countries.map(({ country, path }, countryIndex) => {
            const name = country.properties?.name ?? ''
            const active = selectedCountries.has(name)
            return (
              <path
                key={`${String(country.id ?? name)}-${countryIndex}`}
                d={path}
                fill={active ? countryColor.get(name) : '#10294d'}
                fillOpacity={active ? 0.9 : 0.64}
                stroke={active ? '#dbeafe' : '#3b82f6'}
                strokeOpacity={active ? 0.72 : 0.18}
                strokeWidth={active ? 0.8 : 0.45}
              >
                <title>{active ? `${name} · active` : name}</title>
              </path>
            )
          })}

          {visibleEntries.map((entry) => {
            const [x, y] = entry.point
            const endX = CENTER_X + Math.cos(entry.angle) * entry.endRadius
            const endY = CENTER_Y + Math.sin(entry.angle) * entry.endRadius
            const controlX = x + (endX - x) * 0.45 - Math.sin(entry.angle) * 18
            const controlY = y + (endY - y) * 0.45 + Math.cos(entry.angle) * 18
            const color = entry.kind === 'client' ? '#7dd3fc' : '#2563eb'
            return (
              <g key={`${entry.kind}-${entry.id}-${entry.country}`} filter="url(#globe-glow)">
                <path
                  d={`M ${x} ${y} Q ${controlX} ${controlY} ${endX} ${endY}`}
                  fill="none"
                  stroke={color}
                  strokeWidth="1.15"
                  strokeOpacity="0.8"
                  strokeDasharray="3 4"
                />
                <circle cx={x} cy={y} r="2.7" fill={color}>
                  <title>{`${entry.label} · ${entry.country}`}</title>
                </circle>
                <circle cx={endX} cy={endY} r="1.7" fill={color} />
              </g>
            )
          })}

        <path d={drawPath({ type: 'Sphere' }) ?? ''} fill="none" stroke="#7dd3fc" strokeOpacity="0.25" />
      </svg>
    </div>
  )
}
