'use client';

import { Slider as SliderPrimitive } from 'radix-ui';

import { cn } from '@/lib/utils';

/**
 * A slider is the control for a value you find by FEEL rather than by typing:
 * "somewhere around 20px", "roughly 60%". If the useful answers are a short list
 * of named values, that is a `SegmentedControl` or a `NativeSelect` , seven
 * two-digit segments beat a slider every time, and a slider you have to nudge
 * with arrow keys to hit an exact number is a number input wearing a costume.
 *
 * Single or multi-thumb, both orientations, RTL handled by the primitive.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ## THE NAME GOES ON THE THUMB, NOT ON THE ROOT
 *
 * This is the same class of trap `SegmentedControl` documents, one element
 * further in. Radix renders `Slider.Root` as a plain `<span>` and puts
 * `role="slider"`, `tabindex`, `aria-valuenow`, `aria-valuemin` and
 * `aria-valuemax` on each **Thumb**. So:
 *
 *   - `<label htmlFor="…">` pointing at the root associates with nothing. A
 *     `<span>` is not a labelable element, no accessible name is computed, and
 *     **nothing warns**.
 *   - `aria-label` on the root is worse than useless: it names an element with no
 *     role, while the thing AT actually focuses , the thumb , stays unnamed.
 *
 * So the name is required at the type level, in one of the two spellings that
 * work, and this component forwards it **onto the thumbs**. The accompanying
 * test asserts the name resolves on the element with `role="slider"`, not merely
 * that the attribute exists somewhere.
 *
 * ```tsx
 * <span id="size-label">Size</span>
 * <Slider aria-labelledby="size-label" value={[size]} onValueChange={…} />
 *
 * // Two thumbs need two names , one shared name would announce both handles
 * // identically and a screen-reader user could not tell which end they held.
 * <Slider
 *   aria-label="Price range"
 *   thumbLabels={['Minimum price', 'Maximum price']}
 *   value={[10, 90]}
 *   onValueChange={…}
 * />
 * ```
 *
 * ## `formatValue` exists because `aria-valuenow` is a bare number
 *
 * A slider announces "24". Whether that is 24 pixels, 24 percent or 24 items is
 * carried entirely by the visible label, which a screen-reader user hears once
 * on focus and not again through the whole drag. `formatValue` writes
 * `aria-valuetext`, which REPLACES the number in the announcement , so the value
 * carries its own unit on every step.
 *
 * ## The 24px target is a pseudo-element, not a bigger thumb
 *
 * WCAG 2.2 §2.5.8 sets 24×24 CSS px as the minimum pointer target. A 24px thumb
 * is visually heavy on a 6px track, so the visible thumb stays 16px and an
 * invisible `::before` extends the hit area to 24px. `-inset-1` is 4px on every
 * side: 16 + 8 = 24 exactly. Do not "clean this up" into a smaller inset.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/**
 * A `role="slider"` with no accessible name is an unlabelled control. Exactly one
 * of the two spellings, never both , `aria-labelledby` silently wins over
 * `aria-label`, so a call site carrying both is a lie about which text is read.
 */
type SliderName =
  | { 'aria-label': string; 'aria-labelledby'?: never }
  | { 'aria-labelledby': string; 'aria-label'?: never };

export type SliderProps = Omit<
  React.ComponentProps<typeof SliderPrimitive.Root>,
  'aria-label' | 'aria-labelledby' | 'asChild'
> & {
  /**
   * One accessible name per thumb, in thumb order. Required in practice as soon
   * as there is more than one thumb; with a single thumb the group name above is
   * already correct and this can be omitted.
   */
  thumbLabels?: string[];
  /**
   * Turns the raw number into what AT announces, via `aria-valuetext`. Return a
   * value WITH its unit , `(v) => `${v}px`` , since `aria-valuenow` alone is a
   * bare number.
   */
  formatValue?: (value: number) => string;
} & SliderName;

function Slider({
  className,
  thumbLabels,
  formatValue,
  value,
  defaultValue,
  min = 0,
  max = 100,
  'aria-label': ariaLabel,
  'aria-labelledby': ariaLabelledBy,
  ...props
}: SliderProps) {
  /*
   * How many thumbs to render.
   *
   * Radix derives thumb count from the length of `value`/`defaultValue` and
   * renders nothing on its own, so this has to be worked out here. The `[min,
   * max]` fallback is Radix's own: uncontrolled with neither prop is a single
   * thumb spanning the range.
   */
  const values = value ?? defaultValue ?? [min];

  return (
    <SliderPrimitive.Root
      data-slot="slider"
      value={value}
      defaultValue={defaultValue}
      min={min}
      max={max}
      className={cn(
        'relative flex touch-none items-center select-none',
        // `touch-none` is not optional: without it a drag on a touch device
        // scrolls the page instead of moving the thumb.
        'data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50',
        'data-[orientation=horizontal]:h-4 data-[orientation=horizontal]:w-full',
        'data-[orientation=vertical]:h-40 data-[orientation=vertical]:w-4',
        'data-[orientation=vertical]:flex-col',
        className,
      )}
      {...props}
    >
      {/* The track is `control-recessed` for the same reason an Input is: this is
          the well the thumb travels in, not an object sitting on the surface. */}
      <SliderPrimitive.Track
        data-slot="slider-track"
        className={cn(
          'relative grow overflow-hidden rounded-pill border border-border bg-bg2 control-recessed',
          'data-[orientation=horizontal]:h-1.5 data-[orientation=horizontal]:w-full',
          'data-[orientation=vertical]:h-full data-[orientation=vertical]:w-1.5',
        )}
      >
        <SliderPrimitive.Range
          data-slot="slider-range"
          className={cn(
            'absolute bg-primary',
            'data-[orientation=horizontal]:h-full',
            'data-[orientation=vertical]:w-full',
          )}
        />
      </SliderPrimitive.Track>

      {values.map((thumbValue, index) => (
        <SliderPrimitive.Thumb
          // Index is the correct key here and nothing else is: thumbs are
          // positional by definition, and the value is not unique (two thumbs
          // may sit on the same step mid-drag).
          key={index}
          data-slot="slider-thumb"
          aria-label={thumbLabels?.[index] ?? ariaLabel}
          // Only when there is no per-thumb name to prefer , a thumb carrying
          // both would announce only the referenced text and silently drop the
          // specific one.
          aria-labelledby={thumbLabels?.[index] ? undefined : ariaLabelledBy}
          aria-valuetext={formatValue ? formatValue(thumbValue) : undefined}
          className={cn(
            'relative block size-4 shrink-0 rounded-full',
            'border border-field-border bg-panel control-raised',
            'transition-[box-shadow,border-color] duration-micro ease-out',
            'outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40',
            /*
             * `--field-border` and not `--border`: in dark mode the track fill
             * (`--bg2`) and the thumb fill (`--panel`) are the SAME hex, so the
             * edge is the only thing separating the knob from its groove.
             * `--field-border` is the one ramp step clearing 3:1 against both
             * themes' surfaces , the same reasoning, and the same token, as the
             * selected segment in `segmented-control.tsx`.
             */
            'data-[disabled]:cursor-not-allowed',
            // The 24×24 pointer target. Invisible, purely for the hit test, and
            // `pointer-events-none` would defeat the entire purpose.
            'before:absolute before:-inset-1 before:rounded-full before:content-[""]',
            'hover:not-data-[disabled]:border-fg',
          )}
        />
      ))}
    </SliderPrimitive.Root>
  );
}

export { Slider };
