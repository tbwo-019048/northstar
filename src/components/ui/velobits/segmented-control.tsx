'use client';

import { ToggleGroup as ToggleGroupPrimitive } from 'radix-ui';

import { cn } from '@/lib/utils';

export interface SegmentOption {
  value: string;
  label: React.ReactNode;
  /** `danger` renders the selected state in `--danger` (e.g. the Production env). */
  tone?: 'default' | 'danger';
  /** Disables this segment only; the rest of the control stays operable. */
  disabled?: boolean;
}

/**
 * A `role="radiogroup"` with no accessible name is an unlabelled control, and
 * there is no way to give this one a name from outside (see the docblock). So the
 * name is required at the type level, and it is one of the two forms that
 * actually work , never both, since `aria-labelledby` silently wins over
 * `aria-label` and having both in a call site is a lie about which text is read.
 */
type SegmentedControlName =
  | { 'aria-label': string; 'aria-labelledby'?: never }
  | { 'aria-labelledby': string; 'aria-label'?: never };

export type SegmentedControlProps = {
  value: string;
  onValueChange: (value: string) => void;
  options: SegmentOption[];
  /** Forwarded to the radiogroup root so other elements can reference the group. */
  id?: string;
  /**
   * id(s) of the hint or error text describing the group. A dangling id fails as
   * silently as a dangling `aria-labelledby` , see the docblock.
   */
  'aria-describedby'?: string;
  /**
   * Disables every segment. This is a REAL disable , see the docblock; it is not
   * `pointer-events-none`.
   */
  disabled?: boolean;
  className?: string;
} & SegmentedControlName;

/**
 * Single-select segmented control on Radix ToggleGroup. Selection can never be
 * empty: clicking the active segment is a no-op rather than a deselect, because
 * "no environment selected" is not a state the env switcher this was built for
 * can render.
 *
 * `type="single"` is what makes Radix emit `role="radiogroup"` on the root and
 * `role="radio"` + `aria-checked` on each segment, which is the correct mapping ,
 * a segmented control is a radio group that looks like a row of buttons.
 *
 * ## One known gap, recorded rather than silently inherited
 *
 * Radix's roving focus MOVES focus on an arrow key without selecting; activation
 * is Enter or Space. APG's radio-group pattern says selection should follow focus.
 * Closing that would mean selecting on `focus`, which also fires on a mouse press
 * and on programmatic focus, so it is left alone deliberately , the group is one
 * tab stop either way, and the mismatch costs a keyboard user one extra keypress
 * rather than access. `segmented-control.test.tsx` pins the actual behaviour.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ## TWO TRAPS FIXED HERE, AND FIXED INDEPENDENTLY IN THE CONSUMER
 *
 * The dashboard app's own segmented control hit both of the bugs below and was
 * repaired separately, reaching the same two conclusions this implementation did:
 * a `div` root leaves an external `htmlFor` dangling, and `pointer-events-none`
 * is a fake disable. Two implementations converging on the same pair of fixes is
 * why both are written down here rather than treated as local trivia. What this
 * one adds on top is per-segment `disabled`.
 *
 * ### 1. `htmlFor` could never label this, and now there is a path that can
 *
 * Radix renders the root as a `<div>`. A `<div>` is not a *labelable* element,
 * so `<label htmlFor="…">` pointing at it associates with nothing , the browser
 * computes no accessible name, no click-to-focus, and **nothing warns**. It looks
 * exactly like a working label in the markup and in a screenshot.
 *
 * The fix is not to make the root labelable (a `<fieldset>`/`<legend>` would mean
 * abandoning the primitive) but to require an accessible name by one of the two
 * routes that do work on a `role="radiogroup"`:
 *
 * ```tsx
 * // A visible label element, referenced by id.
 * <span id="env-label">Environment</span>
 * <SegmentedControl aria-labelledby="env-label" … />
 *
 * // Or no visible label at all.
 * <SegmentedControl aria-label="Environment" … />
 * ```
 *
 * A dangling `aria-labelledby` (pointing at an id that is not in the document)
 * fails just as silently as the `htmlFor` did, so the accompanying test asserts
 * that the name actually *resolves*, not merely that the attribute is present.
 *
 * The dashboard app's repaired control also grew the matching wiring in the
 * other direction, and so does this one: `id` is forwarded onto the root so
 * other elements can point at the group, and `aria-describedby` associates hint
 * or error text with it , both under their native ARIA spelling. A dangling
 * `aria-describedby` fails exactly as silently as a dangling `aria-labelledby`,
 * so its test asserts that the description resolves too.
 *
 * ### 2. `pointer-events-none` is not a disable
 *
 * It removes the mouse and nothing else. The control keeps its `tabindex`, so it
 * is still reachable by keyboard and still operable with Arrow keys; assistive
 * tech is never told it is unavailable; and the styling that usually rides along
 * (`opacity-50`) makes it *look* disabled, which is the part that convinces
 * everyone it is.
 *
 * `disabled` here sets Radix's real `disabled`, which propagates to every
 * segment as the `disabled` attribute on a real `<button>`. That is what removes
 * them from the tab order (Radix also drops them from its roving-focus
 * collection), blocks activation from any input device, and makes AT announce the
 * state. Per-segment `disabled` on a `SegmentOption` works the same way.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * ## WHY THE SELECTION NEEDS A BORDER AND NOT JUST A FILL
 *
 * The active segment used to be `bg-panel` + `control-raised` on a `bg-bg2`
 * track. Measured in the browser, that was **no indicator at all in dark mode**:
 *
 *   dark    track #2C2D2C, pill #2C2D2C   1.00:1   , `--bg2` IS `--panel` in dark
 *   light   track #F2EBE8, pill #FFFFFF   1.18:1
 *
 * and `control-raised` , the lit edge that was supposed to carry dark mode , was
 * generating nothing at all, because `data-[state=on]:control-raised` was a
 * variant over a hand-written class rather than over a utility. That is fixed in
 * `controls.css`, which now declares both as `@utility`; read the docblock there
 * before touching either file.
 *
 * Restoring the edge is necessary and not sufficient. It is one translucent pixel
 * at 1.56:1 over the fill, and the drop shadow beneath it is black-on-near-black
 * in dark mode. So the fill still had to stop being the only other signal, and
 * the remaining one , selected vs unselected TEXT , measures 1.13:1 inside a
 * glass surface (`--fg` against `--muted-on-glass`).
 *
 * `--field-border` is the answer the palette already contains. It is the one ramp
 * step documented as "the ONLY ramp step clearing 3:1 against both themes'
 * surfaces", and it measures:
 *
 *   dark    #82827E on #2C2D2C            3.58:1
 *   light   #82827E on #FFFFFF / #F2EBE8  3.86:1 / 3.27:1
 *
 * , i.e. it clears WCAG 2.2 §1.4.11's 3:1 bar for a non-text graphic against the
 * pill AND against the track, in both themes. It is also not a new idea here:
 * `border-field-border bg-panel control-raised` is exactly what
 * `Button variant="secondary"` already is, which is the same object , a raised,
 * distinct thing sitting on a surface.
 * ─────────────────────────────────────────────────────────────────────────────
 */
export function SegmentedControl({
  value,
  onValueChange,
  options,
  id,
  'aria-describedby': ariaDescribedBy,
  disabled = false,
  className,
  ...nameProps
}: SegmentedControlProps) {
  return (
    <ToggleGroupPrimitive.Root
      data-slot="segmented-control"
      type="single"
      value={value}
      onValueChange={(next) => {
        // Radix reports the empty string when the active item is clicked again.
        // Swallowing it is what keeps the selection non-empty.
        if (next) onValueChange(next);
      }}
      disabled={disabled}
      // Styling hook only. `aria-disabled` is deliberately NOT set on the group:
      // each segment already reports its own disabled state, and a group-level
      // duplicate makes some screen readers announce it twice.
      data-disabled={disabled ? '' : undefined}
      className={cn(
        'inline-flex rounded-md border border-border bg-bg2 control-recessed p-0.5',
        className,
      )}
      id={id}
      // Description wiring , same native ARIA spelling as the name props below.
      aria-describedby={ariaDescribedBy}
      {...nameProps}
    >
      {options.map((option) => (
        <ToggleGroupPrimitive.Item
          key={option.value}
          data-slot="segmented-control-item"
          value={option.value}
          disabled={option.disabled}
          className={cn(
            'rounded-sm px-2.5 py-1 text-[12.5px] font-medium text-muted-foreground',
            'transition-colors duration-micro ease-out',
            'outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40',
            'enabled:hover:text-fg',
            // A real disable needs a real cursor and a real dim. No
            // `pointer-events-none` , the `disabled` attribute already stops
            // activation, and removing pointer events would also remove the
            // `not-allowed` cursor that tells a mouse user why nothing happened.
            'disabled:cursor-not-allowed disabled:opacity-50',
            /*
             * THE SELECTED SEGMENT , three signals, and it needs all three.
             * See "WHY THE SELECTION NEEDS A BORDER" in the docblock for the
             * measurements; the short version is that the fill carries none of
             * the load in dark mode and the border carries all of it.
             *
             * The border is on EVERY segment, transparent until selected. Adding
             * one only to the active segment grows it by 2px and shunts the rest
             * of the row sideways on every change , the classic segmented-control
             * jitter. A ring would avoid that too, but Tailwind composes `ring-*`
             * into `box-shadow`, which `control-raised` sets outright, so the two
             * cannot coexist on one element.
             */
            'border border-transparent',
            'data-[state=on]:bg-panel data-[state=on]:control-raised',
            'data-[state=on]:border-field-border',
            option.tone === 'danger' ? 'data-[state=on]:text-danger' : 'data-[state=on]:text-fg',
          )}
        >
          {option.label}
        </ToggleGroupPrimitive.Item>
      ))}
    </ToggleGroupPrimitive.Root>
  );
}
