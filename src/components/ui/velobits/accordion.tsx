'use client';

import { Accordion as AccordionPrimitive } from 'radix-ui';

import { ChevronDownIcon } from '@velobitsio/icons';

import { cn } from '@/lib/utils';

/**
 * Radix Accordion, replacing a consumer's hand-rolled accordion.
 *
 * The hand-rolled version was careful and its keyboard handling was correct, but
 * it re-implemented roving focus, wrapping, Home/End and the trigger/panel ARIA
 * by hand. Radix ships all of it, wraps ArrowUp/ArrowDown at both ends (the
 * behaviour the original chose deliberately, on the grounds that a dead-ended
 * ArrowDown on a 4–8 row FAQ reads as a broken key) and skips disabled rows in
 * the collection.
 *
 * ## What carried over from the original, and why
 *
 *  - **`headingLevel`** (2 | 3 | 4, default 3) on `AccordionTrigger`. Radix's
 *    `Accordion.Header` is a hard-coded `<h3>`; the host page decides where the
 *    accordion sits in its outline, and a heading that lies about its depth is
 *    worse than no heading. Kept via `Header asChild`.
 *  - **`min-h-11`** on the trigger , the 44px touch minimum, even if a title
 *    renders unusually short.
 *  - **`border-0`, `bg-transparent`, own padding, own radius** on the trigger.
 *    These look redundant and are not: the dashboard app's `styles.css` styles bare
 *    `button` (border, background, radius, padding) in Tailwind's `components`
 *    layer. Utilities win that cascade, but only for properties one is actually
 *    written for. Drop `rounded-none` and the row grows a 6px-rounded
 *    panel-coloured box inside the container.
 *  - **Collapsing the open row.** `type="single"` defaults `collapsible` to
 *    `true` here, so "nothing open" stays a reachable state as it was before.
 *    Radix's own default is `false`, which would silently make the first-opened
 *    row permanent.
 *
 * ## What changed, and the one thing that did NOT carry over
 *
 *  - The original computed a per-row `border-radius` shorthand (`triggerRadius`)
 *    so only the first row's top and last row's bottom followed the container's
 *    9px *inner* radius. That machinery is gone: `overflow-hidden` on the root
 *    clips at the padding box, whose corner radius is already the outer radius
 *    minus the border width , so the hover band follows the same 9px curve with
 *    no arithmetic and no open/closed special case.
 *  - **Collapsed panels no longer stay in the DOM.** The original kept them
 *    mounted (with `aria-hidden` + `inert`) because that landing page is the
 *    product's only crawlable surface and every FAQ answer had to be in the
 *    served HTML. Radix unmounts closed content. `forceMount` does not
 *    substitute: with it, Radix's Collapsible never applies `hidden` and always
 *    renders children, so the panel does not collapse at all and
 *    `--radix-accordion-content-height` is never set , the caller would have to
 *    re-author both the collapse and the `aria-hidden`/`inert` pair. A crawlable
 *    FAQ is therefore a page-level requirement this shared component
 *    deliberately does not carry.
 */
type AccordionProps = React.ComponentProps<typeof AccordionPrimitive.Root> & {
  /**
   * The container's material. `glass` (the default since 2026-08-06) is Tier S,
   * the same `.glass-surface` a `Card` uses. `panel` is the opaque fallback,
   * and `none` is for an accordion nested inside a Card or a Dialog , glass
   * inside glass composites ~2/255 apart and both layers disappear.
   *
   * Note the border comes from `.glass-surface` itself in the `glass` case, so
   * no `border-border` utility is applied: a `border-*` utility beats the
   * components layer and would silently replace the material's own edge.
   */
  surface?: 'glass' | 'panel' | 'none';
};

function Accordion({ className, surface = 'glass', ...props }: AccordionProps) {
  // `collapsible` exists only on the single-value variant, hence the narrow. The
  // spread comes second so an explicit `collapsible={false}` still wins.
  // Cast to Root's own props, not AccordionProps , `surface` is ours and is
  // already destructured out above; it must not reach the Radix element.
  const rootProps = (
    props.type === 'single' ? { collapsible: true, ...props } : props
  ) as React.ComponentProps<typeof AccordionPrimitive.Root>;

  return (
    <AccordionPrimitive.Root
      data-slot="accordion"
      className={cn(
        'divide-y divide-border/60 overflow-hidden rounded-xl',
        surface === 'glass' && 'glass-surface',
        surface === 'panel' && 'border border-border bg-panel shadow-sm',
        className,
      )}
      {...rootProps}
    />
  );
}

function AccordionItem({
  className,
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Item>) {
  return <AccordionPrimitive.Item data-slot="accordion-item" className={className} {...props} />;
}

export interface AccordionTriggerProps extends React.ComponentProps<
  typeof AccordionPrimitive.Trigger
> {
  /**
   * Heading level wrapping the trigger, so the accordion slots into the host
   * page's outline. Default 3.
   */
  headingLevel?: 2 | 3 | 4;
}

/**
 * The heading needs `m-0`: the dashboard app's `styles.css` gives h1–h3 a 0.5rem
 * bottom margin, which would push every row off its divider. `flex` on the heading is
 * what lets the trigger fill the row , a heading is `display: block` and its
 * button child would otherwise shrink to its text.
 *
 * The chevron rotates via a `group-data-[state=open]/accordion-trigger:` selector
 * rather than a descendant selector on the trigger, so it is the chevron and only
 * the chevron that turns , a `[&>svg]` rule would also spin any icon a caller
 * puts inside the title.
 */
function AccordionTrigger({
  className,
  children,
  headingLevel = 3,
  ...props
}: AccordionTriggerProps) {
  const Heading = `h${headingLevel}` as 'h2' | 'h3' | 'h4';

  return (
    <AccordionPrimitive.Header asChild>
      <Heading className="m-0 flex">
        <AccordionPrimitive.Trigger
          data-slot="accordion-trigger"
          className={cn(
            'group/accordion-trigger',
            'flex min-h-11 flex-1 cursor-pointer items-center justify-between gap-4',
            // See the docblock: every one of these four is load-bearing against
            // the consumer's bare-`button` rule in the components layer.
            'rounded-none border-0 bg-transparent px-5 py-4',
            'text-start text-[15px] leading-snug font-semibold text-fg',
            'transition-colors duration-micro ease-out hover:bg-highlight',
            'outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40',
            'disabled:cursor-not-allowed disabled:opacity-50',
            'sm:px-6 sm:py-[1.15rem]',
            className,
          )}
          {...props}
        >
          {children}
          <ChevronDownIcon
            size={18}
            data-slot="accordion-chevron"
            className={cn(
              'shrink-0 text-muted-foreground',
              'transition-[transform,color] duration-micro ease-out',
              // `text-link` (--primary-text), not `text-primary`: --primary is
              // 3.90:1 on the cream page, which clears the 3:1 non-text bar only
              // just. --primary-text has headroom in both themes and is the same
              // hue family.
              'group-data-[state=open]/accordion-trigger:rotate-180',
              'group-data-[state=open]/accordion-trigger:text-link',
            )}
          />
        </AccordionPrimitive.Trigger>
      </Heading>
    </AccordionPrimitive.Header>
  );
}

/**
 * ## The one sanctioned height animation in the system
 *
 * `animate-accordion-down` / `animate-accordion-up` (from `tw-animate-css`, which
 * `@velobitsio/tokens/theme.css` already imports) interpolate `height` from `0` to
 * `var(--radix-accordion-content-height)`.
 *
 * Animating height is normally banned here because it invalidates layout on every
 * frame. This case is the exception because Radix **measures** the content once,
 * in a layout effect, and publishes the result as that CSS variable , so the
 * keyframes run between two known pixel values. The pathological version is
 * `height: auto` in a transition, which either does not animate at all or forces
 * the engine to re-resolve intrinsic size each frame; and `max-height: 9999px`,
 * which animates a wrong distance and so runs at the wrong speed for every
 * content length. Neither of those is what this is.
 *
 * `overflow-hidden` is what makes the clip work and must stay on this element.
 *
 * ## `className` lands on the inner body, not on the animated element
 *
 * Deliberate, and it matches shadcn's Accordion. The animated element's own
 * classes are load-bearing (`overflow-hidden` plus the two keyframe utilities),
 * and padding there would be height the `0` keyframe cannot remove , leaving a
 * collapsed panel roughly 32px tall. Putting the caller's classes on the body
 * makes the common case (`className="px-6 pb-6"`) correct instead of a bug.
 *
 * `max-w-[70ch]` caps the measure: a 90-character line of 13.5px muted text is
 * unreadable, and the FAQ container is as wide as the page's content grid.
 * Override it with `className="max-w-none"` , `cn` is twMerge-based, so it wins.
 */
function AccordionContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Content>) {
  return (
    <AccordionPrimitive.Content
      data-slot="accordion-content"
      className={cn(
        'overflow-hidden',
        'data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up',
      )}
      {...props}
    >
      <div
        data-slot="accordion-content-body"
        className={cn(
          'max-w-[70ch] px-5 pb-4 text-[13.5px] leading-relaxed text-muted-foreground sm:px-6 sm:pb-[1.15rem]',
          className,
        )}
      >
        {children}
      </div>
    </AccordionPrimitive.Content>
  );
}

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent };
