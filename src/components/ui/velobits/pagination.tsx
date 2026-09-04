'use client';

import { Slot } from 'radix-ui';

import { ChevronRightIcon, MoreHorizontalIcon } from '@velobitsio/icons';

import { cn } from '@/lib/utils';
import { buttonVariants } from './button';

/**
 * Page navigation, plus the range arithmetic that decides which numbers to show.
 *
 * ```tsx
 * <Pagination>
 *   <PaginationContent>
 *     <PaginationItem>
 *       <PaginationPrevious disabled={page === 1} onClick={() => go(page - 1)} />
 *     </PaginationItem>
 *     {paginationRange({ page, pageCount }).map((slot, i) => (
 *       <PaginationItem key={slot === 'ellipsis' ? `gap-${i}` : slot}>
 *         {slot === 'ellipsis' ? (
 *           <PaginationEllipsis />
 *         ) : (
 *           <PaginationLink href={`?page=${slot}`} isActive={slot === page}>
 *             {slot}
 *           </PaginationLink>
 *         )}
 *       </PaginationItem>
 *     ))}
 *     <PaginationItem>
 *       <PaginationNext disabled={page === pageCount} onClick={() => go(page + 1)} />
 *     </PaginationItem>
 *   </PaginationContent>
 * </Pagination>
 * ```
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ## NUMBERS ARE LINKS. PREVIOUS AND NEXT ARE BUTTONS. THAT IS NOT AN OVERSIGHT.
 *
 * shadcn renders all of them as `<a>`. Two things go wrong with that, and only
 * the second one is visible:
 *
 *  - A page number IS a destination , `?page=3` is a URL somebody can bookmark,
 *    middle-click, or open in a new tab , so `PaginationLink` is an anchor and
 *    stays one.
 *  - Previous and Next are *relative moves*, and the thing that has to happen at
 *    the ends of the range is that they become unavailable **without leaving the
 *    page**. An `<a>` cannot express that: strip its `href` and it stops being a
 *    link and stops being focusable, so a keyboard user tabbing through the
 *    control finds it has silently vanished , and if focus was ON it when the
 *    last page loaded, focus resets to the document body and the next Tab starts
 *    from the top of the page.
 *
 * So they are `<button type="button">`, and unavailability is `aria-disabled`
 * rather than the `disabled` attribute , see the note on `PaginationPrevious`.
 * `asChild` is on both, for an app that really does want anchors.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * ## Cursor pagination uses the same parts
 *
 * A cursor-paged list (no page count, because the server never sent one) renders
 * `PaginationPrevious` and `PaginationNext` and nothing between them. Do NOT
 * synthesise page numbers from a cursor: the numbers would be wrong the moment a
 * row is inserted, and a wrong page number is worse than no page number.
 */
function Pagination({ className, ...props }: React.ComponentProps<'nav'>) {
  return (
    <nav
      // Named, because a page with a sidebar and a breadcrumb already has two
      // other navigation landmarks and "navigation" three times is unusable.
      aria-label="Pagination"
      data-slot="pagination"
      className={cn('mx-auto flex w-full justify-center', className)}
      {...props}
    />
  );
}

/**
 * A `<ul>`, so the control announces its length , "list, 7 items" tells a
 * screen-reader user how far the range extends before they read any of it.
 */
function PaginationContent({ className, ...props }: React.ComponentProps<'ul'>) {
  return (
    <ul
      data-slot="pagination-content"
      className={cn('flex list-none flex-row items-center gap-1 p-0', className)}
      {...props}
    />
  );
}

function PaginationItem({ ...props }: React.ComponentProps<'li'>) {
  return <li data-slot="pagination-item" {...props} />;
}

export interface PaginationLinkProps extends React.ComponentProps<'a'> {
  /** The page you are on. Renders `aria-current="page"`. */
  isActive?: boolean;
  size?: 'sm' | 'icon';
  asChild?: boolean;
}

/**
 * `aria-current="page"` is the whole accessible story for the active number.
 *
 * The visual treatment , an outlined button instead of a ghost one , is not it:
 * a screen reader cannot see a border, and `aria-current` is the only thing that
 * says "you are here" rather than "here is a link to page 3".
 *
 * `tabular-nums` keeps the row from reflowing as the digits change: with
 * proportional figures, `1` is narrower than `8`, so paging shifts every button
 * under the pointer and the one you meant to click moves.
 */
function PaginationLink({
  className,
  isActive,
  size = 'icon',
  asChild = false,
  ...props
}: PaginationLinkProps) {
  const Comp = asChild ? Slot.Root : 'a';
  return (
    <Comp
      data-slot="pagination-link"
      aria-current={isActive ? 'page' : undefined}
      data-active={isActive || undefined}
      className={cn(
        buttonVariants({ variant: isActive ? 'secondary' : 'ghost', size }),
        'cursor-pointer tabular-nums',
        className,
      )}
      {...props}
    />
  );
}

export interface PaginationStepProps extends React.ComponentProps<'button'> {
  /**
   * There is no page in this direction. See the docblock , this becomes
   * `aria-disabled`, NOT the `disabled` attribute.
   */
  disabled?: boolean;
  asChild?: boolean;
}

/**
 * ## Why `aria-disabled` and not `disabled`
 *
 * A `disabled` button is removed from the tab order. On the last page that means
 * the control the user's focus is sitting in disappears from under them , focus
 * falls back to `<body>` and the next Tab restarts from the top of the document.
 * On a long list page, that is the difference between "I reached the end" and "I
 * lost my place".
 *
 * `aria-disabled="true"` keeps the button focusable and announced as dimmed,
 * which is what the pattern wants. It does NOT stop activation on its own , the
 * browser has no idea it means anything , so the click and keyboard handlers are
 * guarded below. Setting `aria-disabled` and forgetting the guard is the classic
 * version of this bug: it looks disabled, announces disabled, and still fires.
 */
function paginationStep(direction: 'previous' | 'next') {
  const label = direction === 'previous' ? 'Go to previous page' : 'Go to next page';

  function Step({
    className,
    disabled,
    asChild = false,
    onClick,
    children,
    ...props
  }: PaginationStepProps) {
    const Comp = asChild ? Slot.Root : 'button';
    return (
      <Comp
        type={asChild ? undefined : 'button'}
        data-slot={`pagination-${direction}`}
        aria-label={label}
        aria-disabled={disabled || undefined}
        data-disabled={disabled || undefined}
        onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
          if (disabled) {
            // `preventDefault` as well as the early return, because `asChild`
            // may have turned this into an anchor with a real href.
            event.preventDefault();
            return;
          }
          onClick?.(event);
        }}
        className={cn(
          buttonVariants({ variant: 'ghost', size: 'sm' }),
          'gap-1 px-2.5 sm:ps-2.5 sm:pe-2.5',
          // Mirrors `disabled:`'s look without the focus consequences. The
          // pointer-events rule must NOT be here: it would stop the element
          // receiving the click that the guard above exists to swallow, and on
          // some platforms it also suppresses the focus ring.
          'aria-disabled:cursor-not-allowed aria-disabled:opacity-50',
          className,
        )}
        {...props}
      >
        {children ?? (
          <>
            {/* One chevron component, rotated , so the two directions cannot
                drift apart, and `rtl:` flips both at once. A directional glyph
                is the one thing a logical property cannot express. */}
            <ChevronRightIcon
              size={16}
              className={cn(
                direction === 'previous' && 'rotate-180',
                direction === 'previous' ? 'rtl:rotate-0' : 'rtl:rotate-180',
                direction === 'next' && 'order-last',
              )}
            />
            <span className="hidden sm:inline">
              {direction === 'previous' ? 'Previous' : 'Next'}
            </span>
          </>
        )}
      </Comp>
    );
  }

  Step.displayName = direction === 'previous' ? 'PaginationPrevious' : 'PaginationNext';
  return Step;
}

const PaginationPrevious = paginationStep('previous');
const PaginationNext = paginationStep('next');

/**
 * The gap in the range.
 *
 * Not focusable and not a link: there is nothing to activate, and an
 * `<a>`-shaped ellipsis is a keyboard stop that does nothing. The `sr-only` text
 * is what stops it being announced as an empty list item.
 */
function PaginationEllipsis({ className, ...props }: React.ComponentProps<'span'>) {
  return (
    <span
      data-slot="pagination-ellipsis"
      className={cn('flex size-9 items-center justify-center text-muted-foreground', className)}
      {...props}
    >
      <MoreHorizontalIcon size={16} />
      <span className="sr-only">More pages</span>
    </span>
  );
}

export interface PaginationRangeOptions {
  /** Current page, 1-indexed. */
  page: number;
  /** Total number of pages. `0` yields an empty range. */
  pageCount: number;
  /** Pages either side of the current one. Default 1. */
  siblings?: number;
}

function span(from: number, to: number): number[] {
  return Array.from({ length: Math.max(to - from + 1, 0) }, (_, i) => from + i);
}

/**
 * Which page numbers to render, with `'ellipsis'` where the range is cut.
 *
 * ## The output length is CONSTANT
 *
 * For any page of a list long enough to need cutting, this returns exactly
 * `2 * siblings + 5` slots , `1 … 4 5 6 … 20`, seven at the default.
 *
 * That is the property worth having and the one hand-rolled versions miss. The
 * naive implementation drops an ellipsis when the current page is near an end,
 * so the control is 6 slots wide on page 1, 7 in the middle and 6 again at the
 * end , meaning every button shifts sideways as you page, and the "next number"
 * you were about to click has moved out from under the pointer. Here the ellipsis
 * is replaced by a *page number*, so the width never changes.
 *
 * Pure, exported and separately tested: the arithmetic is the part that is easy
 * to get subtly wrong (off-by-one at `pageCount = totalSlots + 1` is the classic)
 * and it should not need a DOM to check.
 */
export function paginationRange({
  page,
  pageCount,
  siblings = 1,
}: PaginationRangeOptions): (number | 'ellipsis')[] {
  if (pageCount <= 0) return [];

  // first + last + current + siblings either side + the two ellipses.
  const slots = siblings * 2 + 5;
  if (pageCount <= slots) return span(1, pageCount);

  const current = Math.min(Math.max(page, 1), pageCount);
  const leftSibling = Math.max(current - siblings, 1);
  const rightSibling = Math.min(current + siblings, pageCount);

  /*
   * An ellipsis must hide at least TWO pages, never one: standing in for a
   * single page is strictly worse than showing it , same width, less
   * information, and one more click to reach a page that was on screen a moment
   * ago.
   *
   * Hence `> 3` and `< pageCount - 2` rather than the `> 2` / `< pageCount - 1`
   * the usual implementation of this uses. The left ellipsis hides
   * `leftSibling - 2` pages and the right one hides `pageCount - 1 -
   * rightSibling`; both have to be ≥ 2. With the looser bound, `pageCount = 8,
   * page = 5` renders `1 … 4 5 6 … 8`, where the second ellipsis is standing in
   * for page 7 alone.
   *
   * Widening the bound cannot leave both sides uncut while the range still needs
   * cutting: that would require `pageCount ≤ 2·siblings + 5`, which is the early
   * return above.
   */
  const cutLeft = leftSibling > 3;
  const cutRight = rightSibling < pageCount - 2;

  // The run kept whole at whichever end is not cut. `slots - 2` because that end
  // spends no slot on an ellipsis and none on the far edge's page number.
  const runLength = slots - 2;

  if (!cutLeft && cutRight) return [...span(1, runLength), 'ellipsis', pageCount];
  if (cutLeft && !cutRight) return [1, 'ellipsis', ...span(pageCount - runLength + 1, pageCount)];
  return [1, 'ellipsis', ...span(leftSibling, rightSibling), 'ellipsis', pageCount];
}

export {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationPrevious,
  PaginationNext,
  PaginationEllipsis,
};
