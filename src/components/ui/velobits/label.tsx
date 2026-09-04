'use client';

import { Label as LabelPrimitive } from 'radix-ui';

import { cn } from '@/lib/utils';

/**
 * ## `htmlFor` only works on a real `<label>`
 *
 * Radix's `Label.Root` renders an actual `<label>`, which is the whole point:
 * `htmlFor` resolves to the control, clicking the text focuses it, and screen
 * readers announce the pair.
 *
 * The trap this replaces is real and was hit in the dashboard app:
 * `SegmentedControl` renders a `<div>` root, so a `<Label htmlFor="…">` pointing
 * at it dangles silently , no error, no association, and a test that asserts
 * `getByLabelText` passes for the wrong reason. Anything whose root is not a form
 * control needs `aria-labelledby` instead.
 *
 * `peer-disabled:` and `group-data-[disabled]:` mean a disabled control dims its
 * own label without the caller wiring anything.
 */
function Label({ className, ...props }: React.ComponentProps<typeof LabelPrimitive.Root>) {
  return (
    <LabelPrimitive.Root
      data-slot="label"
      className={cn(
        'flex items-center gap-2 text-sm leading-none font-medium text-fg select-none',
        'peer-disabled:cursor-not-allowed peer-disabled:opacity-50',
        'group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50',
        className,
      )}
      {...props}
    />
  );
}

export { Label };
