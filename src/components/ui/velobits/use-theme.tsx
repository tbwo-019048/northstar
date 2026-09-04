'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import {
  applyTheme,
  readStoredMode,
  resolveTheme,
  watchSystemTheme,
  writeStoredMode,
  type ResolvedTheme,
  type ThemeMode,
} from './theme';

export interface ThemeContextValue {
  /** What the user chose, including `system`. */
  mode: ThemeMode;
  /** What that currently resolves to. Never `system`. */
  theme: ResolvedTheme;
  setMode: (mode: ThemeMode) => void;
  /** Convenience for a two-state toggle button: light ⇄ dark, leaving `system`. */
  toggle: () => void;
  /**
   * `false` during SSR and on the first client render; `true` afterwards.
   *
   * ## Why you need this
   *
   * `theme` is resolved from `localStorage` and `matchMedia`, neither of which
   * exists on the server. So the server always renders the `defaultMode` branch
   * while the client's very first render already knows the stored value , and if
   * they differ, React throws a hydration error (#418) and discards the server
   * HTML.
   *
   * Reading `theme` for *styling* is fine, because styling goes through the
   * `dark` class and CSS. This flag is for the case where **markup** differs:
   *
   * ```tsx
   * // WRONG , server says Moon, client says Sun, hydration fails
   * {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
   *
   * // Better , no JS branch at all, CSS decides
   * <SunIcon className="hidden dark:block" />
   * <MoonIcon className="dark:hidden" />
   *
   * // When a JS branch is unavoidable
   * {mounted ? (theme === 'dark' ? <SunIcon /> : <MoonIcon />) : <Placeholder />}
   * ```
   */
  mounted: boolean;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export interface ThemeProviderProps {
  children: React.ReactNode;
  /**
   * Where the choice persists. REQUIRED and intentionally not defaulted , the
   * editor app uses `fmx_theme_mode` and the dashboard app uses `tf.theme`, both
   * with live user data, so a default here would silently orphan one app's
   * preferences. `THEME_STORAGE_KEYS` has the constants.
   */
  storageKey: string;
  /** Used before anything is stored. */
  defaultMode?: ThemeMode;
  /**
   * Called after every change, for consumers where the server is authoritative.
   * The editor app syncs the mode to its backend through RTK Query; the local
   * value is only a cache to prevent a flash on refresh.
   */
  onModeChange?: (mode: ThemeMode) => void;
  /**
   * Skip writing to the DOM. For tests, and for a host that already owns the
   * `dark` class (the Keycloak theme applies it from `kcContext`).
   */
  disableDomSync?: boolean;
}

export function ThemeProvider({
  children,
  storageKey,
  defaultMode = 'system',
  onModeChange,
  disableDomSync = false,
}: ThemeProviderProps) {
  /**
   * Initialised from storage in the state initialiser rather than in an effect.
   * An effect would render once with the default first, which is the flash this
   * exists to prevent.
   */
  const [mode, setModeState] = useState<ThemeMode>(() => {
    if (typeof window === 'undefined') return defaultMode;
    const stored = readStoredMode(storageKey);
    return stored === 'system' && defaultMode !== 'system' ? defaultMode : stored;
  });

  const [theme, setTheme] = useState<ResolvedTheme>(() => resolveTheme(mode));

  /**
   * Deliberately set in an effect, so it is `false` for the server render AND
   * for the first client render , the two that must produce identical markup.
   */
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const next = resolveTheme(mode);
    setTheme(next);
    if (!disableDomSync) applyTheme(next);
  }, [mode, disableDomSync]);

  useEffect(() => {
    // Only follow the OS while the user has not made an explicit choice ,
    // otherwise a system change would silently override them.
    if (mode !== 'system') return;
    return watchSystemTheme((next) => {
      setTheme(next);
      if (!disableDomSync) applyTheme(next);
    });
  }, [mode, disableDomSync]);

  const setMode = useCallback(
    (next: ThemeMode) => {
      setModeState(next);
      writeStoredMode(storageKey, next);
      onModeChange?.(next);
    },
    [storageKey, onModeChange],
  );

  const toggle = useCallback(() => {
    // Resolve `system` against what is on screen, so the first click always
    // flips what the user is actually looking at.
    setMode(resolveTheme(mode) === 'dark' ? 'light' : 'dark');
  }, [mode, setMode]);

  const value = useMemo<ThemeContextValue>(
    () => ({ mode, theme, setMode, toggle, mounted }),
    [mode, theme, setMode, toggle, mounted],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

/**
 * Throws when there is no `ThemeProvider` above it, deliberately: a silent
 * fallback to `light` is the kind of bug that only shows up in the one route
 * someone forgot to wrap.
 */
export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within a <ThemeProvider>. See @velobitsio/ui docs.');
  }
  return ctx;
}
