function originOf(siteUrl: string): string | null {
  try {
    const withScheme = /^https?:\/\//i.test(siteUrl) ? siteUrl : `https://${siteUrl}`
    return new URL(withScheme).origin
  } catch {
    return null
  }
}

// There's no way to read a cross-origin page's <head> from the browser
// without a server-side proxy (fetching its HTML hits CORS on almost every
// site), so the real <link rel="icon"> a site declares is invisible to us.
// The next best thing is trying every filename convention in common use —
// classic favicon.ico, Vite/CRA's favicon.svg or .png (this app included —
// NorthStar itself only ships favicon.svg, no .ico), and the Next.js App
// Router's icon.ico/png/svg. Any image format an <img> can decode (.ico,
// .png, .svg, ...) is accepted the same way — nothing here is format-specific.
const COMMON_FAVICON_PATHS = [
  '/favicon.ico',
  '/favicon.svg',
  '/favicon.png',
  '/icon.ico',
  '/icon.svg',
  '/icon.png',
  '/apple-touch-icon.png',
  '/favicon-32x32.png',
  '/favicon-16x16.png',
]

export function candidateFaviconUrls(siteUrl: string): string[] {
  const origin = originOf(siteUrl)
  return origin ? COMMON_FAVICON_PATHS.map((p) => `${origin}${p}`) : []
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

/** Loads `url` bypassing the browser's HTTP cache, so re-running the check
 * (e.g. clicking "Use as logo" again after updating the site's favicon)
 * actually re-fetches instead of replaying a cached hit or miss. The cache
 * buster is only used for this probe — the URL handed back / persisted as
 * logo_url is always the clean one. */
function loadedSize(url: string): Promise<{ w: number; h: number } | null> {
  return new Promise((resolve) => {
    const img = new Image()
    const timer = setTimeout(() => resolve(null), 4000)
    img.onload = () => {
      clearTimeout(timer)
      resolve({ w: img.naturalWidth, h: img.naturalHeight })
    }
    img.onerror = () => {
      clearTimeout(timer)
      resolve(null)
    }
    const bust = `${url.includes('?') ? '&' : '?'}_=${Date.now()}`
    img.src = url + bust
  })
}

/** Tries every common favicon filename on the site itself first (an <img
 * src> load each time, so no CORS issue — reading pixels would need CORS,
 * just displaying doesn't), then falls back to Google's proxy. Returns null
 * if nothing responds with a favicon that's actually theirs (e.g. the site
 * needs auth, like a protected Vercel preview, or Google has never crawled
 * it and the site uses a filename not in the common list). Always re-probes
 * live rather than trusting a previous result, so calling it again after the
 * site's favicon changed (or was added) picks that up. */
export async function resolveFaviconUrl(siteUrl: string): Promise<string | null> {
  for (const candidate of candidateFaviconUrls(siteUrl)) {
    const size = await loadedSize(candidate)
    if (size && size.w > 1 && size.h > 1) return candidate
  }

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
