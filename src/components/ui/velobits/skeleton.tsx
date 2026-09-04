'use client';

import { cn } from '@/lib/utils';

/**
 * A loading placeholder.
 *
 * `aria-hidden` with a sibling live region rather than `role="status"` on the
 * skeleton itself: a screen reader should hear "Loading flags" once, not
 * enumerate fourteen grey rectangles. Pair it with a single announcement:
 *
 * ```tsx
 * <span className="sr-only" role="status">Loading flags…</span>
 * {rows.map((r) => <Skeleton key={r} className="h-8 w-full" />)}
 * ```
 *
 * The pulse is a CSS animation, so the token layer's `prefers-reduced-motion`
 * block already stills it , no JS check needed.
 *
 * ## Why the fill is `--highlight` and NOT a glass tier
 *
 * A Skeleton is not a surface, it is a shape standing in for content, so it is
 * the one component in the Tier-S sweep that must NOT take the glass material.
 * Two instances of the same tier composite 2/255 apart, so a glass Skeleton
 * inside a glass Card would be invisible , which is the whole failure mode a
 * placeholder cannot have.
 *
 * It also cannot be an opaque step off the ramp. `bg-bg2` was the previous fill,
 * and `--bg2` IS `--panel` in dark mode: a Skeleton inside any opaque dark panel
 * measured 0/255, i.e. nothing rendered, and on the light page it managed 2/255.
 * `--highlight` is a translucent scrim (5% ink in light, 6% in dark), so it
 * tracks whatever it sits on instead of hoping to differ from it:
 *
 * Largest single-channel separation from its host, the same measure the token
 * suite gates the glass tiers with:
 *
 *   host                     --highlight   (old --bg2)
 *   light --panel            11/255        23/255
 *   light .glass-surface     11/255        13/255
 *   light page               10/255         2/255
 *   dark  --panel            12/255         0/255
 *   dark  .glass-surface     12/255         9/255
 *
 * Every host now clears that 8/255 perceptibility floor, in both themes, on
 * glass and on opaque panels alike , the one column it gives up is the light
 * opaque panel, where the old fill was further away but every other host was
 * where it failed. Being
 * translucent is also what makes `animate-pulse` visible at all , an opaque fill
 * that matches its host pulses between two identical colours.
 */
function Skeleton({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="skeleton"
      aria-hidden="true"
      className={cn('animate-pulse rounded-md bg-highlight', className)}
      {...props}
    />
  );
}

export { Skeleton };
