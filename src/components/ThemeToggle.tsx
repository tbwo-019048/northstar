import { MoonIcon } from '@/components/ui/moon'
import { SunIcon } from '@/components/ui/sun'
import { useTheme } from '@/store/useTheme'

export function ThemeToggle() {
  const { theme, toggle } = useTheme()
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label="Toggle theme"
      title={theme === 'dark' ? 'Switch to light' : 'Switch to dark'}
      className="grid size-7 place-items-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
    >
      {theme === 'dark' ? <MoonIcon size={16} /> : <SunIcon size={16} />}
    </button>
  )
}
