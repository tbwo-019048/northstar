'use client';

import * as React from 'react';
import { AnimatePresence, motion, type HTMLMotionProps, type Transition } from 'framer-motion';

import { cn } from '@/lib/utils';

/**
 * The motion layer , page transitions and list entrances.
 *
 * ## Why this exists, and why it is not in the barrel
 *
 * `framer-motion` has always been a **required** peer dependency of this package,
 * and until now it earned that for exactly one thing: the
 * `<MotionConfig reducedMotion="user">` inside `VelobitsProvider`. Every consumer
 * paid the install and got no primitives. This is the capacity we were already
 * buying, spent.
 *
 * It is a **subpath-only export** , `@velobitsio/ui/motion`, not the barrel ,
 * for the same reason `form` is: the barrel's own-code budget sits at 28.13 kB of
 * 32, and anything added there is paid for by every consumer whether they import
 * it or not. Pulling motion in through the barrel would also drag Framer's runtime
 * into apps that only wanted a `Button`.
 *
 * ```ts
 * import { PageTransition, Stagger, StaggerItem } from '@velobitsio/ui/motion';
 * ```
 *
 * ## Reduced motion is already handled , do not re-handle it here
 *
 * Two mechanisms cover it, and adding a third is how they get out of step:
 *
 *   1. `VelobitsProvider` mounts `<MotionConfig reducedMotion="user">`. Framer
 *      then drops transform and opacity animations for users who asked for less
 *      motion, **for every component in this file**, without any of them knowing.
 *   2. The token layer's `@media (prefers-reduced-motion: reduce)` block clamps
 *      CSS transition and animation durations globally.
 *
 * So nothing here checks `usePrefersReducedMotion()`. That hook is for the third
 * case only: imperative decisions Framer cannot see, like whether to autoplay.
 *
 * **These components assume `VelobitsProvider` is mounted.** Without it they still
 * animate , and they stop honouring the user's preference, silently. That is the
 * one failure mode worth knowing about.
 *
 * ## Everything animates transform and opacity, and nothing else
 *
 * Both are composited on the GPU: no layout, no paint, no main-thread work per
 * frame. `height`, `width`, `top` and `filter` are all deliberately absent ,
 * animating them on a list of forty rows is how a 60fps entrance becomes a
 * stutter. `glass.css` makes the same point about blur radius, for the same reason.
 */

/**
 * The system's motion curve and durations, as Framer transitions.
 *
 * Values come from the token layer (`--duration-*`, `--ease-out`) rather than being
 * invented here, so CSS transitions and Framer animations in the same view agree.
 * They are duplicated as numbers because Framer needs seconds and a cubic-bezier
 * array , a `var()` string is not something it can interpolate.
 *
 * `scales.test.ts` pins the CSS side; `motion.test.tsx` asserts these match it, so
 * the duplication cannot drift.
 */
export const TRANSITION = {
  /** 180ms , `--duration-enter`. List items, cards, anything entering in place. */
  enter: { duration: 0.18, ease: [0.32, 0.72, 0, 1] },
  /** 320ms , `--duration-page`. Route changes. */
  page: { duration: 0.32, ease: [0.32, 0.72, 0, 1] },
} as const satisfies Record<string, Transition>;

/**
 * How far an entering element travels, in pixels.
 *
 * Small on purpose. A large offset reads as a slide , content arriving from
 * somewhere else , while 8px reads as the thing settling into place, which is what
 * a page or a list row is actually doing. It also keeps the distance below the
 * threshold where motion-sensitive users notice displacement even at full opacity.
 */
const TRAVEL = 8;

export interface PageTransitionProps extends Omit<
  HTMLMotionProps<'div'>,
  'initial' | 'animate' | 'exit' | 'transition' | 'variants' | 'key'
> {
  /**
   * Changes to this value trigger the transition. Pass the route key ,
   * `useLocation().pathname` in React Router, `usePathname()` in Next.
   *
   * **Required, and it must actually change per route.** With a constant value the
   * component renders once and never animates again, which looks like the
   * transition being broken rather than the key being wrong.
   */
  transitionKey: string;
}

/**
 * A route-level fade-and-settle.
 *
 * ## `mode="wait"` is the load-bearing prop
 *
 * `AnimatePresence` defaults to overlapping exit and enter, which for a full page
 * means both routes are mounted and absolutely stacked for the duration. Two
 * problems, both of which show up as bugs rather than as bad animation: the old
 * page's focused element stays focusable while invisible, and any `position: fixed`
 * child of a glass surface in the outgoing tree is still painting.
 *
 * `mode="wait"` serialises them , out, then in. It costs the overlap, which at
 * 320ms nobody perceives as slower.
 *
 * Only opacity and a small Y offset move. A scale or a horizontal slide on a whole
 * page fights the sticky header, which is `position: sticky` inside the scroll
 * container and does not move with it.
 */
function PageTransition({ transitionKey, className, children, ...props }: PageTransitionProps) {
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={transitionKey}
        initial={{ opacity: 0, y: TRAVEL }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -TRAVEL / 2 }}
        transition={TRANSITION.page}
        className={cn(className)}
        {...props}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

export interface StaggerProps extends Omit<
  HTMLMotionProps<'div'>,
  'initial' | 'animate' | 'exit' | 'transition' | 'variants'
> {
  /**
   * Seconds between children. 0.04 is the default and roughly the useful ceiling:
   * at 0.08 a twelve-item list takes a second to finish arriving, which stops
   * reading as polish and starts reading as latency.
   */
  step?: number;
  /** Delay before the first child, in seconds. */
  delay?: number;
  /**
   * Narrowed back to plain `ReactNode` from Framer's own `children` type, which
   * also admits a `MotionValue`. This component walks its children with
   * `React.Children.map` to assign each item its index, and a MotionValue is not
   * something that can be walked , so the wider type is not merely unhelpful here,
   * it is unimplementable.
   */
  children?: React.ReactNode;
}

/**
 * The number of children that actually cascade. Everything past this arrives with
 * item {@link STAGGER_LIMIT}.
 *
 * A stagger scales linearly with list length, so an uncapped one takes
 * `step × n` seconds to finish , at 200 rows and the default step, eight seconds
 * of mostly-blank page. This is the exact shape of "the animation that looked
 * great on the design's six items".
 *
 * Not configurable, because there is no correct larger value: past roughly fifteen
 * items the cascade stops being perceived as sequential at all, so a bigger number
 * buys nothing but latency. If you are staggering hundreds of rows the real answer
 * is that a table should not stagger.
 */
export const STAGGER_LIMIT = 12;

/** Passes the parent's timing to items without prop-drilling through call sites. */
const StaggerContext = React.createContext<{ step: number; delay: number }>({
  step: 0.04,
  delay: 0,
});

/**
 * Staggers the entrance of its {@link StaggerItem} children.
 *
 * ## Why this does not use Framer's `staggerChildren`
 *
 * It is the obvious tool and it cannot be capped. `staggerChildren` multiplies by
 * each child's index internally, with no way to say "stop counting at twelve" ,
 * so the 200-row case above is unavoidable with it. Splitting the children into a
 * staggered group and a plain group would work, and would also put them under two
 * different parents, which silently breaks any `grid` or `flex` layout on this
 * element: the items would no longer be its direct descendants.
 *
 * So each item computes its own delay from its index, clamped. The parent's job is
 * only to broadcast `animate="shown"` (Framer propagates the label to any child
 * with `variants`) and to publish the timing on context.
 */
function Stagger({ step = 0.04, delay = 0, className, children, ...props }: StaggerProps) {
  // Memoised: this is a context value, and a fresh object every render would
  // re-render every item in the list , on a component whose entire purpose is
  // lists.
  const timing = React.useMemo(() => ({ step, delay }), [step, delay]);

  return (
    <StaggerContext.Provider value={timing}>
      <motion.div initial="hidden" animate="shown" className={cn(className)} {...props}>
        {/*
         * `React.Children.map` supplies the index, so a call site can write items
         * declaratively or from a `.map()` and get the same result. A StaggerItem
         * nested inside a Fragment or a wrapper div will not be found and simply
         * arrives with the first batch , degraded, not broken.
         */}
        {React.Children.map(children, (child, index) =>
          React.isValidElement<StaggerItemProps>(child) && child.type === StaggerItem
            ? React.cloneElement(child, { index })
            : child,
        )}
      </motion.div>
    </StaggerContext.Provider>
  );
}

export interface StaggerItemProps extends Omit<
  HTMLMotionProps<'div'>,
  'initial' | 'animate' | 'exit' | 'transition' | 'variants'
> {
  /**
   * Set by {@link Stagger} via `React.Children.map`. Passing it by hand is
   * supported , useful when items come from several sources and you want one
   * continuous cascade across them.
   */
  index?: number;
}

/** One staggered child. Must be a DIRECT child of {@link Stagger}. */
function StaggerItem({ index = 0, className, children, ...props }: StaggerItemProps) {
  const { step, delay } = React.useContext(StaggerContext);
  // The clamp is the cap: every item past STAGGER_LIMIT shares its slot, so a
  // 200-item list finishes in the same time a 12-item one does.
  const own = delay + Math.min(index, STAGGER_LIMIT) * step;

  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: TRAVEL },
        shown: { opacity: 1, y: 0, transition: { ...TRANSITION.enter, delay: own } },
      }}
      className={cn(className)}
      {...props}
    >
      {children}
    </motion.div>
  );
}

export interface FadeInProps extends Omit<
  HTMLMotionProps<'div'>,
  'initial' | 'animate' | 'exit' | 'transition' | 'variants'
> {
  /** Seconds to wait before starting. */
  delay?: number;
}

/**
 * A single element's entrance, for the cases that are not a route or a list ,
 * an expanding detail panel, a result that arrives after a fetch.
 *
 * Deliberately has no exit animation. An element that fades OUT on unmount has to
 * stay mounted while it does, which means a parent `AnimatePresence` and a stable
 * key; without both, React unmounts it immediately and the exit silently never
 * runs. {@link PageTransition} is the component that owns that complexity.
 */
function FadeIn({ delay = 0, className, children, ...props }: FadeInProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: TRAVEL }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...TRANSITION.enter, delay }}
      className={cn(className)}
      {...props}
    >
      {children}
    </motion.div>
  );
}

export { FadeIn, PageTransition, Stagger, StaggerItem };
