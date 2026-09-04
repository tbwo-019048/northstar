'use client';

import { cn } from '@/lib/utils';

export interface SpinnerProps extends React.ComponentProps<'span'> {
  /** Matches the icon scale: 16px default. */
  size?: number;
  /**
   * Announced to assistive tech. Set to `null` when a visible label already
   * says what is loading, so it is not read twice.
   */
  label?: string | null;
}

/**
 * An indeterminate busy indicator.
 *
 * Drawn with a bordered box rather than an SVG so it has no icon dependency and
 * inherits `currentColor` for free.
 *
 * Reduced motion is handled by the token layer, which collapses animation
 * durations to ~0. A stopped spinner still communicates "busy" through its
 * `role="status"` label , which is exactly why the label is not optional by
 * default.
 */
function Spinner({ className, size = 16, label = 'Loading', ...props }: SpinnerProps) {
  return (
    <span
      data-slot="spinner"
      role={label ? 'status' : undefined}
      aria-label={label ?? undefined}
      aria-hidden={label ? undefined : 'true'}
      className={cn(
        'inline-block animate-spin rounded-full border-2 border-current border-t-transparent align-[-0.125em]',
        className,
      )}
      style={{ width: size, height: size }}
      {...props}
    />
  );
}

export { Spinner };
