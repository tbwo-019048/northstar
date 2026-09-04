'use client';

import { cn } from '@/lib/utils';

/**
 * `border-input` maps to `--field-border`, NOT `--border`.
 *
 * The two are split because they want different weights: a table separator
 * should recede, a field must announce where you can type. It is also the half
 * WCAG 1.4.11 gates , a control's edge is "required to identify" the control, so
 * it needs 3:1, while a decorative divider does not. `--field-border` is
 * `neutral-500`, the only ramp step clearing 3:1 in both themes.
 *
 * `aria-invalid` styling is driven by the attribute rather than a prop, so
 * whatever form library the app uses (react-hook-form + zod, in the dashboard
 * app's case) gets error styling by setting the attribute it already sets.
 *
 * ## Why this stayed on the opaque `--panel` when Card and Alert went to Tier S
 *
 * A control is not a surface. Three measurements, in order of weight:
 *
 *  1. **Tier S on Tier S self-cancels.** A glass field inside a glass Card
 *     composites 2/255 from the card , under the 8/255 perceptibility floor the
 *     token suite gates the tiers with , so the well would disappear and the
 *     border alone would carry the control. Opaque `--panel` inside a glass Card
 *     measures 10/255 in light and 9/255 in dark: moving Card to Tier S is what
 *     gives this field a visible well, and putting the field on the same material
 *     would give it straight back.
 *  2. **1.4.11 stays PROVABLE.** `--field-border` is opaque by token policy, so
 *     over an opaque fill it has one value per surface , 3.86:1 on `--panel` and
 *     3.33:1 on the page in light, 3.58:1 and 4.48:1 in dark , and those are the
 *     pairs `@velobitsio/tokens` gates. On Tier S the same border still passes
 *     everywhere (3.66:1 light over the page, 3.75:1 light over a panel, 4.04:1
 *     and 3.89:1 dark, 3.71:1 in the worst nested case), so the gate is not what
 *     stopped this , but the measurement becomes a function of the whole ancestor
 *     chain instead of one pair a test can pin.
 *  3. **Tier S reads as RAISED**: a bottom-weighted shadow in light, a lit top
 *     edge in dark. That is the wrong affordance for something you type into, and
 *     on a 36px field the specular highlight is a 1px white line right above the
 *     caret.
 *
 * Two things that are NOT the reason, so nobody re-litigates them: the focus ring
 * is unaffected (`ring-ring/40` composites to 1.73:1 over the Tier-S surface
 * against 1.75:1 over `--panel`, and the base layer's `:focus-visible` outline is
 * opaque `--ring` either way), and neither is performance , Tier S carries no
 * `backdrop-filter` at all.
 */
function Input({ className, type, ...props }: React.ComponentProps<'input'>) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        'flex h-9 w-full min-w-0 rounded-md border border-input bg-panel px-3 py-1 text-sm text-fg control-recessed',
        'transition-[color,box-shadow] duration-micro ease-out',
        'placeholder:text-muted-foreground',
        'selection:bg-primary selection:text-on-primary',
        'outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40',
        'disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50',
        // File inputs get their own text treatment; the UA button is styled by
        // the ::file-selector-button reset in the token layer.
        'file:me-3 file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium',
        'aria-invalid:border-danger aria-invalid:ring-danger/30',
        className,
      )}
      {...props}
    />
  );
}

export { Input };
