'use client';

import { cva, type VariantProps } from 'class-variance-authority';
import { Toast as ToastPrimitive } from 'radix-ui';

import { XIcon } from '@velobitsio/icons';

import { cn } from '@/lib/utils';

/**
 * Radix Toast on the glass overlay tier.
 *
 * `Toast` ships inside the unified `radix-ui` package (v1.6.7 re-exports
 * `@radix-ui/react-toast` as `Toast`), so there is no extra dependency to add.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ## THE VIEWPORT MUST NOT BE RENDERED INSIDE A GLASS ANCESTOR
 *
 * `ToastViewport` is `position: fixed`. `backdrop-filter` **establishes a
 * containing block for fixed descendants**, so a viewport mounted anywhere below
 * a `.glass` element , a glass topbar, a Dialog, a Sheet , is positioned
 * relative to that element instead of the layout viewport. It gets trapped: it
 * anchors to the bottom of the overlay, clips against its `overflow`, and
 * disappears with it when the overlay closes.
 *
 * This is the same containing-block rule documented on `GlassSurface`, and it is
 * the single most likely way to break this component. Mount `ToastProvider` +
 * `ToastViewport` ONCE, at the app shell root, as a sibling of the glass chrome
 * rather than a child of it.
 *
 * (`transform`, `filter`, `perspective` and `will-change` do the same thing.
 * `backdrop-filter` is only the instance you will meet here.)
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * ## Colour is never the only signal (WCAG 1.4.1)
 *
 * The variant paints an inline-start accent stripe and tints the icon. That is
 * colour, and colour alone tells a colour-blind user nothing , so, exactly as in
 * `Alert`, every variant expects an ICON and a TITLE that names the state in
 * words. The grid reserves the icon column so callers do not lay it out.
 *
 * ## Auto-dismiss is not a substitute for a close button
 *
 * WCAG 2.2.1: a message that vanishes on a timer is unusable by anyone reading
 * slowly. Radix pauses the timer on hover and while focus is inside, and `Esc`
 * dismisses , but always render `ToastClose` too. Anything the user MUST act on
 * is a Dialog, not a toast.
 *
 * ```tsx
 * // once, at the shell root , NOT inside glass chrome
 * <ToastProvider>
 *   {children}
 *   <ToastViewport />
 * </ToastProvider>
 * ```
 */
function ToastProvider({
  label = 'Notification',
  duration = 5000,
  swipeDirection = 'down',
  ...props
}: React.ComponentProps<typeof ToastPrimitive.Provider>) {
  return (
    <ToastPrimitive.Provider
      label={label}
      duration={duration}
      /**
       * Radix defaults this to `right`, which is wrong for us in RTL: the
       * viewport sits at the inline END, so under `dir="rtl"` it is the
       * bottom-LEFT corner and a rightward swipe drags the toast away from the
       * edge it should leave through. `down` is direction-agnostic , the
       * viewport is bottom-anchored in both directions.
       */
      swipeDirection={swipeDirection}
      {...props}
    />
  );
}

/**
 * `flex-col` with `bottom-0`, deliberately, rather than `flex-col-reverse`: the
 * container hugs its content, so the LAST child is already the one nearest the
 * corner. Reversing would put the newest toast nearest the corner too, but at
 * the cost of visual order no longer matching DOM order (WCAG 1.3.2).
 */
function ToastViewport({
  className,
  ...props
}: React.ComponentProps<typeof ToastPrimitive.Viewport>) {
  return (
    <ToastPrimitive.Viewport
      data-slot="toast-viewport"
      className={cn(
        // See the containing-block warning in the file docblock before moving this.
        'fixed bottom-0 end-0 z-toast',
        'flex max-h-screen w-full flex-col gap-2 p-4 sm:max-w-96',
        // The list itself is not a click target; each toast re-enables pointer
        // events, so the gaps between them do not eat clicks on the page below.
        'pointer-events-none',
        className,
      )}
      {...props}
    />
  );
}

/**
 * The variant is an accent stripe plus an icon tint , NOT a `bg-*-soft` wash,
 * and that is load-bearing rather than aesthetic.
 *
 * The soft tokens are low-alpha washes designed to sit on an OPAQUE panel
 * (`--success-soft` is `rgba(34,110,37,0.12)`). `.glass` lives in Tailwind's
 * `components` layer, so a `bg-success-soft` utility overrides
 * `background: var(--glass-bg)` , replacing an alpha-0.85 surface with an
 * alpha-0.12 one. The result is a blurred smear of whatever is behind it: the
 * exact "washed-out panel with page content bleeding through" failure that
 * `glass.css`'s `@supports` fallback exists to prevent. And nothing warns you,
 * because both classes are individually valid.
 *
 * `border-s-*` is logical, so the stripe lands on the reading-start edge in both
 * directions, and it only overrides ONE side of the translucent glass edge.
 */
const toastVariants = cva(
  [
    'group pointer-events-auto relative w-full overflow-hidden rounded-lg p-4 text-sm text-fg',
    'glass',
    // Reserved icon column, then content, then the close affordance. Same shape
    // as Alert, so the two read as one family.
    'grid grid-cols-[calc(var(--spacing)*4)_1fr_auto] items-start gap-x-3 gap-y-1',
    '[&>svg]:size-4 [&>svg]:translate-y-0.5',
    // Enter/exit: transform and opacity only. Never tween the blur radius ,
    // every frame forces a full backdrop repaint.
    'duration-enter ease-out',
    'data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:slide-in-from-bottom-2',
    'data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-bottom-2',
    // Swipe-to-dismiss. Both axes carry a `0px` fallback so overriding
    // `swipeDirection` to a horizontal value still works , Radix only publishes
    // the var for the axis in use, and a bare `var()` with no fallback would
    // make the whole `translate` declaration invalid.
    'data-[swipe=move]:transition-none',
    'data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x,0px)]',
    'data-[swipe=move]:translate-y-[var(--radix-toast-swipe-move-y,0px)]',
    'data-[swipe=cancel]:translate-x-0 data-[swipe=cancel]:translate-y-0',
    'data-[swipe=end]:animate-out data-[swipe=end]:fade-out-0',
  ],
  {
    variants: {
      variant: {
        default: 'border-s-4 border-s-border',
        success: 'border-s-4 border-s-success [&>svg]:text-success',
        danger: 'border-s-4 border-s-danger [&>svg]:text-danger',
        warning: 'border-s-4 border-s-warning [&>svg]:text-warning',
        info: 'border-s-4 border-s-info [&>svg]:text-info',
      },
    },
    defaultVariants: { variant: 'default' },
  },
);

export interface ToastProps
  extends React.ComponentProps<typeof ToastPrimitive.Root>, VariantProps<typeof toastVariants> {}

/**
 * `type` stays Radix's default of `foreground`, which announces immediately.
 * Pass `type="background"` for anything the user did not just trigger (a
 * completed background job, an incoming message) so it does not interrupt what
 * the screen reader is currently reading.
 */
function Toast({ className, variant, ...props }: ToastProps) {
  return (
    <ToastPrimitive.Root
      data-slot="toast"
      data-variant={variant ?? 'default'}
      className={cn(toastVariants({ variant }), className)}
      {...props}
    />
  );
}

function ToastTitle({ className, ...props }: React.ComponentProps<typeof ToastPrimitive.Title>) {
  return (
    <ToastPrimitive.Title
      data-slot="toast-title"
      className={cn('col-start-2 font-medium', className)}
      {...props}
    />
  );
}

/**
 * `text-muted-foreground` resolves to `--muted-on-glass` here rather than
 * `--muted-fg`, because `.glass` redefines `--muted-fg` for its descendants:
 * 3.09:1 over the worst-case backdrop becomes 4.92:1. Nothing at this call site
 * has to know that, which is the point.
 */
function ToastDescription({
  className,
  ...props
}: React.ComponentProps<typeof ToastPrimitive.Description>) {
  return (
    <ToastPrimitive.Description
      data-slot="toast-description"
      className={cn('col-start-2 text-muted-foreground', className)}
      {...props}
    />
  );
}

/**
 * `altText` is REQUIRED by Radix and it is not decoration: a toast is transient,
 * so a screen-reader user may never reach the button. Radix reads `altText` as
 * an instruction for achieving the same thing another way , "press Undo in the
 * flag's history", not "click Undo".
 *
 * Styled as a quiet inline control rather than importing `Button`, so a CLI
 * consumer can install `toast` on its own without pulling `button` in.
 */
function ToastAction({ className, ...props }: React.ComponentProps<typeof ToastPrimitive.Action>) {
  return (
    <ToastPrimitive.Action
      data-slot="toast-action"
      className={cn(
        'col-start-2 mt-2 inline-flex h-8 shrink-0 items-center justify-center rounded-md',
        'border border-border bg-panel px-3 text-xs font-medium text-fg',
        'transition-colors duration-micro ease-out hover:bg-highlight',
        'focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40',
        'disabled:pointer-events-none disabled:opacity-50',
        // justify-self, not a margin: grid placement is already direction-aware.
        'justify-self-start',
        className,
      )}
      {...props}
    />
  );
}

/**
 * Always rendered, never revealed on hover only , a hover-gated close button
 * does not exist for touch or keyboard users. The 32px hit area is the minimum
 * that survives a thumb.
 */
function ToastClose({ className, ...props }: React.ComponentProps<typeof ToastPrimitive.Close>) {
  return (
    <ToastPrimitive.Close
      data-slot="toast-close"
      aria-label="Dismiss"
      className={cn(
        'col-start-3 row-start-1 inline-flex size-8 items-center justify-center rounded-md',
        '-my-1 -me-1 text-muted-foreground',
        'transition-colors duration-micro ease-out hover:bg-highlight hover:text-fg',
        'focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40',
        'justify-self-end',
        className,
      )}
      {...props}
    >
      <XIcon size={14} />
    </ToastPrimitive.Close>
  );
}

export {
  ToastProvider,
  ToastViewport,
  Toast,
  ToastTitle,
  ToastDescription,
  ToastClose,
  ToastAction,
  toastVariants,
};
