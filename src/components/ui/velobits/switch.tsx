'use client';

import { Switch as SwitchPrimitive } from 'radix-ui';

import { cn } from '@/lib/utils';

/**
 * ## A switch is not a checkbox
 *
 * It applies immediately, with no submit step. That is why the on-state is the
 * brand fill rather than a neutral tick, and why the thumb uses a `translate`
 * transition , the motion IS the feedback that something happened.
 *
 * `translate-x-*` is not direction-aware, so the RTL case is handled explicitly
 * with `rtl:` variants. Getting this wrong produces a thumb that slides out of
 * its track under `dir="rtl"`, which no amount of logical padding fixes.
 *
 * ## Label association
 *
 * Radix renders `<button role="switch">`, a real form control, so `htmlFor`
 * works. This is the contrast with `SegmentedControl`, whose `<div>` root makes
 * `htmlFor` dangle silently.
 */
function Switch({ className, ...props }: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        'peer inline-flex h-5 w-9 shrink-0 items-center rounded-pill border border-transparent',
        'transition-colors duration-micro ease-out',
        'outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40',
        'disabled:cursor-not-allowed disabled:opacity-50',
        'data-[state=unchecked]:bg-field-border data-[state=checked]:bg-primary',
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          'pointer-events-none block size-4 rounded-full bg-panel ring-0 control-raised',
          'transition-transform duration-micro ease-out',
          'data-[state=unchecked]:translate-x-0.5 data-[state=checked]:translate-x-4',
          // Backgrounds and transforms are not logical properties.
          'rtl:data-[state=unchecked]:-translate-x-0.5 rtl:data-[state=checked]:-translate-x-4',
        )}
      />
    </SwitchPrimitive.Root>
  );
}

export { Switch };
