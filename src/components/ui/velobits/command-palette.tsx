'use client';

import { useEffect, useRef } from 'react';
import { Command as CommandPrimitive } from 'cmdk';
import { Dialog as DialogPrimitive, VisuallyHidden } from 'radix-ui';

import { SearchIcon } from '@velobitsio/icons';

import { cn } from '@/lib/utils';

/**
 * The ⌘K palette: `cmdk` for the filtering and list semantics, Radix Dialog for
 * the modal layer.
 *
 * ```tsx
 * const [open, setOpen] = useState(false);
 *
 * <CommandDialog open={open} onOpenChange={setOpen} shortcut="k">
 *   <CommandInput placeholder="Search flags, environments, docs…" />
 *   <CommandList>
 *     <CommandEmpty>No results.</CommandEmpty>
 *     <CommandGroup heading="Flags">
 *       <CommandItem onSelect={() => go('/flags/new')}>
 *         New flag
 *         <CommandShortcut>⌘N</CommandShortcut>
 *       </CommandItem>
 *     </CommandGroup>
 *   </CommandList>
 * </CommandDialog>
 * ```
 *
 * ## Why a Dialog, and why this is the component a DropdownMenu could not be
 *
 * A palette is a filterable list with a text input in it, and that is precisely
 * what `DropdownMenu` cannot host: a menu manages focus for its items and
 * swallows keystrokes into typeahead, so an input inside one loses focus on the
 * first character. A Dialog CONTAINS focus rather than managing it, so the input
 * behaves like an input. See the refusals in `dropdown-menu.tsx` , this file is
 * the sanctioned alternative that note points at.
 *
 * ## The highlight attribute here is `data-[selected=true]`, not `data-highlighted`
 *
 * `cmdk` is not Radix Menu. It renders `role="option"` rows and marks the active
 * one with `data-selected` + `aria-selected`. The Radix `data-highlighted`
 * contract does NOT transfer , but the rule behind it does: never style the
 * active row with `:hover`, or arrow-key navigation becomes invisible.
 *
 * ## Composed on Radix's Dialog primitive directly, not on our `Dialog`
 *
 * A palette needs an unpadded, top-anchored content box and its own close
 * behaviour, so it would spend its life overriding `dialogContentVariants`.
 * Building on the primitive also keeps this file installable on its own , a CLI
 * consumer needs `cmdk` and `radix-ui`, not the whole Dialog component.
 *
 * ## `CommandPalette` used inline is NOT glass
 *
 * The glass tier is for surfaces that float over page content. Mounted inline
 * (an embedded search panel) this sits on a real panel and stays opaque; the
 * glass lives on `CommandDialog`'s content, which does float.
 */
function CommandPalette({ className, ...props }: React.ComponentProps<typeof CommandPrimitive>) {
  return (
    <CommandPrimitive
      data-slot="command-palette"
      className={cn('flex size-full flex-col overflow-hidden rounded-lg text-fg', className)}
      {...props}
    />
  );
}

/**
 * The wrapper carries the icon and the rule; the input itself is transparent and
 * borderless, because the palette's frame already is the field. `outline-none`
 * is safe here for the same reason it is on `NativeSelect`'s inner element ,
 * focus is unambiguous, there is exactly one input in the surface.
 */
function CommandInput({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Input>) {
  return (
    <div
      data-slot="command-input-wrapper"
      className="flex items-center gap-2 border-b border-border px-3"
    >
      <SearchIcon size={16} className="shrink-0 text-muted-foreground" />
      <CommandPrimitive.Input
        data-slot="command-input"
        className={cn(
          'flex h-11 w-full bg-transparent py-3 text-sm text-fg outline-none',
          'placeholder:text-muted-foreground',
          'disabled:cursor-not-allowed disabled:opacity-50',
          className,
        )}
        {...props}
      />
    </div>
  );
}

/**
 * `max-h-80` and not `max-h-(--cmdk-list-height)`: cmdk publishes the measured
 * height so a caller can ANIMATE the container, and animating a height on a
 * glass surface repaints the backdrop every frame. The list scrolls instead.
 */
function CommandList({ className, ...props }: React.ComponentProps<typeof CommandPrimitive.List>) {
  return (
    <CommandPrimitive.List
      data-slot="command-list"
      className={cn('max-h-80 scroll-py-1 overflow-x-hidden overflow-y-auto p-1', className)}
      {...props}
    />
  );
}

/**
 * cmdk renders this only when the filter matches nothing. It is a
 * `role="presentation"` node inside the listbox, so a screen reader learns about
 * the empty result from the combobox's own `aria-activedescendant` going away
 * rather than from an announcement , pass `aria-live="polite"` if the app wants
 * one.
 */
function CommandEmpty({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Empty>) {
  return (
    <CommandPrimitive.Empty
      data-slot="command-empty"
      className={cn('py-6 text-center text-sm text-muted-foreground', className)}
      {...props}
    />
  );
}

/**
 * The heading is styled through cmdk's `[cmdk-group-heading]` attribute rather
 * than a slot of ours, because cmdk owns that element , it generates it from the
 * `heading` prop and wires `aria-labelledby` to it.
 */
function CommandGroup({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Group>) {
  return (
    <CommandPrimitive.Group
      data-slot="command-group"
      className={cn(
        'overflow-hidden text-fg',
        '[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5',
        '[&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium',
        '[&_[cmdk-group-heading]]:text-muted-foreground',
        className,
      )}
      {...props}
    />
  );
}

/**
 * `data-[selected=true]`, never `hover:` , see the note in the file docblock.
 * cmdk moves the selection with the arrow keys without moving DOM focus (focus
 * stays in the input, which is what lets you keep typing), so a hover-only
 * highlight leaves keyboard users with no visible cursor at all.
 */
function CommandItem({ className, ...props }: React.ComponentProps<typeof CommandPrimitive.Item>) {
  return (
    <CommandPrimitive.Item
      data-slot="command-item"
      className={cn(
        'relative flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none',
        'select-none',
        'data-[selected=true]:bg-highlight data-[selected=true]:text-fg',
        'data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50',
        '[&>svg]:pointer-events-none [&>svg]:size-4 [&>svg]:shrink-0 [&>svg]:text-muted-foreground',
        'data-[selected=true]:[&>svg]:text-fg',
        className,
      )}
      {...props}
    />
  );
}

/**
 * `aria-hidden`, and it is not optional.
 *
 * cmdk hard-codes `role="separator"` AFTER its prop spread, so the role cannot
 * be overridden from here , and a `separator` is not a permitted child of a
 * `listbox`, which axe reports as `aria-required-children`. Hiding it from the
 * accessibility tree is the correct fix rather than a silencer: the groups are
 * already named by their headings, so the rule between them is purely visual.
 * This mirrors `Separator`, which is `role="none"` by default for the same
 * reason.
 */
function CommandSeparator({
  className,
  ...props
}: React.ComponentProps<typeof CommandPrimitive.Separator>) {
  return (
    <CommandPrimitive.Separator
      data-slot="command-separator"
      aria-hidden="true"
      className={cn('-mx-1 my-1 h-px bg-border', className)}
      {...props}
    />
  );
}

/**
 * Identical to `DropdownMenuShortcut`, and deliberately a separate component
 * rather than an import: it keeps `command-palette` installable without
 * `dropdown-menu`. `ms-auto` so the hint sits at the inline end in both
 * directions.
 */
function CommandShortcut({ className, ...props }: React.ComponentProps<'span'>) {
  return (
    <span
      data-slot="command-shortcut"
      className={cn('ms-auto font-mono text-xs tracking-widest text-muted-foreground', className)}
      {...props}
    />
  );
}

/**
 * The global shortcut, and it is OPT-IN.
 *
 * A design system that attaches a `document` keydown listener the moment a
 * component is imported is a design system that fights the host app: the editor
 * app already owns ⌘K, and a library that hijacks it silently is a bug report
 * nobody can locate. So the listener exists only while `shortcut` is a string.
 *
 * The callback and the current open state are read through refs, and the effect
 * depends ONLY on `key`. Depending on `onOpenChange` would tear down and
 * re-attach the listener on every render of any parent that passes an inline
 * arrow , which is every parent , and depending on `open` would do the same on
 * every toggle.
 */
function useGlobalShortcut(
  key: string | false | undefined,
  open: boolean | undefined,
  onOpenChange: ((open: boolean) => void) | undefined,
) {
  const openRef = useRef(open);
  const onOpenChangeRef = useRef(onOpenChange);
  openRef.current = open;
  onOpenChangeRef.current = onOpenChange;

  useEffect(() => {
    if (!key) return;
    // Narrowed here rather than inside the handler: the `if (!key) return` above
    // does not narrow across a nested function boundary.
    const target = key.toLowerCase();
    function handleKeyDown(event: KeyboardEvent) {
      // A modifier is required, so this can never intercept plain typing.
      if (!event.metaKey && !event.ctrlKey) return;
      if (event.key.toLowerCase() !== target) return;
      event.preventDefault();
      onOpenChangeRef.current?.(!openRef.current);
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [key]);
}

export interface CommandDialogProps extends React.ComponentProps<typeof DialogPrimitive.Root> {
  /**
   * Screen-reader name for the dialog. Radix requires a title and logs a
   * development error without one; a palette has no visible heading, so this is
   * rendered inside `VisuallyHidden` rather than omitted.
   */
  title?: string;
  /** Likewise for `aria-describedby`, which Radix always points somewhere. */
  description?: string;
  /**
   * The letter to bind with ⌘/Ctrl, e.g. `"k"`. Omitted or `false` means NO
   * global listener is installed. Requires the controlled form , the shortcut
   * toggles through `onOpenChange`, so an uncontrolled dialog has nothing to
   * call.
   */
  shortcut?: string | false;
  className?: string;
}

function CommandDialog({
  title = 'Command palette',
  description = 'Search for a command to run',
  shortcut = false,
  className,
  children,
  open,
  onOpenChange,
  ...props
}: CommandDialogProps) {
  useGlobalShortcut(shortcut, open, onOpenChange);

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange} {...props}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          data-slot="command-palette-overlay"
          className={cn(
            'fixed inset-0 z-overlay bg-overlay',
            'duration-enter ease-out',
            'data-[state=open]:animate-in data-[state=open]:fade-in-0',
            'data-[state=closed]:animate-out data-[state=closed]:fade-out-0',
          )}
        />
        <DialogPrimitive.Content
          data-slot="command-palette-dialog"
          className={cn(
            'glass fixed z-modal overflow-hidden rounded-xl p-0 shadow-lg',
            // Top-anchored rather than centred: the list grows downwards as the
            // user types, and a vertically centred palette jumps on every
            // keystroke.
            'top-[15vh] w-[calc(100%-2rem)] max-w-lg',
            // Horizontal centring is symmetric, so the PHYSICAL pair is correct
            // in both directions. `start-1/2` would break RTL , `translate` does
            // not flip, so the box would be pushed off the wrong edge.
            'left-1/2 -translate-x-1/2',
            'duration-enter ease-out',
            'data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95',
            'data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95',
            className,
          )}
        >
          <VisuallyHidden.Root>
            <DialogPrimitive.Title>{title}</DialogPrimitive.Title>
            <DialogPrimitive.Description>{description}</DialogPrimitive.Description>
          </VisuallyHidden.Root>
          {/* No rounding or border of its own , the dialog owns the frame. */}
          <CommandPalette className="rounded-none">{children}</CommandPalette>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

export {
  CommandPalette,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandSeparator,
  CommandShortcut,
  CommandDialog,
};
