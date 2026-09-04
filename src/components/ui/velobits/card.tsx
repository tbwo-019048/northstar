'use client';

import { cn } from '@/lib/utils';

export interface CardProps extends React.ComponentProps<'div'> {
  /**
   * The material. `glass` (the default) is Tier S , `.glass-surface` from the
   * token layer. `panel` is the opaque original: `--panel` + `--border` +
   * `--shadow-sm`.
   */
  surface?: 'glass' | 'panel';
}

/**
 * App cards are `--radius-lg` (10px); the marketing site's larger cards use
 * `2xl` and pass it in.
 *
 * ## Tier S is the default material
 *
 * A Card is the archetypal Tier-S surface: its backdrop is the page, so the
 * material is measured against exactly one thing (`--fg` 13.48:1 light /
 * 13.22:1 dark, `--muted-fg` 5.57:1 / 6.19:1). `.glass-surface` carries NO
 * `backdrop-filter`, which is what makes it safe on a component that appears
 * twenty times in a grid , see `GlassSurface` for the layer budget.
 *
 * `surface="panel"` returns the opaque card, and is the right answer in three
 * cases: a Card nested inside another Card (glass over the same glass lands
 * 2/255 apart, so the inner one vanishes), a Card inside a Tier-O overlay, and
 * anywhere a consumer needs a guaranteed opaque fill.
 *
 * ## Three utilities that silently dismantle the glass variant
 *
 * `.glass-surface` lives in Tailwind's `components` layer, so a utility on the
 * same element wins. Each of these looks harmless and removes part of the
 * material:
 *
 *  - `bg-*` replaces the tint, which IS the material , the card becomes flat.
 *  - `shadow-*` replaces the whole `box-shadow` list, and that list carries the
 *    inset specular highlight. In dark mode the highlight is the entire material
 *    (3.18:1 over the composite), so `shadow-sm` erases it.
 *  - `border-*` colour utilities replace the one sanctioned translucent border
 *    with an opaque one, dropping it from 1.60:1 to 1.53:1 in light and 1.50:1
 *    to 1.30:1 in dark.
 *
 * If you need any of those, you want `surface="panel"`, not an override.
 *
 * ## The bare-`border` trap (why the panel variant is explicit)
 *
 * `Card` is the component that surfaced ADR-0031's first trap. The panel variant
 * carries both `border` and a text colour, and Tailwind v4's `border` utility
 * emits width and style ONLY , the colour falls back to `currentColor`. In dark
 * mode that painted a near-white outline around every card. The token layer's
 * `@layer base` rule fixes it globally with `border-color: var(--border)`, and
 * that rule MUST reference `--border` rather than `--color-border`; the latter
 * resolves against `:root` and inherits the light value into dark mode.
 *
 * `border-border` is written explicitly in the panel variant anyway, so it is
 * correct even in an app that has not imported the base layer. The glass variant
 * needs no such guard: `.glass-surface` sets `border` as a shorthand, colour
 * included, from the components layer.
 */
function Card({ className, surface = 'glass', ...props }: CardProps) {
  return (
    <div
      data-slot="card"
      className={cn(
        'flex flex-col gap-4 rounded-lg py-4 text-fg',
        surface === 'glass' ? 'glass-surface' : 'border border-border bg-panel shadow-sm',
        className,
      )}
      {...props}
    />
  );
}

/**
 * A grid rather than a column flexbox, and only when there is an action to place.
 *
 * `CardAction` has to sit at the top-right of the header, vertically spanning
 * both the title and the description. In a column flexbox that is impossible:
 * `ms-auto` right-aligns it but it still occupies its own row, so the badge
 * lands *below* the description instead of beside the title.
 *
 * `has-data-[slot=card-action]:` switches to two columns only when an action is
 * actually present, so a header with just a title and description is not left
 * with a dangling empty column.
 */
function CardHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        'grid auto-rows-min items-start gap-1 px-4',
        'has-data-[slot=card-action]:grid-cols-[1fr_auto]',
        className,
      )}
      {...props}
    />
  );
}

function CardTitle({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-title"
      className={cn('text-base leading-none font-semibold', className)}
      {...props}
    />
  );
}

function CardDescription({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-description"
      className={cn('text-sm text-muted-foreground', className)}
      {...props}
    />
  );
}

/**
 * Header-anchored actions , a badge, a kebab menu, a small button.
 *
 * `justify-self-end` rather than `ms-auto`: grid alignment is already
 * direction-aware, so `end` resolves to the right edge in LTR and the left edge
 * under `dir="rtl"` with no `rtl:` variant needed. `row-span-2` is what lifts it
 * beside the title instead of stacking below the description.
 */
function CardAction({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-action"
      className={cn(
        'col-start-2 row-span-2 row-start-1 flex items-center gap-2 self-start justify-self-end',
        className,
      )}
      {...props}
    />
  );
}

function CardContent({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="card-content" className={cn('px-4', className)} {...props} />;
}

function CardFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="card-footer"
      className={cn('flex items-center gap-2 px-4', className)}
      {...props}
    />
  );
}

export { Card, CardHeader, CardTitle, CardDescription, CardAction, CardContent, CardFooter };
