import { clsx, type ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

/**
 * tailwind-merge only knows how to resolve a conflict between classes it
 * recognises. Our `@theme` adds scale values it has never heard of, and for
 * those it silently keeps BOTH classes , after which the winner is decided by
 * the order rules happen to appear in the generated stylesheet, not by the order
 * you passed them. `<Button className="rounded-pill">` kept `rounded-md` too and
 * came out a rounded rectangle about half the time.
 *
 * Registering the custom values is what makes `cn` actually override. Only
 * genuinely custom scales need listing , custom *colours* (`bg-panel`,
 * `text-link`) already work, because tailwind-merge treats the colour position
 * in `bg-*` / `text-*` as free-form.
 */
/*
 * The generic parameter is not optional decoration: `extend.classGroups` is typed
 * as `Partial<Record<DefaultClassGroupIds, …>>`, so a brand-new group id is a type
 * error until it is declared here. Registering a NEW group (as opposed to extending
 * one of Tailwind's own, like `rounded`) is what this argument is for.
 */
const twMerge = extendTailwindMerge<'control-material'>({
  extend: {
    classGroups: {
      // --radius-pill, which is not one of Tailwind's built-in radius steps.
      rounded: [{ rounded: ['pill'] }],
      // The z-index ladder, added as @utility rules rather than theme values.
      z: [
        {
          z: [
            'base',
            'raised',
            'sticky',
            'dropdown',
            'overlay',
            'modal',
            'popover',
            'toast',
            'tooltip',
          ],
        },
      ],
      // Named durations, likewise @utility rules.
      duration: [{ duration: ['micro', 'enter', 'overlay', 'page'] }],
      /*
       * The control material (`controls.css`). Both classes set `box-shadow`, so
       * they conflict with each other AND with Tailwind's own `shadow-*` , and
       * tailwind-merge cannot know that, because they are component classes rather
       * than utilities with a recognisable prefix.
       *
       * Without this group, `cn('control-recessed', 'control-raised')` keeps BOTH
       * and the winner is whichever `controls.css` happens to declare last , i.e.
       * always `control-recessed`, regardless of what the caller asked for. Same
       * failure that made `rounded-pill` come out a rectangle half the time.
       */
      'control-material': ['control-raised', 'control-recessed'],
    },
    conflictingClassGroups: {
      // Declared in BOTH directions so plain last-one-wins holds: a `shadow-*`
      // utility at a call site clears the material, and applying the material
      // clears an inherited `shadow-*`. One direction alone silently keeps two
      // box-shadow declarations alive.
      'control-material': ['shadow'],
      shadow: ['control-material'],
    },
  },
});

/**
 * Merge class names, Tailwind-aware: later utilities win over earlier
 * conflicting ones.
 *
 * The signature is `twMerge(clsx(...))` and must stay that way. The dashboard
 * app's `components.json` points `utils` at `@/ui/cn`, so anything
 * `npx shadcn add` generates in that app calls exactly this function , changing
 * the shape here breaks every vendored primitive there at once.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
