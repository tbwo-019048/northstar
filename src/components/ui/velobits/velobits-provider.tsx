'use client';

import { MotionConfig } from 'framer-motion';

import { ThemeProvider, type ThemeProviderProps } from './use-theme';
import { TooltipProvider } from './tooltip';

export interface VelobitsProviderProps extends ThemeProviderProps {
  /** Passed through to Radix's tooltip provider. */
  tooltipDelayDuration?: number;
}

/**
 * Mount ONCE at the app shell root. It composes the three things that must exist
 * exactly once per application:
 *
 *  1. `ThemeProvider` , resolves and applies light/dark.
 *  2. `TooltipProvider` , Radix's `Tooltip.Root` THROWS without an ancestor
 *     provider, and a missing one only surfaces when someone hovers a control.
 *  3. `MotionConfig reducedMotion="user"` , makes every Framer animation in the
 *     tree honour the OS preference. CSS-driven motion is already handled by the
 *     `prefers-reduced-motion` block in the token layer, so between the two
 *     there is no path that ignores the setting.
 *
 * ## Module Federation
 *
 * Under the editor app's federated setup this provider lives in the shell, and
 * its context has to cross into `editor-remote` and `analytics-remote`. That only
 * works if `@velobitsio/ui`, `@velobitsio/icons` and `framer-motion` are declared
 * `singleton: true` with a pinned `requiredVersion` in ALL THREE vite configs.
 * Otherwise each remote instantiates its own copy of this module, the shell's
 * context is invisible to it, and tooltips inside remotes throw.
 *
 * Bump the pin and the version together: overshooting the pin gives
 * `does not satisfy` warnings, then a fatal
 * `does not provide an export named 'default'` and a blank page. Restart the dev
 * containers and recreate the router afterwards.
 */
export function VelobitsProvider({
  children,
  tooltipDelayDuration,
  ...themeProps
}: VelobitsProviderProps) {
  return (
    <ThemeProvider {...themeProps}>
      {/* "user" defers to the OS rather than forcing a choice , `reducedMotion="always"`
          would disable motion for everyone, which is not what the setting means. */}
      <MotionConfig reducedMotion="user">
        <TooltipProvider delayDuration={tooltipDelayDuration}>{children}</TooltipProvider>
      </MotionConfig>
    </ThemeProvider>
  );
}
