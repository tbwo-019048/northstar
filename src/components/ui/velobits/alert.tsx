'use client';

import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

/**
 * ## Colour is never the only signal
 *
 * WCAG 1.4.1 (Use of Color): a red border does not tell a colour-blind or
 * screen-reader user that something failed. Every variant therefore expects an
 * icon AND a title that names the state in words. The grid below reserves the
 * icon column so callers do not have to lay it out.
 *
 * ## Why `role` is a prop rather than a hardcoded `alert`
 *
 * `role="alert"` is an assertive live region , it interrupts whatever the
 * screen reader is saying. Correct for an error that just appeared in response
 * to an action; wrong for a static informational panel rendered with the page,
 * where it announces on every navigation. Defaults to `status` (polite), and a
 * caller escalates deliberately.
 *
 * ## `surface` applies to the neutral variant ONLY, and that is not an oversight
 *
 * A neutral Alert is a panel, so it takes the Tier-S material by default ,
 * `.glass-surface`, the same material as `Card`. The four status variants keep
 * their `*-soft` wash, because a wash and a glass tier cannot coexist on one
 * element: `bg-danger-soft` is a utility, `.glass-surface` is in the `components`
 * layer, so the wash REPLACES the tint at alpha 0.10 and what survives is the
 * glass border and shadow around a nearly transparent panel. `toast.tsx` already
 * carries a regression test for exactly this on Tier O; the same trap applies
 * here, so the surface axis is confined to `neutral` through a compound variant
 * rather than being applied to the base.
 *
 * `surface="panel"` returns the opaque neutral panel, and is what a neutral Alert
 * nested inside a glass Card or a Tier-O overlay should use , glass over the same
 * glass composites 2/255 apart, so the inner surface disappears.
 */
const alertVariants = cva(
  [
    'relative grid w-full gap-x-3 gap-y-1 rounded-lg border px-4 py-3 text-sm',
    'grid-cols-[calc(var(--spacing)*4)_1fr] items-start',
    '[&>svg]:size-4 [&>svg]:translate-y-0.5 [&>svg]:text-current',
  ],
  {
    variants: {
      variant: {
        // No background or border colour here: the neutral variant gets its
        // material from the `surface` compound variants below.
        neutral: 'text-fg',
        info: 'border-info/30 bg-info-soft text-fg',
        success: 'border-success/30 bg-success-soft text-fg',
        warning: 'border-warning/30 bg-warning-soft text-fg',
        danger: 'border-danger/30 bg-danger-soft text-fg',
      },
      /*
       * Declared with empty classes because cva can only match a compound
       * variant on a key it knows about. Every class this axis contributes is in
       * `compoundVariants`, so it is inert on the status variants.
       */
      surface: {
        glass: '',
        panel: '',
      },
    },
    compoundVariants: [
      { variant: 'neutral', surface: 'glass', class: 'glass-surface' },
      { variant: 'neutral', surface: 'panel', class: 'border-border bg-panel' },
    ],
    defaultVariants: { variant: 'neutral', surface: 'glass' },
  },
);

export interface AlertProps
  extends React.ComponentProps<'div'>, VariantProps<typeof alertVariants> {}

function Alert({ className, variant, surface, role = 'status', ...props }: AlertProps) {
  return (
    <div
      data-slot="alert"
      role={role}
      className={cn(alertVariants({ variant, surface }), className)}
      {...props}
    />
  );
}

function AlertTitle({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div data-slot="alert-title" className={cn('col-start-2 font-medium', className)} {...props} />
  );
}

/**
 * `text-muted-foreground` and not a tinted variant of the status colour: inside
 * a `*-soft` wash, the status text step is no longer measured against a plain
 * panel, and stacking a tint on a tint is how a body-copy pair quietly drops
 * below AA.
 */
function AlertDescription({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="alert-description"
      className={cn('col-start-2 text-muted-foreground', className)}
      {...props}
    />
  );
}

export { Alert, AlertTitle, AlertDescription, alertVariants };
