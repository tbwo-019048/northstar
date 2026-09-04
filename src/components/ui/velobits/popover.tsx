'use client';

import { createContext, useContext, useEffect, useId, useMemo, useState } from 'react';
import { Popover as PopoverPrimitive } from 'radix-ui';

import { cn } from '@/lib/utils';

/**
 * Anchored, non-modal glass panel , a filter form, a rollout summary, a
 * "why is this flag on?" explainer. Use `Tooltip` for a label and `Dialog` for
 * anything that must be dismissed deliberately.
 *
 * ## The elevated glass tier, and this is its documented case
 *
 * `.glass-elevated` exists for glass stacked on glass: a Popover opened from
 * inside a Dialog. Plain overlay glass over overlay glass compounds to a milky
 * panel with no readable edge between the two layers, and in dark mode a
 * chromatic tint at the base alpha drifts visibly green over the lime brand
 * fill , hence the plum-tinted, higher-alpha step.
 *
 * ## Which is also why the Portal is not optional
 *
 * `backdrop-filter` forms a stacking context, so `z-index` inside a glass
 * surface is scoped to it , a popover rendered *within* `DialogContent` could
 * never rise above the dialog, whatever `z-popover` said. It also establishes a
 * containing block for `position: fixed` descendants, so a popover positioned by
 * Radix's popper inside a glass ancestor would be trapped in that panel's box
 * and clipped by it. `PopoverContent` therefore portals to the body, where
 * `z-popover` (1300) genuinely sits above `z-modal` (1200).
 *
 * ## Not a modal, and that is the point
 *
 * Radix Popover does not trap focus or lock scroll by default. That is correct
 * for a panel anchored to a control the user is still working with; if the
 * content demands a decision before anything else can happen, it is a `Dialog`.
 */
function Popover({ ...props }: React.ComponentProps<typeof PopoverPrimitive.Root>) {
  return <PopoverPrimitive.Root data-slot="popover" {...props} />;
}

function PopoverTrigger({ ...props }: React.ComponentProps<typeof PopoverPrimitive.Trigger>) {
  return <PopoverPrimitive.Trigger data-slot="popover-trigger" {...props} />;
}

/**
 * Anchor the popper to something other than the trigger , a table row while the
 * kebab button in it stays the trigger.
 */
function PopoverAnchor({ ...props }: React.ComponentProps<typeof PopoverPrimitive.Anchor>) {
  return <PopoverPrimitive.Anchor data-slot="popover-anchor" {...props} />;
}

/**
 * Lets `PopoverTitle` name the panel without the caller wiring ids by hand.
 *
 * Radix gives `PopoverPrimitive.Content` `role="dialog"` , and unlike its Dialog,
 * Radix Popover has no `Title` part, so it never sets `aria-labelledby`. The
 * result is a dialog announced as just "dialog", with the heading only reachable
 * once the user is already inside it. axe catches it as `aria-dialog-name`;
 * the dashboard app's copy has been shipping it.
 *
 * The title REGISTERS the id it actually rendered, rather than the content
 * unconditionally pointing at a generated one. Two reasons: a popover with no
 * `PopoverTitle` is legitimate (a bare form), and `aria-labelledby` pointing at an
 * id that never renders is a *worse* defect than no name at all , the accessible
 * name silently resolves to the empty string. Registering also means a caller's
 * own `id` on the title stays the one referenced.
 */
const PopoverTitleContext = createContext<{
  titleId: string;
  setLabelId: (id: string | null) => void;
} | null>(null);

function PopoverContent({
  className,
  align = 'center',
  sideOffset = 4,
  'aria-labelledby': ariaLabelledby,
  ...props
}: React.ComponentProps<typeof PopoverPrimitive.Content>) {
  const titleId = useId();
  const [labelId, setLabelId] = useState<string | null>(null);
  const titleContext = useMemo(() => ({ titleId, setLabelId }), [titleId]);

  return (
    /*
     * The provider sits OUTSIDE the Portal on purpose. React context travels the
     * React tree rather than the DOM tree, so it still reaches the portalled
     * title , and Radix's `PopoverPortal` renders `PortalPrimitive asChild`, which
     * is a `Slot` and needs a single DOM element child. A provider in that
     * position breaks it. Keeping `children` in `...props` also leaves `asChild`
     * on the content working.
     */
    <PopoverTitleContext.Provider value={titleContext}>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          data-slot="popover-content"
          align={align}
          sideOffset={sideOffset}
          // A caller's own label always wins; `aria-label` beats `aria-labelledby`
          // on the same element anyway, so both escape hatches keep working.
          aria-labelledby={ariaLabelledby ?? labelId ?? undefined}
          className={cn(
            // Tier O, elevated. `.glass` + `.glass-elevated` carry the background,
            // border and shadow from Tailwind's `components` layer, so ANY `bg-*`
            // utility added here or by a caller replaces the glass background
            // outright. There is deliberately no `bg-popover` in this list.
            'glass glass-elevated',
            'z-popover w-72 rounded-lg p-4 text-fg',
            // Radix computes this from the resolved side and align, including after
            // a collision flip, so the zoom grows out of the trigger rather than
            // the panel's geometric centre.
            'origin-(--radix-popover-content-transform-origin)',
            /*
             * Opacity, scale and a 2px slide , never the blur radius, which
             * repaints the whole backdrop every frame.
             *
             * `duration-enter` (180ms), not the 240ms overlay step: a popover
             * travels a few pixels from a control the user is already looking at,
             * and the longer curve reads as lag. It is applied through
             * `animation-duration-(--duration-enter)` because `animate-in` expands
             * to the `animation` SHORTHAND , behind a `data-[state=…]` variant it
             * outranks a bare `animation-duration` longhand on both order and
             * specificity, so the `duration-enter` utility would be dropped
             * silently.
             */
            'animation-duration-(--duration-enter)',
            'data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95',
            'data-[state=open]:ease-out',
            'data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95',
            'data-[state=closed]:ease-in',
            /*
             * Physical, and correctly so , unlike `SidePanel`'s logical
             * `slide-in-from-end`. `data-side` is the placement Radix's popper
             * RESOLVED, already flipped for collisions and for `dir`, so the slide
             * has to match that physical side rather than the writing direction.
             */
            'data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2',
            'data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2',
            className,
          )}
          {...props}
        />
      </PopoverPrimitive.Portal>
    </PopoverTitleContext.Provider>
  );
}

/**
 * The Header/Title/Description trio is hand-rolled div/h2/p rather than Radix
 * parts, because Radix Popover ships no `Title` or `Description` of its own. Kept
 * at the same names and `data-slot`s the dashboard app already uses so its call
 * sites migrate without edits , the only change in the rendered DOM is the `id`
 * the title now carries so it can name the panel.
 */
function PopoverHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="popover-header"
      className={cn('flex flex-col gap-1 text-sm', className)}
      {...props}
    />
  );
}

/**
 * A real `<h2>`, and the panel's accessible name.
 *
 * The dashboard app's copy typed its props as `'h2'` while rendering a `div` ,
 * the sort of drift nothing catches, because it looks identical and leaves the
 * heading out of a screen reader's heading list. Rendering the element the type
 * promised also makes it a legitimate `aria-labelledby` target, which is what
 * `PopoverContent` now points at.
 *
 * The weight is `font-medium` rather than a heading scale, so nothing moves
 * visually. Pass your own `id` and it is used instead of the generated one.
 */
function PopoverTitle({ className, id, ...props }: React.ComponentProps<'h2'>) {
  const context = useContext(PopoverTitleContext);
  const setLabelId = context?.setLabelId;
  const resolvedId = id ?? context?.titleId;

  useEffect(() => {
    if (!setLabelId || !resolvedId) return;
    setLabelId(resolvedId);
    return () => setLabelId(null);
  }, [setLabelId, resolvedId]);

  return (
    <h2
      data-slot="popover-title"
      id={resolvedId}
      className={cn('font-medium', className)}
      {...props}
    />
  );
}

/**
 * `text-muted-foreground` resolves to `--muted-on-glass` inside a glass surface ,
 * `.glass` rebinds `--muted-fg` for its descendants, because the plain muted grey
 * measures 3.09:1 over the worst-case backdrop while the on-glass step holds
 * 4.92:1. Doubly relevant here: this is the elevated tier, so the text is sitting
 * on glass over glass.
 */
function PopoverDescription({ className, ...props }: React.ComponentProps<'p'>) {
  return (
    <p
      data-slot="popover-description"
      className={cn('text-muted-foreground', className)}
      {...props}
    />
  );
}

export {
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverAnchor,
  PopoverHeader,
  PopoverTitle,
  PopoverDescription,
};
