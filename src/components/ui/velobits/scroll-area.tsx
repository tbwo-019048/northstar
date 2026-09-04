'use client';

import { useEffect, useState } from 'react';
import { ScrollArea as ScrollAreaPrimitive } from 'radix-ui';

import { cn } from '@/lib/utils';

/**
 * A scrollable region with a scrollbar we control the look of.
 *
 * ## Why the thumb is `bg-field-border` and not `bg-border`
 *
 * The palette carries two line tokens and the split is a WCAG one, the same
 * distinction `Separator` documents from the other side. A separator divides
 * nothing a reader must perceive, so 1.4.11 does not apply and it recedes on
 * `--border`. A scrollbar is the opposite case: it is an interactive control that
 * reports position and accepts a drag, so it has to clear 3:1 against whatever it
 * sits on.
 *
 * `--field-border` is the token that does, and it is asserted to in both themes
 * from a SINGLE value, against both `--bg` and `--panel`
 * (`packages/tokens/test/contrast.test.ts`). So one thumb colour is correct on the
 * page and inside a panel, in light and dark, without a variant.
 *
 * The track stays transparent. It is decoration, it would be the widest block of
 * flat colour on any long page, and giving it a fill is what makes a custom
 * scrollbar read as a browser from 2009.
 *
 * ## The native scrollbar is not merely hidden
 *
 * Radix moves the overflow onto an inner viewport, so `className` on the Root is
 * layout for the BOX and the scrolling happens a level in. Two consequences worth
 * knowing before reaching for this:
 *
 *   - The Root needs a bounded height from somewhere (`h-*`, a grid track, a
 *     flex parent). Given none it grows to fit its content and never scrolls,
 *     which looks like the component silently not working.
 *   - `overflow-y-auto` on the same element is redundant at best. Use one or the
 *     other.
 *
 * ## When NOT to reach for this
 *
 * A region whose content might FIT. Radix turns the viewport into a scroll
 * container the moment a scrollbar renders, and does it unconditionally:
 *
 *     overflowY: scrollbarYEnabled ? 'scroll' : 'hidden'
 *
 * where `scrollbarYEnabled` is flipped by an effect in `ScrollAreaScrollbar` on
 * mount. Not `auto`, and not gated on overflow. `type="auto"` does not change
 * this either; it governs when the BAR is visible, not the viewport overflow,
 * and no prop exposes the difference.
 *
 * So a short list inside one is a scroll container with nothing to scroll: the
 * wheel is captured, the page does not move, and it lurches once the chain
 * finally reaches the document. That is why the docs sidebar and the "On this
 * page" columns use plain `overflow-y-auto` and not this component, despite this
 * component existing for exactly that shape of problem. `auto` becomes a
 * scroller only when it needs to be; a design-system scrollbar is not worth a
 * dead scroll zone on every short page.
 *
 * Use it for a box that always overflows and owns its height: a fixed-height
 * list, a capped code panel, a picker.
 *
 * Keyboard scrolling, wheel, touch and the scroll-anchoring browsers do are all
 * preserved, because the viewport is a real scroll container. What is lost is the
 * OS scrollbar's own affordances, which is the trade being made deliberately.
 *
 * ## Two behaviours this owns rather than inherits
 *
 * Both are the reason this file is longer than a wrapper around a primitive has
 * any right to be, and the full account is on each hook.
 *
 *   - `useThumbPosition` , Radix's own thumb positioning does not survive
 *     minification, because SWC deletes the loop that does it.
 *   - `useScrollContainment` , a region that has run out of room does not hand
 *     the rest of the gesture to the page. Applied only while the region actually
 *     overflows, and only on the axis that scrolls.
 */
function ScrollArea({
  className,
  children,
  axis = 'y',
  type = 'auto',
  ...props
}: React.ComponentProps<typeof ScrollAreaPrimitive.Root> & {
  /**
   * Which axes scroll. Defaults to vertical.
   *
   * A prop rather than something the caller composes, because a scrollbar has to
   * be a SIBLING of the viewport while `children` go inside it. Passing
   * `<ScrollBar orientation="horizontal" />` as a child puts the bar in the
   * scrolling content, where it slides away with the very thing it is measuring.
   * It looks stuck because it is being scrolled.
   *
   * It also decides which axes scroll AT ALL: Radix enables the viewport overflow
   * per axis from whether a scrollbar for that axis is mounted, so the default
   * leaves `overflow-x: hidden` rather than allowing silent sideways drift.
   */
  axis?: 'y' | 'x' | 'both';
}) {
  const showY = axis !== 'x';
  const showX = axis !== 'y';

  return (
    <ScrollAreaPrimitive.Root
      data-slot="scroll-area"
      type={type}
      className={cn('relative', className)}
      {...props}
    >
      <ScrollAreaPrimitive.Viewport
        data-slot="scroll-area-viewport"
        /*
         * `focus-visible` on the viewport, not the Root: the viewport is what
         * takes focus when the region is keyboard-scrollable, and a ring drawn on
         * the Root would sit outside the clip and half-overlap the scrollbar.
         */
        className="size-full rounded-[inherit] outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
      >
        {children}
      </ScrollAreaPrimitive.Viewport>
      {showY && <ScrollBar orientation="vertical" />}
      {showX && <ScrollBar orientation="horizontal" />}
      {showY && showX && <ScrollAreaPrimitive.Corner />}
    </ScrollAreaPrimitive.Root>
  );
}
/**
 * Rendered by `ScrollArea` from its `axis` prop. Exported for the case where the
 * primitive is composed by hand, which is the only way to put a bar anywhere other
 * than where `ScrollArea` puts it.
 *
 * Do NOT pass it as a child of `ScrollArea`: children render inside the viewport,
 * so the bar would scroll along with the content it is measuring.
 */
function ScrollBar({
  className,
  orientation = 'vertical',
  ...props
}: React.ComponentProps<typeof ScrollAreaPrimitive.Scrollbar>) {
  /*
   * State, not a ref: the thumb is mounted and unmounted by Radix's `Presence`
   * as the region becomes scrollable, and `useThumbPosition` has to re-run when
   * that happens. A `useRef` would be silently null on the render where the
   * thumb first appears, and nothing would ever re-trigger the effect.
   */
  const [thumb, setThumb] = useState<HTMLDivElement | null>(null);

  useThumbPosition(thumb, orientation);
  useScrollContainment(thumb, orientation);

  return (
    <ScrollAreaPrimitive.Scrollbar
      data-slot="scroll-area-scrollbar"
      orientation={orientation}
      className={cn(
        'flex touch-none select-none transition-colors duration-micro ease-out',
        orientation === 'vertical' && 'h-full w-2.5 border-s border-s-transparent p-px',
        orientation === 'horizontal' && 'h-2.5 flex-col border-t border-t-transparent p-px',
        className,
      )}
      {...props}
    >
      <ScrollAreaPrimitive.Thumb
        ref={setThumb}
        data-slot="scroll-area-thumb"
        className="relative flex-1 rounded-pill bg-field-border"
      />
    </ScrollAreaPrimitive.Scrollbar>
  );
}

/**
 * Drives `thumb.style.transform` from the viewport's scroll offset.
 *
 * ## Why this exists at all, when Radix already does it
 *
 * Radix positions the thumb from a `requestAnimationFrame` polling loop in its
 * `addUnlinkedScrollListener`, and **the loop does not survive minification.**
 * Its source wraps the loop in an IIFE that carries esbuild's `keepNames`
 * annotation:
 *
 *     ( /* @__PURE__ *\/ __name((function loop() { … }), 'loop') )();
 *
 * SWC binds that `@__PURE__` to the OUTER call, whose result is unused, and
 * drops the invocation. What ships is:
 *
 *     addUnlinkedScrollListener = (e, t) =>
 *       (e.scrollLeft, e.scrollTop, () => window.cancelAnimationFrame(0))
 *
 * , two dead property reads and a cancel of frame handle 0. Verified against
 * Next 16's own SWC minifier: the loop vanishes with the comment and survives
 * without it, so this is not specific to our build.
 *
 * The symptom is not a dead thumb, which is why it is easy to miss. Radix also
 * repositions once per `scroll` event, but only while its listener ref is empty,
 * and a 100ms debounce is what empties it. So the thumb moves once, ~100ms after
 * you STOP scrolling, showing where you used to be. It reads as severe lag
 * rather than as a broken component, and dragging the thumb leaves it behind
 * the pointer. Measured on the docs page before this hook existed: 274px of
 * scroll, thumb travelled 7.5px of the 127.7px it owed.
 *
 * It reproduces in every consumer, not just here: `radix-ui` is a peer
 * dependency, so it is minified in the CONSUMING app's build. Nothing this repo
 * can do to its own `node_modules` fixes anyone who installs `@velobitsio/ui`
 * from npm. The fix has to be in the component.
 *
 * ## Why a `scroll` listener rather than restoring the loop
 *
 * A poll that runs every frame for as long as the component is mounted is the
 * wrong shape for this even when it works. Every path that moves the viewport ,
 * wheel, touch, keyboard, a thumb drag, `scrollTo` , ends in a `scroll` event,
 * so an event listener is strictly more targeted and cannot go stale. It is
 * `passive` because this handler never calls `preventDefault`, and a
 * non-passive listener on a scroller is how you turn a composited scroll into a
 * main-thread one.
 *
 * In an UNMINIFIED build both writers run. They read the same offsets and
 * compute the same number, so they agree; there is no flicker and no contest.
 *
 * ## Reading the layout without reaching into Radix internals
 *
 * Three inputs, all from the DOM rather than from Radix's `sizes` state:
 *
 *   - the thumb's length, from `--radix-scroll-area-thumb-{width,height}`, which
 *     Radix sets inline on the scrollbar and documents as its styling API. Read
 *     off `style` rather than `getComputedStyle` because that is where it is set
 *     and it costs nothing.
 *   - the track, from the scrollbar's CONTENT box. `clientWidth`/`clientHeight`
 *     include padding, and the bars above carry `p-px`, so the padding has to
 *     come back out or the thumb overshoots by a pixel at the far end.
 *   - the scroll range, from the viewport.
 *
 * `data-radix-scroll-area-viewport` is Radix's own attribute and it ships a
 * stylesheet keyed on it, so it is as stable a hook as the component has. The
 * `:scope >` matters: a nested ScrollArea would otherwise hand a bar the wrong
 * viewport.
 *
 * ## RTL
 *
 * `scrollLeft` is negative in RTL, running 0 → -max as you scroll towards the
 * end, while the thumb still translates in physical pixels, 0 at the LEFT of the
 * track. So RTL maps [-max, 0] → [0, maxThumbPos] , the start of the content is
 * the thumb's rightmost position. Direction comes from computed style rather
 * than from Radix's `dir` context, because the transform is physical and CSS
 * `direction` is what actually decided the layout.
 */
function useThumbPosition(thumb: HTMLDivElement | null, orientation: 'vertical' | 'horizontal') {
  useEffect(() => {
    if (!thumb) return;
    const parts = scrollParts(thumb);
    if (!parts) return;
    const { bar, viewport } = parts;

    const vertical = orientation === 'vertical';
    const sizeVar = vertical
      ? '--radix-scroll-area-thumb-height'
      : '--radix-scroll-area-thumb-width';

    /* An arrow declared after the guards above, so their narrowing holds inside it. */
    const position = () => {
      /*
       * Inline first: this is the element Radix sets the variable on, so the
       * cascade has nothing to contribute and the read is free. Computed style
       * is the fallback for a hand-composed bar that sets it from a stylesheet.
       */
      const styles = getComputedStyle(bar);
      const thumbSize = parseFloat(
        bar.style.getPropertyValue(sizeVar) || styles.getPropertyValue(sizeVar),
      );
      if (!Number.isFinite(thumbSize)) return;

      const padding = vertical
        ? parseFloat(styles.paddingTop) + parseFloat(styles.paddingBottom)
        : parseFloat(styles.paddingLeft) + parseFloat(styles.paddingRight);
      const track = (vertical ? bar.clientHeight : bar.clientWidth) - (padding || 0);
      const maxThumbPos = Math.max(track - thumbSize, 0);

      const maxScroll = vertical
        ? viewport.scrollHeight - viewport.clientHeight
        : viewport.scrollWidth - viewport.clientWidth;
      const pos = vertical ? viewport.scrollTop : viewport.scrollLeft;

      /* RTL runs [-max, 0], LTR runs [0, max]. Both land in [0, 1]. */
      const progress =
        maxScroll <= 0
          ? 0
          : !vertical && styles.direction === 'rtl'
            ? (clamp(pos, -maxScroll, 0) + maxScroll) / maxScroll
            : clamp(pos, 0, maxScroll) / maxScroll;

      const offset = progress * maxThumbPos;
      thumb.style.transform = vertical
        ? `translate3d(0, ${offset}px, 0)`
        : `translate3d(${offset}px, 0, 0)`;
    };

    /*
     * Once on mount, for the region that arrives already scrolled , a restored
     * scroll position or an anchor jump fires no `scroll` event, and without
     * this the thumb sits at zero over content that does not.
     */
    position();
    viewport.addEventListener('scroll', position, { passive: true });
    return () => viewport.removeEventListener('scroll', position);
  }, [thumb, orientation]);
}

/**
 * Stops a scroll that has run out of room from turning into a page scroll.
 *
 * ## The complaint this answers
 *
 * Scroll a bounded region, reach its end, and the page starts moving under you ,
 * "it scrolls the whole page instead of the example". It is worst on a SHORT
 * region, because the range is what decides how quickly you get there: the docs
 * demo has 274px of it, which is three notches of a typical mouse wheel. Three
 * notches in, every further notch is the page.
 *
 * That much is not Radix and not this component. A plain `overflow-y-auto` box
 * of the same range does exactly the same thing, measured notch for notch , it is
 * `overscroll-behavior: auto`, the default, doing what it says. It is a bad
 * default for THIS component specifically, because the whole premise (see the
 * docblock at the top) is a box that owns its height and always overflows: a
 * fixed-height list, a capped code panel, a picker. In all three, a page that
 * lurches when the list ends is a bug rather than a courtesy.
 *
 * ## Why it is applied here and not as a class on the viewport
 *
 * Because `contain` is only right while there is something to contain.
 *
 * Radix makes the viewport `overflow: scroll` unconditionally, so a region whose
 * content FITS is still a scroll container , with nothing to scroll. Measured on
 * such a region, wheeling over it: `auto` lets the page through, `contain`
 * swallows it completely and the page cannot be scrolled from that spot at all.
 * A static class would upgrade the dead scroll zone the top docblock warns about
 * into a permanent one.
 *
 * The thumb is the signal that resolves it. Radix mounts one only when the
 * measured ratio is strictly between 0 and 1 , precisely "this region overflows"
 * , so an effect that runs off the thumb's existence is already conditional on
 * exactly the right thing, and it re-runs when content grows or shrinks past the
 * boundary. Hence an inline style rather than a class, and hence this living next
 * to `useThumbPosition` rather than on the Viewport.
 *
 * Only the axis that scrolls is contained. `overscroll-behavior` would otherwise
 * take the other axis with it, and on a touch device
 * `overscroll-behavior-x: contain` also suppresses the browser's back-swipe , a
 * navigation gesture, given up for an axis that was never scrolling.
 *
 * ## The scrollbar needs the same thing, and CSS cannot give it
 *
 * A wheel over the bar is the same complaint one element across, and it is worse:
 * it leaks a notch EARLIER, because Radix scrolls the viewport by hand there and
 * calls `preventDefault` only while STRICTLY inside the bounds , so the notch
 * that saturates the region scrolls the region AND the page.
 *
 * `overscroll-behavior` on the viewport cannot reach it. The bar is a SIBLING of
 * the viewport, not a descendant, so the viewport is not in the bar's scroll
 * chain at all; that chain runs bar → Root → … → document, and the Root is not a
 * scroll container. Making it one would clip the focus ring the Viewport draws
 * with `outline-offset`, which is the reason the ring is on the Viewport in the
 * first place.
 *
 * So the bar gets a listener that does nothing but `preventDefault`. Radix's own
 * handler still applies the delta to the viewport, and the browser still clamps
 * it; all this suppresses is the default action, which was only ever going to
 * scroll the page. Net effect: the page does not move while the pointer is on a
 * scrollbar, which is the same promise the contained viewport makes one element
 * over.
 *
 * ## What this does NOT fix
 *
 * Chrome latches a wheel gesture to whatever it started on. Begin a scroll on the
 * page, move the pointer over this region mid-gesture, and the page keeps
 * scrolling , by design, so a flick cannot change targets under you. It ends
 * shortly after the gesture does. No CSS or listener reaches it, and it is not
 * scroll chaining, which is what everything above is about.
 */
function useScrollContainment(
  thumb: HTMLDivElement | null,
  orientation: 'vertical' | 'horizontal',
) {
  useEffect(() => {
    if (!thumb) return;
    const parts = scrollParts(thumb);
    if (!parts) return;
    const { bar, viewport } = parts;

    /*
     * The previous value is restored rather than cleared. A caller may have set
     * it through `style` on a hand-composed Viewport, and clobbering that on
     * unmount would be a surprise sourced in a file they never opened.
     */
    const vertical = orientation === 'vertical';
    const previous = vertical
      ? viewport.style.overscrollBehaviorY
      : viewport.style.overscrollBehaviorX;

    if (vertical) viewport.style.overscrollBehaviorY = 'contain';
    else viewport.style.overscrollBehaviorX = 'contain';

    const swallow = (event: WheelEvent) => event.preventDefault();
    bar.addEventListener('wheel', swallow, { passive: false });

    return () => {
      if (vertical) viewport.style.overscrollBehaviorY = previous;
      else viewport.style.overscrollBehaviorX = previous;
      bar.removeEventListener('wheel', swallow);
    };
  }, [thumb, orientation]);
}

/**
 * The bar and the viewport it measures, found from the thumb Radix mounted.
 *
 * `closest` on OUR OWN `data-slot`, not `parentElement`. Radix composing an extra
 * wrapper around the thumb one day would leave a parent-hop pointing at the wrong
 * element and the thumb silently frozen , the exact class of failure
 * `useThumbPosition` exists to fix.
 *
 * `data-radix-scroll-area-viewport` is Radix's own attribute and it ships a
 * stylesheet keyed on it, so it is as stable a hook as the component has. The
 * `:scope >` matters: a nested ScrollArea would otherwise hand a bar the wrong
 * viewport. And the Viewport renders a `<style>` sibling, so this cannot be a
 * "first child" shortcut either.
 */
function scrollParts(thumb: HTMLDivElement) {
  const bar = thumb.closest<HTMLElement>('[data-slot="scroll-area-scrollbar"]');
  const viewport = bar?.parentElement?.querySelector<HTMLElement>(
    ':scope > [data-radix-scroll-area-viewport]',
  );
  return bar && viewport ? { bar, viewport } : null;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export { ScrollArea, ScrollBar };
