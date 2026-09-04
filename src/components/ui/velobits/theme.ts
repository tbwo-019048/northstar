export type ThemeMode = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

/**
 * The storage keys already in use across the consuming apps. The VALUES are
 * load-bearing , they are the live localStorage keys, so changing one silently
 * discards every existing user's saved theme preference. Only ever add.
 */
export const THEME_STORAGE_KEYS = {
  editor: 'fmx_theme_mode',
  dashboard: 'tf.theme',
} as const;

const DARK_QUERY = '(prefers-color-scheme: dark)';

export function prefersDark(): boolean {
  return typeof window !== 'undefined' && window.matchMedia(DARK_QUERY).matches;
}

/** Collapse `system` against the current OS preference. */
export function resolveTheme(mode: ThemeMode): ResolvedTheme {
  if (mode === 'system') return prefersDark() ? 'dark' : 'light';
  return mode;
}

/**
 * Read a stored mode, tolerating anything unexpected.
 *
 * Legacy values are accepted on purpose: the dashboard app persisted the bare
 * strings `'dark'` / `'light'`, and the editor app has `'system'` too. An
 * unrecognised value resolves to `'system'` rather than throwing , a corrupt
 * preference should not white-screen an app.
 */
export function readStoredMode(storageKey: string): ThemeMode {
  if (typeof window === 'undefined') return 'system';
  try {
    const raw = window.localStorage.getItem(storageKey);
    return raw === 'light' || raw === 'dark' || raw === 'system' ? raw : 'system';
  } catch {
    // Private-browsing / disabled storage. Not worth failing over.
    return 'system';
  }
}

export function writeStoredMode(storageKey: string, mode: ThemeMode): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(storageKey, mode);
  } catch {
    /* ignore */
  }
}

/**
 * Apply a resolved theme to the document.
 *
 * The class goes on **both** `<html>` and `<body>`. That is not redundancy: the
 * apps toggle `body.dark` and the Keycloak theme toggles `html.dark`, and the
 * token layer's selector list (`.dark, body.dark`) matches either. Setting both
 * means a component is correct regardless of which convention its host uses,
 * and `color-scheme` gets native form controls and scrollbars to match.
 */
export function applyTheme(theme: ResolvedTheme): void {
  if (typeof document === 'undefined') return;
  const { documentElement: html, body } = document;
  html.classList.toggle('dark', theme === 'dark');
  body?.classList.toggle('dark', theme === 'dark');
  html.style.colorScheme = theme;
}

/**
 * Subscribe to OS theme changes. Returns an unsubscribe function.
 *
 * Only meaningful while the mode is `system`; the provider unsubscribes
 * otherwise so an explicit choice is never overridden.
 */
export function watchSystemTheme(onChange: (theme: ResolvedTheme) => void): () => void {
  if (typeof window === 'undefined') return () => {};
  const mql = window.matchMedia(DARK_QUERY);
  const handler = (e: MediaQueryListEvent) => onChange(e.matches ? 'dark' : 'light');
  mql.addEventListener('change', handler);
  return () => mql.removeEventListener('change', handler);
}

/**
 * The inline script to drop in `<head>` before first paint, so the correct
 * theme is applied before the app boots.
 *
 * The editor app's auth work already established that a flash on refresh is a
 * real defect and not cosmetic; this is the same fix for theme. Must be rendered
 * synchronously , as a `<script dangerouslySetInnerHTML>` in an SSR document,
 * or inline in `index.html`. Deferring it defeats the point entirely.
 */
export function themeInitScript(storageKey: string): string {
  return `(function(){try{var m=localStorage.getItem(${JSON.stringify(storageKey)});var d=m==="dark"||((m==="system"||!m)&&matchMedia("${DARK_QUERY}").matches);var h=document.documentElement;h.classList.toggle("dark",d);h.style.colorScheme=d?"dark":"light";}catch(e){}})();`;
}
