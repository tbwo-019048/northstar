'use client';

import { cn } from '@/lib/utils';

/**
 * A cva-styled NATIVE `<select>`, and that is a deliberate refusal of stock
 * shadcn's Radix-based Select.
 *
 * ADR-0031 made this call for a concrete reason: `@radix-ui/react-select` is
 * undriveable under happy-dom. It measures the trigger and viewport to position
 * its popper, and in a DOM without layout every option lands at 0×0, so a test
 * cannot click one. The choice is between a component you cannot test and a
 * native control that works everywhere, on mobile, with the platform's own
 * picker , the native control wins.
 *
 * Do not "upgrade" this to Radix Select. If a design genuinely needs rich option
 * rendering (icons, descriptions, async search), that is a Combobox , a separate
 * Tier-3 component with its own test strategy , not a change to this one.
 *
 * The chevron is a background SVG rather than an overlaid element so the whole
 * control stays a single focusable node. It is positioned with `right` in a
 * data-URI, so under `dir="rtl"` set `bg-[position:left_…]` at the call site;
 * CSS backgrounds are not direction-aware.
 *
 * ## Opaque `--panel`, deliberately, while Card and Alert are Tier-S glass
 *
 * Same call as `Input`, which documents the reasoning in full. In short: a glass
 * control inside a glass Card composites 2/255 off it and loses its well, where
 * the opaque fill sits 10/255 clear in light and 9/255 in dark; and
 * `--field-border`'s WCAG 1.4.11 margin stops being one gateable number per
 * surface (3.86:1 on `--panel` light, 3.58:1 dark) and becomes a function of the
 * ancestor chain (3.66:1–4.04:1 , passing, but not pinnable by a test).
 */
function NativeSelect({ className, children, ...props }: React.ComponentProps<'select'>) {
  return (
    <select
      data-slot="native-select"
      className={cn(
        'flex h-9 w-full appearance-none rounded-md border border-input bg-panel ps-3 pe-8 text-sm text-fg control-recessed',
        'transition-[color,box-shadow] duration-micro ease-out',
        'outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40',
        'disabled:cursor-not-allowed disabled:opacity-50',
        'aria-invalid:border-danger aria-invalid:ring-danger/30',
        /*
         * The chevron. `currentColor` cannot be used inside a data URI, so this
         * is the muted step spelled out; it tracks the theme via two variants.
         *
         * ── NO SPACE AND NO QUOTE MAY APPEAR IN HERE. BOTH ARE LOAD-BEARING ──
         *
         * Every space is `%20` and every attribute quote is `%27`, so the whole
         * value is one unbroken, unquoted token. Two different tools each break
         * on one of those characters, and both failures are silent.
         *
         * **Spaces , `cn()` shreds the class.** `cn()` is clsx + tailwind-merge,
         * and tailwind-merge SPLITS ITS INPUT ON WHITESPACE. A literal space
         * inside an arbitrary value does not stay inside it: the class is torn
         * into fragments which are then merged against each other as if they
         * were utilities. Shipped that way, this produced two symptoms at once ,
         *
         *   1. `stroke-width='2'`, `stroke-linecap='round'` and
         *      `stroke-linejoin='round'` were deduped as conflicting `stroke-*`
         *      utilities, and Tailwind's own scanner (which also splits on
         *      whitespace) only ever saw a truncated, unterminated candidate, so
         *      it emitted NO RULE AT ALL. `background-image` computed to `none`
         *      , and `appearance-none` had already removed the native arrow, so
         *      the control had no dropdown indicator whatsoever.
         *   2. The leading fragment, up to the first space, was classified as a
         *      background-COLOR and evicted `bg-panel`, leaving a transparent
         *      fill. Chromium paints a select's option popup from the select's
         *      own background and falls back to WHITE when it is transparent,
         *      irrespective of `color-scheme`. In dark mode that put near-white
         *      `--fg` option text on a white popup , invisible.
         *
         * **Quotes , Tailwind reads the JS escape literally.** Tailwind v4 scans
         * source files as PLAIN TEXT. A double quote inside this value has to be
         * backslash-escaped for the JS string, and Tailwind sees the backslash,
         * so it emits an escaped quote into the stylesheet. Lightning CSS rejects
         * that as `BadUrl` and the WHOLE SHEET fails to parse , a 500, not a
         * missing chevron. Percent-encoding the SVG's own attribute quotes lets
         * this go unquoted, so there is no quote in the source to escape.
         *
         * The same plain-text scan is why nothing above spells the broken forms
         * out literally: a comment in this file is scanned exactly like code.
         *
         * Tailwind's usual `_`-for-space escape is not an option here: it
         * deliberately leaves underscores alone in URLs, because URLs contain
         * them.
         *
         * `primitives.test.tsx` pins this by decoding the value and checking the
         * SVG is whole.
         */
        'bg-[url(data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns=%27http://www.w3.org/2000/svg%27%20viewBox=%270%200%2024%2024%27%20fill=%27none%27%20stroke=%27%23646562%27%20stroke-width=%272%27%20stroke-linecap=%27round%27%20stroke-linejoin=%27round%27%3E%3Cpath%20d=%27m6%209%206%206%206-6%27/%3E%3C/svg%3E)]',
        'dark:bg-[url(data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns=%27http://www.w3.org/2000/svg%27%20viewBox=%270%200%2024%2024%27%20fill=%27none%27%20stroke=%27%23a5a39f%27%20stroke-width=%272%27%20stroke-linecap=%27round%27%20stroke-linejoin=%27round%27%3E%3Cpath%20d=%27m6%209%206%206%206-6%27/%3E%3C/svg%3E)]',
        'bg-[length:16px] bg-[position:right_0.625rem_center] bg-no-repeat',
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}

export { NativeSelect };
