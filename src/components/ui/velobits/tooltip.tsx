'use client';

import { Tooltip as TooltipPrimitive } from 'radix-ui';

import { cn } from '@/lib/utils';

/**
 * ## `TooltipProvider` is not optional, and its absence is a runtime throw
 *
 * Radix's `Tooltip.Root` reads context from a `Tooltip.Provider` ancestor and
 * throws without one. Mount it ONCE per app, at the shell root ,
 * `VelobitsProvider` does this.
 *
 * ### Under Module Federation this becomes a singleton requirement
 *
 * If the shell and each remote load their own copy of `@velobitsio/ui`, the
 * shell's provider context never reaches a remote's tooltip, and the throw
 * appears only when someone hovers a control inside a remote. So
 * `@velobitsio/ui`, `@velobitsio/icons` and `framer-motion` must all be in the
 * `shared` map of all three of the editor app's vite configs with
 * `singleton: true` and a pinned `requiredVersion`.
 *
 * Bump the pin and the package version in lockstep: exceeding the pin produces
 * `does not satisfy` console warnings and then a fatal
 * `does not provide an export named 'default'` , a blank page.
 *
 * ## A tooltip is never the only source of information
 *
 * It does not appear on touch, and it does not appear on keyboard focus in every
 * browser. Anything essential belongs in visible text or an `aria-label`.
 */
function TooltipProvider({
  delayDuration = 300,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Provider>) {
  return (
    <TooltipPrimitive.Provider
      data-slot="tooltip-provider"
      delayDuration={delayDuration}
      {...props}
    />
  );
}

function Tooltip({ ...props }: React.ComponentProps<typeof TooltipPrimitive.Root>) {
  return <TooltipPrimitive.Root data-slot="tooltip" {...props} />;
}

function TooltipTrigger({ ...props }: React.ComponentProps<typeof TooltipPrimitive.Trigger>) {
  return <TooltipPrimitive.Trigger data-slot="tooltip-trigger" {...props} />;
}

function TooltipContent({
  className,
  sideOffset = 6,
  children,
  ...props
}: React.ComponentProps<typeof TooltipPrimitive.Content>) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Content
        data-slot="tooltip-content"
        sideOffset={sideOffset}
        className={cn(
          // Opaque, not glass: a tooltip is small and text-dense, and a blur
          // behind 12px type is where glass stops being legible. The glass tier
          // starts at Dialog/Popover size.
          'z-tooltip w-fit max-w-xs rounded-md bg-elevated px-2 py-1 text-xs text-fg',
          'border border-border shadow-md',
          'animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0',
          'data-[side=bottom]:slide-in-from-top-1 data-[side=top]:slide-in-from-bottom-1',
          'data-[side=left]:slide-in-from-right-1 data-[side=right]:slide-in-from-left-1',
          className,
        )}
        {...props}
      >
        {children}
      </TooltipPrimitive.Content>
    </TooltipPrimitive.Portal>
  );
}

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };
