import { create } from 'zustand'

type Theme = 'light' | 'dark'
const KEY = 'northstar.theme'

function initial(): Theme {
  try {
    const saved = localStorage.getItem(KEY) as Theme | null
    if (saved === 'light' || saved === 'dark') return saved
  } catch {
    /* ignore */
  }
  if (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark'
  }
  return 'light'
}

function apply(theme: Theme) {
  const root = document.documentElement
  root.classList.toggle('dark', theme === 'dark')
  root.style.colorScheme = theme
}

interface ThemeState {
  theme: Theme
  toggle: () => void
  set: (t: Theme) => void
}

export const useTheme = create<ThemeState>((set, get) => {
  const theme = initial()
  if (typeof document !== 'undefined') apply(theme)
  return {
    theme,
    toggle: () => get().set(get().theme === 'dark' ? 'light' : 'dark'),
    set: (t) => {
      apply(t)
      try {
        localStorage.setItem(KEY, t)
      } catch {
        /* ignore */
      }
      set({ theme: t })
    },
  }
})
