'use client';

import { cva, type VariantProps } from 'class-variance-authority';
import { Slot } from 'radix-ui';

import { cn } from '@/lib/utils';

/**
 * ## Why there is no `primary`-coloured text variant
 *
 * `--primary` (#007ACC) measures 3.90:1 on the cream page , fine as a fill
 * behind white text (4.51:1), failing AA as text. The `link` variant therefore
 * uses `text-link` (`--primary-text`, 5.34:1), and no variant paints
 * `--primary` on a page background.
 *
 * ## Radius
 *
 * Controls are `--radius-md` (6px) system-wide. The Keycloak login theme's
 * vended `button.tsx` hardcodes `rounded-full`, so adopting this shared radius
 * is what makes login buttons stop being pills , an accepted consequence,
 * reversible by overriding `--keycloakify-shadcn-radius`.
 *
 * ## RTL
 *
 * Tailwind v4's `px-*` and `gap-*` are already logical, so nothing here needs
 * mirroring under `dir="rtl"`. A directional icon *child* still does.
 */
const buttonVariants = cva(
  [
    'inline-flex items-center justify-center gap-2 whitespace-nowrap',
    'rounded-md text-sm font-medium',
    // `transition-[colors,transform]`, not `transition-all`: the press below moves
    // a transform, and `all` would also animate width/height when a label changes
    // , which reads as the button inflating rather than as a press.
    'transition-[color,background-color,border-color,transform] duration-micro ease-out',
    // The visible ring comes from the token layer's global :focus-visible rule.
    // This adds the soft halo; `outline-none` only suppresses the UA default.
    'outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40',
    /*
     * THE PRESS. A 1.5% scale-down while the pointer is held.
     *
     * `transform`, deliberately, and not a colour shift: it is the one property
     * that composites on the GPU without invalidating layout or paint, so it stays
     * cheap on a toolbar with twenty buttons in it. A darker fill would need a
     * fourth token per variant and would fight the hover fill on the way in.
     *
     * `motion-reduce:active:scale-100` rather than relying on the token layer's
     * global reduced-motion blanket: that blanket clamps transition DURATION, so
     * without this the press would still happen, just instantly. A user who asked
     * for no motion should get no movement, not faster movement.
     */
    'active:scale-[0.985] motion-reduce:active:scale-100',
    'disabled:pointer-events-none disabled:opacity-50',
    /*
     * `aria-disabled` suppresses the PRESS only , never pointer events, and never
     * the opacity.
     *
     * In this system `aria-disabled` is a message to assistive tech, not a
     * behaviour: `Pagination` marks an unavailable page that way and swallows the
     * click in JS, deliberately keeping the element focusable and hit-testable.
     * `pointer-events-none` here would stop it receiving the very click that guard
     * exists to catch, and suppresses the focus ring on some platforms , so it is
     * `disabled:`-only above, and `pagination.test.tsx` asserts the bare class
     * never reaches an aria-disabled control.
     *
     * The scale is different: an element presenting itself as unavailable should
     * not animate a successful-looking press. Opacity is left to the call site,
     * which is where the "unavailable" styling is decided.
     */
    'aria-disabled:active:scale-100',
    // Size any icon child once, rather than at every call site.
    "[&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 [&_svg]:shrink-0",
  ],
  {
    variants: {
      variant: {
        primary: 'bg-primary text-on-primary control-raised hover:bg-primary-hover',
        /**
         * The lime brand fill. `text-on-brand` is charcoal at 10.89:1 , the only
         * sanctioned pairing on lime. White on lime is 1.31:1, which is why no
         * white-on-brand variant exists to reach for by mistake.
         *
         * `hover:bg-brand-hover`, not `hover:brightness-95`. A filter is outside
         * the palette: nothing measures it, and it composites against whatever is
         * behind the button , so the same hover rendered one colour on an opaque
         * panel and another on a glass surface. The token is measured (charcoal on
         * it is 9.73:1, so lime's only legal pairing survives the hover).
         */
        brand: 'bg-brand text-on-brand control-raised hover:bg-brand-hover',
        secondary: 'border border-field-border bg-panel text-fg control-raised hover:bg-highlight',
        ghost: 'text-fg hover:bg-highlight',
        /**
         * `text-on-danger`, NOT `text-on-primary`.
         *
         * This was `text-on-primary` , white , and in dark mode that measured
         * **2.45:1** against AA's 4.5. `--danger` is a LIGHT red in dark mode
         * because the same token also has to work as text on a dark surface, and
         * nothing gated the fill-with-text-on-it combination. `--on-danger` is
         * white in light and charcoal in dark, for the same reason `--on-brand` is
         * charcoal on lime, and it now has its own contrast pair.
         */
        destructive: 'bg-danger text-on-danger control-raised hover:bg-danger-hover',
        link: 'text-link underline-offset-4 hover:underline',
      },
      size: {
        sm: 'h-8 px-3 text-xs',
        md: 'h-9 px-4',
        lg: 'h-10 px-6',
        /** Square, for an icon-only button , which needs an `aria-label`. */
        icon: 'size-9',
      },
    },
    defaultVariants: { variant: 'secondary', size: 'md' },
  },
);

export interface ButtonProps
  extends React.ComponentProps<'button'>, VariantProps<typeof buttonVariants> {
  /**
   * Render the single child element instead of a `<button>`, forwarding these
   * classes onto it , for wrapping a router `<Link>` without nesting an anchor
   * inside a button.
   */
  asChild?: boolean;
}

function Button({ className, variant, size, asChild = false, ...props }: ButtonProps) {
  const Comp = asChild ? Slot.Root : 'button';
  return (
    // `data-slot` is how shadcn's generated code targets sub-parts; keeping it
    // means anything `npx shadcn add` writes composes with these primitives.
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
}

export { Button, buttonVariants };
