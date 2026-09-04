'use client';

import { cn } from '@/lib/utils';

/**
 * A keyboard key hint, for command palettes and shortcut lists.
 *
 * `⌘` on Apple platforms and `Ctrl` elsewhere is a real difference users notice,
 * but detecting it here would make the component render differently between
 * server and client and produce a hydration mismatch. So this stays presentational
 * and the caller decides , `useIsMac()` in an effect, or the platform string
 * the app already has.
 */
function Kbd({ className, ...props }: React.ComponentProps<'kbd'>) {
  return (
    <kbd
      data-slot="kbd"
      className={cn(
        'pointer-events-none inline-flex h-5 min-w-5 items-center justify-center gap-1 rounded-sm',
        'border border-border bg-bg2 control-recessed px-1.5 font-mono text-[0.6875rem] font-medium text-muted-foreground',
        'select-none',
        className,
      )}
      {...props}
    />
  );
}

export { Kbd };
