import { geoNaturalEarth1, geoPath } from 'd3-geo'
import { feature } from 'topojson-client'
import type { FeatureCollection, Geometry } from 'geojson'
import atlas from 'world-atlas/countries-50m.json'

const W = 980
const H = 480

const collection = feature(
  atlas as unknown as Parameters<typeof feature>[0],
  atlas.objects.countries as unknown as Parameters<typeof feature>[1],
) as unknown as FeatureCollection<Geometry, { name?: string }>

const projection = geoNaturalEarth1().fitSize([W, H], { type: 'Sphere' })
const pathGen = geoPath(projection)

// The projection is fixed, so the paths only need building once.
const shapes = collection.features
  .filter((f) => f.properties?.name && f.properties.name !== 'Antarctica')
  .map((f) => ({ name: f.properties!.name as string, d: pathGen(f) ?? '' }))
  .filter((s) => s.d)

/** Flat Natural Earth world map; countries in `highlight` are filled with the
 * brand colour (or, when `shadeByCountry` maps them, that per-country shade of
 * blue), the rest sit as a faint neutral base. */
export function WorldMap({
  highlight,
  shadeByCountry,
  className,
}: {
  highlight: string[]
  /** Country name → CSS colour. Overrides the flat brand fill for that country. */
  shadeByCountry?: Record<string, string>
  className?: string
}) {
  const on = new Set(highlight)
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      role="img"
      className={className}
      aria-label={`World map with ${on.size} country${on.size === 1 ? '' : 'ies'} highlighted`}
    >
      <title>Where your projects are</title>
      <g>
        {shapes.map((s) => {
          const active = on.has(s.name)
          return (
            <path
              key={s.name}
              d={s.d}
              fill={active ? (shadeByCountry?.[s.name] ?? 'var(--primary)') : 'currentColor'}
              fillOpacity={active ? 0.9 : 0.12}
              stroke="currentColor"
              strokeOpacity={0.15}
              strokeWidth={0.4}
            >
              <title>{s.name}</title>
            </path>
          )
        })}
      </g>
    </svg>
  )
}
