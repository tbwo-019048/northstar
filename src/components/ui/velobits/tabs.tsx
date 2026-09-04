'use client';

import { cva, type VariantProps } from 'class-variance-authority';
import { Tabs as TabsPrimitive } from 'radix-ui';

import { cn } from '@/lib/utils';

/**
 * Radix Tabs, which is the primitive that makes the ARIA correct for free:
 * `role="tablist"` / `role="tab"` / `role="tabpanel"`, the `aria-selected` and
 * `aria-controls`/`aria-labelledby` wiring between a trigger and its panel, and
 * roving focus so Tab enters the strip once and Arrow keys move within it.
 *
 * Hand-rolled tab strips get the roving-focus half wrong almost every time: they
 * leave every trigger in the tab order, so reaching the panel of a six-tab page
 * costs six Tab presses.
 *
 * ## `data-orientation` is written explicitly, and that is deliberate
 *
 * Radix already emits `data-orientation` on the root, so the attribute below is
 * a duplicate of the same value. It stays because every orientation-dependent
 * class in this file is a `group-data-[orientation=…]/tabs:` selector reading
 * that attribute , if a future Radix release stopped emitting it, the vertical
 * layout would silently flatten with nothing to point at. Cheap insurance for a
 * styling contract that has no other guard.
 *
 * ## Nothing here animates layout
 *
 * The `line` variant's underline is an `::after` pseudo-element whose *opacity*
 * crossfades , not a sliding indicator whose position is animated, and not a
 * border that would change the trigger's box. `transition-colors` rather than the
 * dashboard app's `transition-all` for the same reason: `transition-all` will
 * happily animate whatever layout property a caller adds via `className`.
 */
function Tabs({
  className,
  orientation = 'horizontal',
  ...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      data-orientation={orientation}
      orientation={orientation}
      className={cn('group/tabs flex gap-2 data-[orientation=horizontal]:flex-col', className)}
      {...props}
    />
  );
}

/**
 * Two variants, and they are not interchangeable:
 *
 *  - `default` , a filled track with the active tab as a raised pill. Reads as a
 *    control, so it suits a small in-panel switch.
 *  - `line` , a transparent track with an underline under the active tab. Reads
 *    as page structure, which is why the dashboard app's Flag detail and Audit
 *    detail panels both use it: those tabs switch *sections of a record*, not a
 *    setting.
 *
 * The variant is mirrored onto `data-variant` because the triggers style
 * themselves from it through `group-data-[variant=…]/tabs-list:`. A trigger has
 * no way to ask its list which variant it is in other than the DOM.
 */
const tabsListVariants = cva(
  [
    'group/tabs-list inline-flex w-fit items-center justify-center rounded-lg p-[3px]',
    'text-muted-foreground',
    'group-data-[orientation=horizontal]/tabs:h-9',
    'group-data-[orientation=vertical]/tabs:h-fit group-data-[orientation=vertical]/tabs:flex-col',
    'data-[variant=line]:rounded-none',
  ],
  {
    variants: {
      variant: {
        default: 'bg-bg2 control-recessed',
        line: 'gap-1 bg-transparent',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  },
);

function TabsList({
  className,
  variant = 'default',
  ...props
}: React.ComponentProps<typeof TabsPrimitive.List> & VariantProps<typeof tabsListVariants>) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      data-variant={variant}
      className={cn(tabsListVariants({ variant }), className)}
      {...props}
    />
  );
}

/**
 * The inactive step is `text-muted-foreground`, not the dashboard app's
 * `text-foreground/60`.
 *
 * That alpha was an un-gated guess: 60% of `--fg` over `--bg2` computes to
 * roughly 3:1, under AA for 14px text, and the dashboard app patched around it
 * with a `dark:text-muted-foreground` override that made the two themes disagree
 * about what an inactive tab is. `--muted-fg` is measured against both themes'
 * surfaces by `@velobitsio/tokens`' contrast suite, so one class covers both.
 *
 * The underline for `line` is positioned with **logical** inset on the vertical
 * axis (`end-[-4px]`, i.e. `inset-inline-end`) rather than `-right-1`, so it
 * lands on the correct side of the strip under `dir="rtl"` with no variant. The
 * horizontal case uses `bottom`, which is block-axis and already unaffected.
 */
function TabsTrigger({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      data-slot="tabs-trigger"
      className={cn(
        [
          'relative inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center gap-1.5',
          'rounded-md border border-transparent px-2 py-1 text-sm font-medium whitespace-nowrap',
          'text-muted-foreground hover:text-fg',
          'transition-colors duration-micro ease-out',
          // The visible ring comes from the token layer's global :focus-visible
          // rule; this adds the soft halo. `outline-none` only kills the UA default.
          'outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40',
          'disabled:pointer-events-none disabled:opacity-50',
          "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        ],
        // Vertical strips fill their column and read left-to-right like a nav.
        [
          'group-data-[orientation=vertical]/tabs:w-full',
          'group-data-[orientation=vertical]/tabs:justify-start',
        ],
        // `default`: the active tab becomes a raised panel-coloured pill.
        [
          'data-[state=active]:text-fg',
          'group-data-[variant=default]/tabs-list:data-[state=active]:bg-panel',
          'group-data-[variant=default]/tabs-list:data-[state=active]:control-raised',
        ],
        // `line`: no pill at all , the underline below is the entire indicator.
        [
          'group-data-[variant=line]/tabs-list:bg-transparent',
          'group-data-[variant=line]/tabs-list:data-[state=active]:bg-transparent',
          'group-data-[variant=line]/tabs-list:data-[state=active]:shadow-none',
        ],
        // The underline. Present but transparent on every trigger, so switching
        // tabs crossfades opacity instead of moving or resizing anything.
        [
          'after:absolute after:bg-fg after:opacity-0',
          'after:transition-opacity after:duration-micro after:ease-out',
          'group-data-[orientation=horizontal]/tabs:after:inset-x-0',
          'group-data-[orientation=horizontal]/tabs:after:bottom-[-5px]',
          'group-data-[orientation=horizontal]/tabs:after:h-0.5',
          'group-data-[orientation=vertical]/tabs:after:inset-y-0',
          'group-data-[orientation=vertical]/tabs:after:end-[-4px]',
          'group-data-[orientation=vertical]/tabs:after:w-0.5',
          'group-data-[variant=line]/tabs-list:data-[state=active]:after:opacity-100',
        ],
        className,
      )}
      {...props}
    />
  );
}

/**
 * `outline-none` here is safe and is not a focus-ring removal: Radix gives the
 * panel `tabIndex={0}` so the keyboard path from the strip into the content
 * works, and a 2px ring around a whole page section on arrival is noise. The
 * focusable controls *inside* it keep their rings.
 */
function TabsContent({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      data-slot="tabs-content"
      className={cn('flex-1 outline-none', className)}
      {...props}
    />
  );
}

export { Tabs, TabsList, TabsTrigger, TabsContent, tabsListVariants };
