'use client';

import { cn } from '@/lib/utils';

export interface GlassSurfaceProps extends React.ComponentProps<'div'> {
  /**
   * Which glass material to paint. Defaults to `overlay`.
   *
   *  - `surface`  → `.glass-surface` , Tier S, the component-surface material.
   *  - `overlay`  → `.glass` , Tier O, for things that float over page content.
   *  - `elevated` → `.glass .glass-elevated` , Tier O stacked on Tier O.
   */
  tier?: 'surface' | 'overlay' | 'elevated';
  /**
   * Add `backdrop-filter` to a `surface` tier. Default `false`, and that default
   * is the point , see "Why Tier S does not blur by default" below. Ignored on
   * `overlay` and `elevated`, which always blur.
   */
  blur?: boolean;
  asChild?: never;
}

/**
 * The generic glass primitive. It spans BOTH tiers via `tier`; the CSS class
 * `.glass-surface` is specifically Tier S. The component is not named after the
 * class , `GlassSurface tier="overlay"` emits `.glass`, and that is the default.
 *
 * ## Two tiers, and they are not the same material
 *
 * **Tier S , `tier="surface"` → `.glass-surface`.** The material for component
 * surfaces: Card · Alert · Panel · Sidebar · a table's CONTAINER · Input /
 * NativeSelect / Textarea wells · Skeleton hosts. Its backdrop is KNOWN (it is
 * the page), so the values are measured against exactly one thing , `--fg`
 * 13.48:1 light / 13.22:1 dark, `--muted-fg` 5.57:1 / 6.19:1. Because
 * `--muted-fg` is safe here, Tier S deliberately does NOT apply the
 * `--muted-on-glass` override that `.glass` does; stepping it up would darken
 * every secondary label in the product for no accessibility gain.
 *
 * **Tier O , `tier="overlay"` → `.glass`.** For surfaces that float over
 * arbitrary page content: Dialog · Sheet/SidePanel · Popover · DropdownMenu ·
 * Toast · CommandPalette · a sticky TopBar. The backdrop is unknowable, so every
 * value is measured against all seven worst-case backdrops in the palette and
 * muted text steps up to `--muted-on-glass`.
 *
 * `tier="elevated"` is Tier O stacked on Tier O , a Popover inside a Dialog. It
 * is plum-tinted in dark mode and runs at a higher alpha, because a chromatic
 * tint at 0.85 drifts visibly green over the lime brand fill.
 *
 * ## What is still FORBIDDEN
 *
 *  - **Page and body backgrounds.** Both a product decision and where blur costs
 *    the most for the least effect , there is nothing behind them to see.
 *  - **Table ROWS.** One `backdrop-filter` per row repaints its own backdrop
 *    region on every scroll frame. Surface treatment belongs on the container.
 *  - **Nested glass.** The inner surface composites over the outer one, so two
 *    instances of the same tier land 2/255 apart , the inner surface vanishes and
 *    the blur is paid for twice. This is why a control inside a glass Card stays
 *    on the opaque `--panel`: an opaque well inside a tinted card is 10/255 in
 *    light and 9/255 in dark, which is the separation that makes it read as a
 *    control at all.
 *  - **More than ~6 live blur layers per view.**
 *  - **Animating the blur RADIUS.** Every frame forces a full backdrop repaint.
 *    Animate `opacity` and `transform`, which is what the `animate-in` utilities
 *    on the overlay components already do.
 *
 * ## Why Tier S does not blur by default
 *
 * `backdrop-filter` is the expensive half of glass, and Tier S exists to be safe
 * on a REPEATED component. A 20-card grid or a table of 20 rows must not mount 20
 * backdrop-filter layers, each snapshotting and repainting its own backdrop
 * region on every scroll frame. The tint is what makes the material visible, not
 * the blur , so `.glass-surface` ships without it and `blur` opts in.
 *
 * Opt in only where content genuinely scrolls behind the surface: a sticky top
 * bar, a sidebar over a scroll region. Keep the total under ~6 live blur layers
 * per view, and never nest blur in blur.
 *
 * ## Two layout behaviours that will look like component bugs
 *
 * Both come from `backdrop-filter`, so they apply to `overlay`, `elevated`, and
 * to `surface` ONLY when `blur` is set:
 *
 *  - it establishes a containing block for `position: fixed` descendants, so a
 *    fixed child of a blurred surface is trapped inside it;
 *  - it forms a stacking context, so `z-index` within is scoped locally.
 *
 * Legibility, the `@supports` fallback and the `prefers-reduced-transparency`
 * override all live in `@velobitsio/tokens/glass.css` alongside the classes, so
 * they apply identically to any consumer that reaches for a class directly.
 */
function GlassSurface({ className, tier = 'overlay', blur = false, ...props }: GlassSurfaceProps) {
  return (
    <div
      data-slot="glass-surface"
      className={cn(
        // `.glass-surface-blur` carries the whole Tier-S material on its own ,
        // glass.css declares the background, border and shadow on both classes
        // , so emitting one or the other is correct, never both.
        tier === 'surface' ? (blur ? 'glass-surface-blur' : 'glass-surface') : 'glass',
        tier === 'elevated' && 'glass-elevated',
        className,
      )}
      {...props}
    />
  );
}

export { GlassSurface };
