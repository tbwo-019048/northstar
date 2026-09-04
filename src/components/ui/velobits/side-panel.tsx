'use client';

import { cva, type VariantProps } from 'class-variance-authority';
import { Dialog as DialogPrimitive } from 'radix-ui';

import { XIcon } from '@velobitsio/icons';

import { cn } from '@/lib/utils';

/**
 * The edge-anchored reading sheet: flag detail, an audit entry, a rule's
 * evaluation trace. Built on Radix Dialog for the focus trap, the Esc handler,
 * the ARIA wiring and the scroll lock , and deliberately NOT the same component
 * as `Dialog`.
 *
 * ## Why this is not just `<Dialog side="right">`
 *
 * The two differ in the one behaviour that is hardest to bolt on afterwards:
 * **initial focus**.
 *
 *  - `Dialog` is the ~480px centred FORM box. It offers `focusFirstField`,
 *    because `autoFocus` inside a Radix Dialog is silently swallowed by
 *    `FocusScope` and a form that opens with the caret nowhere is broken.
 *  - `SidePanel` is for READING. It keeps Radix's default , first tabbable node,
 *    which is the ✕ , and it must never redirect focus into a field. A reading
 *    sheet that yanks focus into the first input scrolls the panel, pops the
 *    mobile keyboard, and starts a screen-reader user in the middle of the
 *    content instead of at its heading.
 *
 * They are two components for exactly that reason. **Do not merge them back** into
 * one component with a `side` variant: the merged version has to choose one
 * focus policy, and either choice breaks half the call sites. There is
 * intentionally no `focusFirstField` prop here, and the suite asserts its
 * absence rather than trusting the comment.
 *
 * ```tsx
 * <SidePanel>
 *   <SidePanelTrigger asChild><Button>View flag</Button></SidePanelTrigger>
 *   <SidePanelContent>
 *     <SidePanelHeader>
 *       <SidePanelTitle>checkout-v2</SidePanelTitle>
 *       <SidePanelDescription>Production · 40% rollout</SidePanelDescription>
 *     </SidePanelHeader>
 *     …
 *   </SidePanelContent>
 * </SidePanel>
 * ```
 *
 * `SidePanelTitle` is mandatory for the same reason `DialogTitle` is: Radix
 * names the dialog from it. A panel with no description should pass
 * `aria-describedby={undefined}` to `SidePanelContent`.
 */
function SidePanel({ ...props }: React.ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root data-slot="side-panel" {...props} />;
}

function SidePanelTrigger({ ...props }: React.ComponentProps<typeof DialogPrimitive.Trigger>) {
  return <DialogPrimitive.Trigger data-slot="side-panel-trigger" {...props} />;
}

function SidePanelClose({ ...props }: React.ComponentProps<typeof DialogPrimitive.Close>) {
  return <DialogPrimitive.Close data-slot="side-panel-close" {...props} />;
}

/**
 * The scrim, duplicated from `Dialog` rather than imported from it.
 *
 * Two reasons, both structural: the shadcn CLI copies each registry item as a
 * standalone file, so a cross-import would make every `side-panel` install drag
 * `dialog` in behind it , and keeping the two components separate is easier to
 * keep honest when the two files share no code to drift through.
 */
function SidePanelOverlay({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      data-slot="side-panel-overlay"
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

const sidePanelContentVariants = cva(
  [
    // Tier O. `.glass` supplies the background, border and shadow from the
    // `components` layer , a `bg-*` utility here would silently replace it.
    'glass',
    /*
     * A non-scrolling flex column of definite height, and the scroll region goes
     * on a CHILD:
     *
     *   <div className="-mx-6 flex-1 overflow-y-auto px-6">…long content…</div>
     *
     * Not on the panel itself, for two reasons that both bite silently: the ✕ is
     * positioned against this box, so a scrolling panel scrolls its own close
     * button out of reach; and `SidePanelFooter`'s `mt-auto` needs a column that
     * does not grow with its content. `overflow-hidden` here means a caller who
     * forgets gets clipped content inside the rounded glass edge rather than a
     * panel spilling down the page.
     */
    'fixed z-modal flex flex-col gap-4 overflow-hidden p-6 text-fg',
    /*
     * Transform and opacity ONLY. Never width or height: animating either
     * relayouts the panel's whole subtree every frame, and on a glass surface it
     * also re-samples the backdrop. And never the blur RADIUS, for the same
     * reason at higher cost.
     *
     * Duration goes through `animation-duration-(--duration-overlay)` rather than
     * the `duration-overlay` token utility: `animate-in` expands to the
     * `animation` SHORTHAND, and behind a `data-[state=…]` variant it beats a
     * bare `animation-duration` longhand on order *and* specificity , so
     * `duration-overlay` would be dropped without a word.
     * `--tw-animation-duration` is the variable the shorthand reads.
     */
    'animation-duration-(--duration-overlay)',
    'data-[state=open]:animate-in data-[state=open]:ease-out',
    'data-[state=closed]:animate-out data-[state=closed]:ease-in',
  ],
  {
    variants: {
      /**
       * `right` and `left` are INLINE-relative, not physical: they anchor with
       * `end-0` / `start-0`, so under `dir="rtl"` a "right" panel attaches to the
       * left edge , which is where a reader in an RTL locale expects the detail
       * sheet to come from.
       *
       * The slide has to agree with the anchor or the panel flies in from the
       * opposite side of the screen, and `slide-in-from-right` is physical.
       * `tw-animate-css` ≥1.4 ships logical `slide-in-from-end` /
       * `slide-out-to-end` (implemented with `:dir()`), which is what makes this
       * correct in both directions without a mirrored `rtl:` duplicate whose
       * stylesheet order would decide the winner.
       */
      side: {
        right: [
          'inset-y-0 end-0 w-full max-w-[28rem] rounded-s-xl',
          'data-[state=open]:slide-in-from-end data-[state=closed]:slide-out-to-end',
        ],
        left: [
          'inset-y-0 start-0 w-full max-w-[28rem] rounded-e-xl',
          'data-[state=open]:slide-in-from-start data-[state=closed]:slide-out-to-start',
        ],
        /**
         * A DEFINITE height, per the rule the editor app settled on the hard way:
         * a scroll region needs an ancestor chain whose height actually resolves.
         * `h-[75%]` resolves against a fixed-position containing block whose
         * height is not always what you expect, and `max-h` with `h-auto` leaves
         * an inner `flex-1`/`min-h-0` scroll region with nothing to measure , the
         * sheet then either collapses to its content or refuses to scroll. `dvh`
         * also tracks mobile browser chrome, which `vh` does not: with `vh` the
         * bottom of the sheet sits under the URL bar on iOS.
         */
        bottom: [
          'inset-x-0 bottom-0 h-[75dvh] rounded-t-xl',
          'data-[state=open]:slide-in-from-bottom data-[state=closed]:slide-out-to-bottom',
        ],
      },
    },
    defaultVariants: { side: 'right' },
  },
);

export interface SidePanelContentProps
  extends
    React.ComponentProps<typeof DialogPrimitive.Content>,
    VariantProps<typeof sidePanelContentVariants> {
  /** The ✕. Also the node Radix focuses on open , see the note at the top. */
  showCloseButton?: boolean;
}

function SidePanelContent({
  className,
  side,
  children,
  showCloseButton = true,
  ...props
}: SidePanelContentProps) {
  /*
   * No `onOpenAutoFocus` handler, and that is the point of this component. Radix
   * focuses the first tabbable node , the ✕ below , and a reading sheet leaves it
   * there. The redirect-to-first-field behaviour lives in `Dialog` alone.
   */
  return (
    <DialogPrimitive.Portal data-slot="side-panel-portal">
      <SidePanelOverlay />
      <DialogPrimitive.Content
        data-slot="side-panel-content"
        data-side={side ?? 'right'}
        className={cn(sidePanelContentVariants({ side }), className)}
        {...props}
      >
        {/*
         * FIRST in the DOM, painted in the corner. It is therefore the first
         * tabbable node and what Radix focuses on open , which for a reading
         * sheet is the whole intent. Move it after `children` and
         * initial focus silently becomes "whatever the caller put first", which
         * for a detail panel containing an inline editor is a field.
         */}
        {showCloseButton ? (
          <DialogPrimitive.Close
            data-slot="side-panel-close"
            aria-label="Close"
            /*
             * `absolute`, never `fixed`: `backdrop-filter` makes `.glass` a
             * containing block for fixed descendants, so a fixed child is
             * positioned against this panel and cannot escape it. The same trap
             * applies to any sticky footer a caller adds , keep it in flow.
             */
            className={cn(
              'absolute end-4 top-4 grid size-7 place-items-center rounded-md text-muted-foreground',
              'transition-colors duration-micro ease-out hover:bg-highlight hover:text-fg',
              'disabled:pointer-events-none',
            )}
          >
            <XIcon size={16} />
          </DialogPrimitive.Close>
        ) : null}
        {children}
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

/**
 * `pe-8` clears the ✕ in the inline-end corner; logical, so header text and
 * button flip together under RTL.
 */
function SidePanelHeader({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="side-panel-header"
      className={cn('flex flex-col gap-1.5 pe-8 text-start', className)}
      {...props}
    />
  );
}

/**
 * `mt-auto` pins the footer to the block-end of the flex column. Deliberately
 * not `sticky`: a sticky descendant of a `backdrop-filter` element is positioned
 * against that element's box, and on a panel whose own scroll container is the
 * caller's body element the result is a footer that never sticks to anything.
 */
function SidePanelFooter({ className, ...props }: React.ComponentProps<'div'>) {
  return (
    <div
      data-slot="side-panel-footer"
      className={cn('mt-auto flex flex-col-reverse gap-2 sm:flex-row sm:justify-end', className)}
      {...props}
    />
  );
}

function SidePanelTitle({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      data-slot="side-panel-title"
      className={cn('text-base leading-none font-semibold', className)}
      {...props}
    />
  );
}

/**
 * `text-muted-foreground` picks up `--muted-on-glass` in here: `.glass` rebinds
 * `--muted-fg` for its descendants, because the plain muted grey drops to 3.09:1
 * once glass is composited over an arbitrary backdrop while the on-glass step
 * holds 4.92:1.
 */
function SidePanelDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      data-slot="side-panel-description"
      className={cn('text-sm text-muted-foreground', className)}
      {...props}
    />
  );
}

export {
  SidePanel,
  SidePanelTrigger,
  SidePanelClose,
  SidePanelContent,
  SidePanelHeader,
  SidePanelFooter,
  SidePanelTitle,
  SidePanelDescription,
  sidePanelContentVariants,
};
