import { useModeAnimation, ThemeAnimationType } from 'react-theme-switch-animation'
import { MoonIcon } from '@/components/ui/moon'
import { SunIcon } from '@/components/ui/sun'
import { useTheme } from '@/store/useTheme'

export function ThemeToggle() {
  const theme = useTheme((s) => s.theme)
  const setTheme = useTheme((s) => s.set)
  const { ref, toggleSwitchTheme } = useModeAnimation({
    animationType: ThemeAnimationType.POLYGON_GRADIENT,
    isDarkMode: theme === 'dark',
    onDarkModeChange: (isDark) => setTheme(isDark ? 'dark' : 'light'),
    duration: 900,
  })

  return (
    <button
      ref={ref}
      type="button"
      onClick={() => void toggleSwitchTheme()}
      aria-label="Toggle theme"
      title={theme === 'dark' ? 'Switch to light' : 'Switch to dark'}
      className="grid size-7 place-items-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
    >
      {theme === 'dark' ? <MoonIcon size={16} /> : <SunIcon size={16} />}
    </button>
  )
}
