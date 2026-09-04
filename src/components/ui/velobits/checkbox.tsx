'use client';

import { Checkbox as CheckboxPrimitive } from 'radix-ui';

import { CheckIcon, MinusIcon } from '@velobitsio/icons';

import { cn } from '@/lib/utils';

/**
 * Radix Checkbox, which is safe under happy-dom in a way Radix Select is not ,
 * it renders a real `<button role="checkbox">` and needs no measurement.
 *
 * Handles the indeterminate state, which matters for the bulk-selection headers
 * these dashboards use: a header checkbox reflecting "some rows selected" must
 * render a dash, not a tick, and must report `aria-checked="mixed"`. Radix does
 * the ARIA; the icon swap below is what makes it visible.
 */
function Checkbox({ className, ...props }: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        'peer size-4 shrink-0 rounded-sm border border-input bg-panel control-recessed',
        'transition-shadow duration-micro ease-out',
        'outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40',
        'disabled:cursor-not-allowed disabled:opacity-50',
        'data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-on-primary',
        'data-[state=indeterminate]:border-primary data-[state=indeterminate]:bg-primary data-[state=indeterminate]:text-on-primary',
        'aria-invalid:border-danger aria-invalid:ring-danger/30',
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator
        data-slot="checkbox-indicator"
        className="flex items-center justify-center text-current"
      >
        {props.checked === 'indeterminate' ? <MinusIcon size={12} /> : <CheckIcon size={12} />}
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}

export { Checkbox };
