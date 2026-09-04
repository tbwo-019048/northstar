'use client';

import { Separator as SeparatorPrimitive } from 'radix-ui';

import { cn } from '@/lib/utils';

/**
 * `bg-border`, not `bg-field-border`: a separator is decorative, so WCAG 1.4.11
 * does not apply to it and it is free to recede. That distinction is the whole
 * reason the palette carries two line tokens.
 *
 * Radix sets `role="none"` when `decorative` (the default) and
 * `role="separator"` otherwise. Leave it decorative unless the rule genuinely
 * divides two groups a screen-reader user needs told about.
 */
function Separator({
  className,
  orientation = 'horizontal',
  decorative = true,
  ...props
}: React.ComponentProps<typeof SeparatorPrimitive.Root>) {
  return (
    <SeparatorPrimitive.Root
      data-slot="separator"
      decorative={decorative}
      orientation={orientation}
      className={cn(
        'shrink-0 bg-border',
        orientation === 'horizontal' ? 'h-px w-full' : 'h-full w-px',
        className,
      )}
      {...props}
    />
  );
}

export { Separator };
