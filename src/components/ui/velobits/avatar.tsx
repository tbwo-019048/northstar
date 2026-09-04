'use client';

import { Avatar as AvatarPrimitive } from 'radix-ui';

import { cn } from '@/lib/utils';

/**
 * Radix Avatar exists for one reason worth keeping: `AvatarImage` only reveals
 * itself once the image has actually loaded, and `AvatarFallback` shows until
 * then. A plain `<img onError>` flashes a broken-image glyph first.
 *
 * `AvatarFallback` accepts a `delayMs` to avoid a fallback flash on a fast
 * connection , worth setting when avatars appear in a list.
 */
function Avatar({ className, ...props }: React.ComponentProps<typeof AvatarPrimitive.Root>) {
  return (
    <AvatarPrimitive.Root
      data-slot="avatar"
      className={cn('relative flex size-8 shrink-0 overflow-hidden rounded-full', className)}
      {...props}
    />
  );
}

function AvatarImage({ className, ...props }: React.ComponentProps<typeof AvatarPrimitive.Image>) {
  return (
    <AvatarPrimitive.Image
      data-slot="avatar-image"
      className={cn('aspect-square size-full object-cover', className)}
      {...props}
    />
  );
}

/**
 * `bg-bg2` with `text-fg` rather than the brand fill: an avatar grid is one of
 * the few places many instances appear at once, and a wall of lime reads as an
 * error state. The brand belongs on the one element that matters, not on
 * fourteen.
 */
function AvatarFallback({
  className,
  ...props
}: React.ComponentProps<typeof AvatarPrimitive.Fallback>) {
  return (
    <AvatarPrimitive.Fallback
      data-slot="avatar-fallback"
      className={cn(
        'flex size-full items-center justify-center rounded-full bg-bg2 control-recessed text-xs font-medium text-fg',
        className,
      )}
      {...props}
    />
  );
}

export { Avatar, AvatarImage, AvatarFallback };
