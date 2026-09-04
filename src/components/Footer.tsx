import versionData from '@/version.json'
import { NorthStarIcon } from '@/components/NorthStarIcon'

/** Bumped automatically by .github/workflows/version-bump.yml on every push
 * to main — do not hand-edit src/version.json. */
export function Footer() {
  return (
    <footer className="mt-auto border-t border-border px-3 py-2.5 text-xs text-muted-foreground">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-2">
        <span className="flex items-center gap-1">
          <NorthStarIcon className="size-3 text-primary" /> NorthStar
        </span>
        <span className="tabular-nums">v{versionData.version}</span>
      </div>
    </footer>
  )
}
