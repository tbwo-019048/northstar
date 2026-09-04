'use client';

import { Slot } from 'radix-ui';

import { ChevronRightIcon, MoreHorizontalIcon } from '@velobitsio/icons';

import { cn } from '@/lib/utils';

/**
 * The trail back up a hierarchy: org → project → environment → record.
 *
 * ```tsx
 * <Breadcrumb>
 *   <BreadcrumbList>
 *     <BreadcrumbItem>
 *       <BreadcrumbLink asChild><Link to="/flags">Flags</Link></BreadcrumbLink>
 *     </BreadcrumbItem>
 *     <BreadcrumbSeparator />
 *     <BreadcrumbItem>
 *       <BreadcrumbPage>new-checkout</BreadcrumbPage>
 *     </BreadcrumbItem>
 *   </BreadcrumbList>
 * </Breadcrumb>
 * ```
 *
 * ## Three pieces of markup do all the accessibility work
 *
 *  1. **`<nav aria-label="Breadcrumb">`.** A page usually has several landmarks;
 *     an unnamed `navigation` is announced as "navigation" and a user cycling
 *     landmarks cannot tell it from the sidebar. The label is what makes the
 *     landmark list readable, and it is why `Breadcrumb` renders a `nav` rather
 *     than a styled `div`.
 *  2. **`<ol>`.** A breadcrumb is ordered , that is its entire content. The list
 *     is what gets a screen reader to announce "list, 4 items … item 3 of 4", so
 *     depth is conveyed without reading every crumb. A `div` of spans conveys
 *     none of it.
 *  3. **`aria-current="page"` on the leaf.** The one crumb that is where you
 *     already are.
 *
 * ## The leaf is not a link, and it is not a disabled link either
 *
 * `BreadcrumbPage` is a plain `<span aria-current="page">`.
 *
 * shadcn's version adds `role="link" aria-disabled="true"` to it. That is
 * deliberately dropped here. `role="link"` asserts that something is a link, and
 * `aria-disabled` then says it does not work , so assistive tech announces "link,
 * dimmed" for a piece of static text that was never interactive and is not
 * focusable. There is no state to communicate: the crumb is the current page, and
 * `aria-current` is the attribute that says exactly that.
 *
 * ## The one place this system uses an `rtl:` variant
 *
 * The separator chevron. The rule everywhere else is logical properties
 * (`ms-`/`me-`/`text-start`) so `dir="rtl"` needs no variants , but a chevron is
 * a *glyph* pointing along the reading direction, and there is no logical
 * property for the shape of a drawing. `rtl:rotate-180` is the only correct fix,
 * and an unflipped chevron in RTL reads as a trail pointing back the way it came.
 */
function Breadcrumb({ ...props }: React.ComponentProps<'nav'>) {
  return <nav aria-label="Breadcrumb" data-slot="breadcrumb" {...props} />;
}

function BreadcrumbList({ className, ...props }: React.ComponentProps<'ol'>) {
  return (
    <ol
      data-slot="breadcrumb-list"
      className={cn(
        'flex flex-wrap items-center gap-1.5 text-sm break-words text-muted-foreground sm:gap-2.5',
        className,
      )}
      {...props}
    />
  );
}

function BreadcrumbItem({ className, ...props }: React.ComponentProps<'li'>) {
  return (
    <li
      data-slot="breadcrumb-item"
      className={cn('inline-flex items-center gap-1.5', className)}
      {...props}
    />
  );
}

export interface BreadcrumbLinkProps extends React.ComponentProps<'a'> {
  /**
   * Render the child element instead of an `<a>`. This is the normal case in a
   * routed app , `asChild` with a router `Link`, so the crumb navigates client
   * side rather than reloading the document.
   */
  asChild?: boolean;
}

/**
 * `text-link` (`--primary-text`), never `text-primary`.
 *
 * `--primary` measures 3.90:1 on the cream page: fine as a fill behind white,
 * failing AA as text. A breadcrumb is small text, so it is the least forgiving
 * place in the system to get that pair wrong.
 */
function BreadcrumbLink({ className, asChild = false, ...props }: BreadcrumbLinkProps) {
  const Comp = asChild ? Slot.Root : 'a';
  return (
    <Comp
      data-slot="breadcrumb-link"
      className={cn(
        'rounded-sm transition-colors duration-micro ease-out',
        'hover:text-link hover:underline hover:underline-offset-4',
        'outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40',
        className,
      )}
      {...props}
    />
  );
}

function BreadcrumbPage({ className, ...props }: React.ComponentProps<'span'>) {
  return (
    <span
      data-slot="breadcrumb-page"
      aria-current="page"
      className={cn('font-medium text-fg', className)}
      {...props}
    />
  );
}

/**
 * `aria-hidden` AND `role="presentation"`, and both are load-bearing in
 * different places.
 *
 * The separator is an `<li>`, so it is a child of the `<ol>` and would otherwise
 * be counted: a four-crumb trail would announce "list, 7 items" and every other
 * item would be the word "slash". `role="presentation"` removes the list item
 * from the accessibility tree so the count is right; `aria-hidden` stops the
 * glyph inside it being announced. Removing either one leaves a real defect.
 *
 * `children` is supported so a caller can substitute a different glyph , a
 * slash, a dot , without losing the two attributes.
 */
function BreadcrumbSeparator({ children, className, ...props }: React.ComponentProps<'li'>) {
  return (
    <li
      data-slot="breadcrumb-separator"
      role="presentation"
      aria-hidden
      className={cn('[&>svg]:size-3.5 [&>svg]:shrink-0 rtl:[&>svg]:rotate-180', className)}
      {...props}
    >
      {children ?? <ChevronRightIcon size={14} />}
    </li>
  );
}

/**
 * The collapsed middle of a deep trail.
 *
 * Rendered as a `<span>` inside the caller's `BreadcrumbItem`, not as its own
 * list item, so it occupies the position of the crumbs it stands in for.
 *
 * The `sr-only` text is what makes it mean anything: the glyph itself is
 * `aria-hidden` (every icon in this set is, by default), so without the word an
 * ellipsis crumb is announced as an empty list item. Note that this is the
 * inverse of `BreadcrumbSeparator` , there the element must vanish from the tree
 * entirely, here it must stay and say "More", so this one deliberately carries
 * neither `aria-hidden` nor `role="presentation"`.
 *
 * If the hidden crumbs should be *reachable*, wrap this in a `DropdownMenu`
 * trigger , but then it is a button, and the caller owns that.
 */
function BreadcrumbEllipsis({ className, ...props }: React.ComponentProps<'span'>) {
  return (
    <span
      data-slot="breadcrumb-ellipsis"
      className={cn('flex size-5 items-center justify-center', className)}
      {...props}
    >
      <MoreHorizontalIcon size={16} />
      <span className="sr-only">More</span>
    </span>
  );
}

export {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
  BreadcrumbEllipsis,
};
