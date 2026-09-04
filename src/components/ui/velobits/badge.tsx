'use client';

import { cva, type VariantProps } from 'class-variance-authority';
import { Slot } from 'radix-ui';

import { cn } from '@/lib/utils';

/**
 * The `*-soft` variants pair a tinted wash with the matching *text* token, never
 * with the solid fill , `bg-success-soft text-success`, not
 * `bg-success text-success`. Badge text is 12px, so the full 4.5:1 applies, and
 * the colour the text actually sits on is the wash FLATTENED over the surface
 * beneath the chip , so each pairing is gated as a composite over the page, the
 * panel and the tier-S glass surface, in both themes: the soft-chip suite in
 * `@velobitsio/tokens` (`test/contrast.test.ts`, driven by `SOFT_CHIP_PAIRS`).
 * The token values were tuned to hold that gate.
 *
 * `brand` is the exception that proves the palette's asymmetry: lime is a fill
 * with charcoal on it in both themes. There is no soft-lime-with-lime-text
 * variant, because lime on cream is 1.13:1.
 */
const badgeVariants = cva(
  [
    'inline-flex w-fit shrink-0 items-center justify-center gap-1',
    'rounded-md border px-2 py-0.5 text-xs font-medium whitespace-nowrap',
    'transition-colors duration-micro ease-out',
    "[&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-3",
  ],
  {
    variants: {
      variant: {
        neutral: 'border-border bg-bg2 text-fg',
        primary: 'border-transparent bg-primary-soft text-link',
        brand: 'border-transparent bg-brand text-on-brand',
        success: 'border-transparent bg-success-soft text-success',
        danger: 'border-transparent bg-danger-soft text-danger',
        warning: 'border-transparent bg-warning-soft text-warning',
        info: 'border-transparent bg-info-soft text-info',
        /**
         * A CATEGORY, not a status , the point of it.
         *
         * `success`/`danger`/`warning`/`info` all assert a severity, so an axis
         * whose values are *kinds* (a flag's value type, a resource class, an
         * environment that is neither production nor staging) had to borrow
         * `primary` and came out blue. This is the variant to reach for there, and
         * `neutral` is the one to reach for when the value genuinely has no
         * category either.
         */
        rose: 'border-transparent bg-rose-soft text-rose',
        outline: 'border-field-border text-fg',
      },
    },
    defaultVariants: { variant: 'neutral' },
  },
);

export interface BadgeProps
  extends React.ComponentProps<'span'>, VariantProps<typeof badgeVariants> {
  asChild?: boolean;
}

function Badge({ className, variant, asChild = false, ...props }: BadgeProps) {
  const Comp = asChild ? Slot.Root : 'span';
  return (
    <Comp data-slot="badge" className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
