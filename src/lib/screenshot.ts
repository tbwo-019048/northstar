/** Free, keyless screenshot service (WordPress mShots) — given any URL it
 * renders and caches a preview image. The first request for a URL often
 * returns a "still generating" placeholder that resolves within a few
 * seconds/refreshes; that's a known characteristic of the service, not a bug
 * here. No backend of our own needed. */
export function mshotUrl(siteUrl: string, width = 900): string | null {
  try {
    const withScheme = /^https?:\/\//i.test(siteUrl) ? siteUrl : `https://${siteUrl}`
    new URL(withScheme) // throws if not a valid URL at all
    return `https://s.wordpress.com/mshots/v1/${encodeURIComponent(withScheme)}?w=${width}`
  } catch {
    return null
  }
}
