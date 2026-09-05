import atlas from 'world-atlas/countries-50m.json'

export const COUNTRY_NAMES = [
  ...new Set(
    atlas.objects.countries.geometries
      .map((country) => country.properties?.name)
      .filter((name): name is string => Boolean(name) && name !== 'Antarctica'),
  ),
].sort((a, b) => a.localeCompare(b))
