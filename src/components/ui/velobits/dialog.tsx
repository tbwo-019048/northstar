'use client';

import { cva, type VariantProps } from 'class-variance-authority';
import { Dialog as DialogPrimitive } from 'radix-ui';

import { XIcon } from '@velobitsio/icons';

import { cn } from '@/lib/utils';

/**
 * The centred, modal, Tier-O glass box. Forms live here; long-form reading lives
 * in `SidePanel`, which is a different component on purpose: the two must not be
 * collapsed into one `side`-variant component (`SidePanel` documents why).
 *
 * ```tsx
 * <Dialog>
 *   <DialogTrigger asChild><Button>New environment</Button></DialogTrigger>
 *   <DialogContent focusFirstField>
 *     <DialogHeader>
 *       <DialogTitle>New environment</DialogTitle>
 *       <DialogDescription>Environments inherit from Production.</DialogDescription>
 *     </DialogHeader>
 *     <Field>…</Field>
 *     <DialogFooter>
 *       <DialogClose asChild><Button>Cancel</Button></DialogClose>
 *       <Button variant="primary">Create</Button>
 *     </DialogFooter>
 *   </DialogContent>
 * </Dialog>
 * ```
 *
 * ## `DialogTitle` is not optional
 *
 * Radix names the dialog from it and logs a development error without one. A
 * dialog with a visually redundant title should render the title inside
 * `<span className="sr-only">`, never omit it.
 *
 * ## A dialog with no description must say so
 *
 * Radix always points `aria-describedby` at its description id and warns when
 * nothing claims it. For a genuinely description-less dialog pass
 * `aria-describedby={undefined}` , that silences the warning without leaving a
 * dangling reference behind.
 */
function Dialog({ ...props }: React.ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root data-slot="dialog" {...props} />;
}

function DialogTrigger({ ...props }: React.ComponentProps<typeof DialogPrimitive.Trigger>) {
  return <DialogPrimitive.Trigger data-slot="dialog-trigger" {...props} />;
}

function DialogPortal({ ...props }: React.ComponentProps<typeof DialogPrimitive.Portal>) {
  return <DialogPrimitive.Portal data-slot="dialog-portal" {...props} />;
}

function DialogClose({ ...props }: React.ComponentProps<typeof DialogPrimitive.Close>) {
  return <DialogPrimitive.Close data-slot="dialog-close" {...props} />;
}

/**
 * The scrim. `bg-overlay` is `--overlay` , a dimmed page, NOT a second blur.
 * Blurring both the scrim and the panel doubles the backdrop cost for an effect
 * nobody can see through the panel anyway.
 *
 * `DialogContent` renders one of these itself, so most callers never touch this.
 * It stays exported for the rare composition that needs Portal, Overlay and
 * Content as explicit siblings.
 */
function DialogOverlay({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      data-slot="dialog-overlay"
      className={cn(
        'fixed inset-0 z-overlay bg-overlay',
        'animation-duration-(--duration-overlay)',
        'data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:ease-out',
        'data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:ease-in',
        className,
      )}
      {...props}
    />
  );
}

/**
 * `~480px` is the form width the system settled on; `size` widens it for the
 * occasional table or diff. Only `max-width` changes , the panel is
 * `calc(100% - 2rem)` below that, so it keeps a gutter on a phone.
 */
const dialogContentVariants = cva(
  [
    // Tier O. `.glass` carries the background, the border and the shadow, and it
    // lives in Tailwind's `components` layer , so a `bg-*` utility added here or
    // by a caller SILENTLY REPLACES the glass background. Do not add one.
    'glass',
    /*
     * Centred with `inset-0` + `margin: auto` rather than the usual
     * `top-1/2 left-1/2 -translate-1/2`, for two independent reasons:
     *
     *  1. `left` is physical. Auto margins are direction-agnostic, so this is
     *     correct under `dir="rtl"` with no mirrored variant.
     *  2. `tw-animate-css`'s `enter`/`exit` keyframes write the WHOLE `transform`
     *     property (translate3d + scale3d + rotate). A layout translate on the
     *     same element is discarded for the duration of the animation, which is
     *     the off-centre jump every shadcn dialog does on open. Keeping layout
     *     out of `transform` leaves `transform` free for the animation.
     */
    'fixed inset-0 z-modal m-auto h-fit w-[calc(100%-2rem)]',
    /*
     * A safety net, not a layout: a 480px form does not scroll. When one does
     * overflow, the ✕ is positioned against this box and therefore scrolls with
     * it , Esc and the scrim both still close, so the dialog is never a trap.
     * `dvh` rather than `vh` so mobile browser chrome is accounted for.
     */
    'max-h-[calc(100dvh-2rem)] overflow-y-auto',
    'grid gap-4 rounded-xl p-6 text-fg',
    /*
     * Enter/exit. Opacity and scale only , never the blur radius, which forces a
     * full backdrop repaint every frame.
     *
     * The duration is set through `animation-duration-(--duration-overlay)` and
     * NOT through the `duration-overlay` token utility: `animate-in` expands to
     * the `animation` SHORTHAND, and under a `data-[state=…]` variant it outranks
     * a bare `animation-duration` longhand on both order and specificity , so
     * `duration-overlay` would be silently discarded. `--tw-animation-duration`
     * is the variable the shorthand itself reads, so it always wins.
     */
    'animation-duration-(--duration-overlay)',
    'data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95',
    'data-[state=open]:ease-out',
    'data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95',
    'data-[state=closed]:ease-in',
  ],
  {
    variants: {
      size: {
        sm: 'max-w-[24rem]',
        /** 480px , the form default. */
        md: 'max-w-[30rem]',
        lg: 'max-w-[42rem]',
        xl: 'max-w-[56rem]',
      },
    },
    defaultVariants: { size: 'md' },
  },
);

/**
 * Matches an enabled form field, in DOM order. Carried verbatim from the
 * dashboard app's dialog , see `focusFirstField` below for why it exists.
 */
const FIRST_FORM_FIELD =
  'input:not([type="hidden"]):not([disabled]), select:not([disabled]), textarea:not([disabled])';

export interface DialogContentProps
  extends
    React.ComponentProps<typeof DialogPrimitive.Content>,
    VariantProps<typeof dialogContentVariants> {
  /**
   * Move initial focus to the first enabled field instead of the first tabbable
   * node.
   *
   * ## Why this prop exists at all: `autoFocus` is silently swallowed
   *
   * Radix wraps the content in a `FocusScope` that focuses the first tabbable
   * element on mount , which in this layout is the header ✕ , and it does so
   * AFTER React has honoured `autoFocus`. So `autoFocus` on a field has never
   * worked inside a Radix Dialog, in any version, and it fails with no warning:
   * the dialog opens, the caret is nowhere, and Enter activates the close button
   * instead of submitting. The dashboard app hit this on "New environment" and the
   * fix below is the one that repaired every form dialog in that app at once.
   *
   * Preventing `onOpenAutoFocus`'s default and focusing the field ourselves is
   * the ONLY reliable route. `autoFocus` inside a Radix Dialog is not.
   *
   * ## Default `false`, deliberately
   *
   * A dialog with no field to focus , a confirmation, a reveal-once API key ,
   * wants Radix's default, and so does anything long enough to read rather than
   * fill in (that is `SidePanel`, which never redirects).
   *
   * A caller's own `onOpenAutoFocus` runs first and can opt out entirely by
   * calling `preventDefault()`, which is how the scope switcher focuses its
   * filter box instead.
   */
  focusFirstField?: boolean;
  /** The header ✕. Set `false` when the only way out should be an explicit action. */
  showCloseButton?: boolean;
}

function DialogContent({
  className,
  size,
  children,
  focusFirstField = false,
  showCloseButton = true,
  onOpenAutoFocus,
  ...props
}: DialogContentProps) {
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        data-slot="dialog-content"
        onOpenAutoFocus={(event) => {
          onOpenAutoFocus?.(event);
          if (!focusFirstField || event.defaultPrevented) return;
          /*
           * `currentTarget` is the content element: Radix dispatches
           * `focusScope.autoFocusOnMount` on the FocusScope container, which
           * `asChild` makes this node. Reading it off the event rather than a
           * local ref keeps a caller-supplied `ref` intact , composing one here
           * is a clobber waiting to happen.
           */
          const field = (event.currentTarget as HTMLElement | null)?.querySelector<HTMLElement>(
            FIRST_FORM_FIELD,
          );
          if (!field) return;
          event.preventDefault();
          field.focus();
        }}
        className={cn(dialogContentVariants({ size }), className)}
        {...props}
      >
        {/*
         * FIRST in the DOM, though it is painted in the corner , so it is the
         * first tabbable node and therefore what Radix focuses on open. That is
         * deliberate: the ✕ is the harmless default landing spot, and it is
         * exactly the element `focusFirstField` exists to step past. Moving it
         * after `children` would make Radix focus whatever a caller happened to
         * put first, quietly changing initial focus per call site.
         */}
        {showCloseButton ? (
          <DialogPrimitive.Close
            data-slot="dialog-close"
            aria-label="Close"
            /*
             * `absolute`, and it matters: `backdrop-filter` makes `.glass` a
             * containing block for `position: fixed` descendants, so a fixed
             * child here would be positioned against the dialog rather than the
             * viewport , and would not escape it.
             */
            className={cn(
              'absolute end-3 top-3 grid size-7 place-items-center rounded-md text-muted-foreground',
              'transition-colors duration-micro ease-out hover:bg-highlight hover:text-fg',
              'disabled:pointer-events-none',
            )}
          >
            <XIcon size={16} />
          </DialogPrimitive.Close>
        ) : null}
        {children}
      </DialogPrimitive.Content>
    </DialogPortal>
  );
}

/**
 * `pe-7` keeps a long title clear of the ✕, which is absolutely positioned in
 * the inline-end corner. Logical, so it flips with the button under RTL.
 */
function DialogHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="dialog-header"
      className={cn('flex flex-col gap-1.5 pe-7 text-start', className)}
      {...props}
    />
  );
}

/**
 * Column-then-row rather than row-reverse: on a narrow viewport the primary
 * action should be the full-width top button, and `flex-col-reverse` puts it
 * there while DOM order keeps Cancel first for the keyboard.
 */
function DialogFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn('flex flex-col-reverse gap-2 sm:flex-row sm:justify-end', className)}
      {...props}
    />
  );
}

function DialogTitle({ className, ...props }: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      data-slot="dialog-title"
      className={cn('text-base leading-none font-semibold', className)}
      {...props}
    />
  );
}

/**
 * `text-muted-foreground` resolves to `--muted-on-glass` in here, because
 * `.glass` rebinds `--muted-fg` for its descendants , `--muted-fg` measures
 * 3.09:1 over the worst-case backdrop once glass is composited over it, and the
 * on-glass step holds 4.92:1. Nothing at the call site has to know.
 */
function DialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      data-slot="dialog-description"
      className={cn('text-sm text-muted-foreground', className)}
      {...props}
    />
  );
}

export {
  Dialog,
  DialogTrigger,
  DialogPortal,
  DialogClose,
  DialogOverlay,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  dialogContentVariants,
};
