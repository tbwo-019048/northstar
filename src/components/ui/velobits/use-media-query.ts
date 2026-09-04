'use client';

import { useEffect, useState } from 'react';

/**
 * Subscribe to a media query.
 *
 * ## Keep the breakpoint in ONE place
 *
 * The editor app learned this constraint the hard way: its
 * `useMediaQuery('(max-width: 768px)')` and the matching `editor.css` media
 * query must agree, or the two-surface mobile IA desynchronises mid-resize ,
 * JavaScript switches surfaces at one width while CSS switches layout at
 * another. Import the breakpoint from `@velobitsio/tokens` (`breakpoint.md`)
 * rather than typing the number twice.
 *
 * Returns `false` during SSR and on the first client render, then corrects
 * itself. That is the right default for mobile-first markup: the desktop branch
 * renders first and narrows, rather than flashing a mobile layout on desktop.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia(query);
    setMatches(mql.matches);
    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
    mql.addEventListener('change', handler);
    return () => mql.removeEventListener('change', handler);
  }, [query]);

  return matches;
}

/**
 * `true` when the user has asked for less motion.
 *
 * Framer is handled by one `<MotionConfig reducedMotion="user">` per app shell
 * and CSS by a `prefers-reduced-motion` block in the token layer; this hook is
 * for the third case , imperative animation, autoplay, and anything that has to
 * *decide* rather than merely animate more slowly.
 */
export function usePrefersReducedMotion(): boolean {
  return useMediaQuery('(prefers-reduced-motion: reduce)');
}
