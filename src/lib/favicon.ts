/** Builds a favicon image URL for a site, via Google's public favicon proxy.
 * Referencing the image (an <img src>) rather than fetching its bytes avoids
 * any CORS issues a site's own /favicon.ico might have. */
export function faviconUrlFor(siteUrl: string, size = 128): string | null {
  try {
    const withScheme = /^https?:\/\//i.test(siteUrl) ? siteUrl : `https://${siteUrl}`
    const host = new URL(withScheme).hostname
    if (!host) return null
    return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=${size}`
  } catch {
    return null
  }
}
