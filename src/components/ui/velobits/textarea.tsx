'use client';

import { cn } from '@/lib/utils';

/**
 * `field-sizing-content` lets the box grow with its content without a resize
 * observer, which is what the editor surfaces used to hand-roll. `min-h-16`
 * keeps it usable before the first keystroke, since a content-sized empty
 * textarea collapses to one line.
 *
 * ## Opaque `--panel`, deliberately, while Card and Alert are Tier-S glass
 *
 * Same call as `Input`, which documents the reasoning in full: a glass control
 * inside a glass Card composites 2/255 off it and loses its well (the opaque fill
 * sits 10/255 clear in light, 9/255 in dark), and `--field-border`'s WCAG 1.4.11
 * margin stops being one gateable number per surface and becomes a function of
 * the ancestor chain. A Textarea adds the sharpest version of the affordance
 * argument: it is the largest editable region in the system, so it is where a
 * translucent fill would put the most page content behind the most user-typed
 * text.
 */
function Textarea({ className, ...props }: React.ComponentProps<'textarea'>) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        'flex field-sizing-content min-h-16 w-full rounded-md border border-input bg-panel px-3 py-2 text-sm text-fg control-recessed',
        'transition-[color,box-shadow] duration-micro ease-out',
        'placeholder:text-muted-foreground',
        'outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40',
        'disabled:cursor-not-allowed disabled:opacity-50',
        'aria-invalid:border-danger aria-invalid:ring-danger/30',
        className,
      )}
      {...props}
    />
  );
}

export { Textarea };
