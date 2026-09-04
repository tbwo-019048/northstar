function originOf(siteUrl: string): string | null {
  try {
    const withScheme = /^https?:\/\//i.test(siteUrl) ? siteUrl : `https://${siteUrl}`
    return new URL(withScheme).origin
  } catch {
    return null
  }
}

/** The site's own favicon.ico — usually the real icon, but only exists if
 * the site actually serves one there (and isn't gated behind auth). */
export function directFaviconUrl(siteUrl: string): string | null {
  const origin = originOf(siteUrl)
  return origin ? `${origin}/favicon.ico` : null
}

/** Google's public favicon proxy. Reliable for well-known, previously-
 * crawled sites; for a fresh or private deploy (a `*.vercel.app` preview,
 * say) Google has nothing cached and silently returns its generic globe
 * icon instead of an error — so this is a fallback, not the first choice. */
export function googleFaviconUrl(siteUrl: string, size = 128): string | null {
  const origin = originOf(siteUrl)
  if (!origin) return null
  const host = new URL(origin).hostname
  return `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=${size}`
}

function loadedSize(url: string): Promise<{ w: number; h: number } | null> {
  return new Promise((resolve) => {
    const img = new Image()
    const timer = setTimeout(() => resolve(null), 5000)
    img.onload = () => {
      clearTimeout(timer)
      resolve({ w: img.naturalWidth, h: img.naturalHeight })
    }
    img.onerror = () => {
      clearTimeout(timer)
      resolve(null)
    }
    img.src = url
  })
}

/** Tries the site's own favicon.ico first (an <img src> load, so no CORS
 * issue — reading pixels would need CORS, just displaying doesn't), then
 * falls back to Google's proxy. Returns null if neither responds with a
 * favicon that's actually theirs (e.g. the site needs auth, like a
 * protected Vercel preview, or Google has never crawled it). */
export async function resolveFaviconUrl(siteUrl: string): Promise<string | null> {
  const direct = directFaviconUrl(siteUrl)
  const directSize = direct ? await loadedSize(direct) : null
  if (directSize && directSize.w > 1 && directSize.h > 1) return direct

  const google = googleFaviconUrl(siteUrl)
  const googleSize = google ? await loadedSize(google) : null
  // Google silently substitutes a fixed 16x16 generic globe when it has
  // nothing cached for the domain — true for both a nonexistent domain and
  // a real one Google just hasn't crawled (a fresh `*.vercel.app` deploy,
  // say), which is indistinguishable from an actual 16x16 favicon by size
  // alone. Rejecting exactly-16x16 trades a rare false negative on a
  // genuinely tiny real icon for not silently handing back a wrong logo.
  if (googleSize && !(googleSize.w === 16 && googleSize.h === 16)) return google

  return null
}
