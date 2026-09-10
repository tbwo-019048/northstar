import { Lock, LockOpen } from 'lucide-react'
import { cn } from '@/lib/utils'

/** Public / Private pill for a linked GitHub repo. `isPrivate` is fetched live
 * from the GitHub API (see `fetchRepoMeta`); pass `null`/`undefined` while it's
 * still loading or unknown to render nothing. */
export function RepoVisibilityBadge({
  isPrivate,
  className,
}: {
  isPrivate: boolean | null | undefined
  className?: string
}) {
  if (isPrivate == null) return null
  return (
    <span
      title={isPrivate ? 'Private repository' : 'Public repository'}
      className={cn(
        'inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium leading-none',
        isPrivate
          ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
          : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
        className,
      )}
    >
      {isPrivate ? <Lock className="size-3" /> : <LockOpen className="size-3" />}
      {isPrivate ? 'Private' : 'Public'}
    </span>
  )
}
