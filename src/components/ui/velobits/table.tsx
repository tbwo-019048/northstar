'use client';

import { cn } from '@/lib/utils';

export interface TableProps extends React.ComponentProps<'table'> {
  /**
   * Classes for the scroll wrapper rather than the `<table>` , the only place a
   * surface treatment belongs. See the glass rule in the docblock.
   */
  containerClassName?: string;
  /**
   * The wrapper's material. `glass` (the default) is Tier S , the same
   * `.glass-surface` a `Card` uses, and **never** `.glass-surface-blur`: this
   * wrapper is a scroll container, so a live backdrop layer here re-samples on
   * every scroll frame. `panel` is the opaque fallback, and `none` leaves the
   * wrapper bare for a table already sitting inside a Card or a Dialog , which
   * is the case that matters, because a surface inside a surface is nested
   * glass and both layers cancel.
   */
  surface?: 'glass' | 'panel' | 'none';
}

/**
 * Native `<table>` elements, thinly styled. Not a data grid: sorting, selection
 * and virtualisation live in the feature that renders the rows.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ## THE GLASS RULE: THE CONTAINER MAY BE A SURFACE, A ROW MAY NOT
 *
 * **A `TableRow` must never be glass and must never carry `backdrop-filter`.**
 *
 * `backdrop-filter` is per-element. Fifty rows means fifty blur layers, and each
 * one has to re-sample and re-composite its own slice of the backdrop on every
 * frame the table scrolls , the cost scales with visible rows, so the table gets
 * *worse* the more data it has, which is the opposite of how anyone tests it.
 * Two further consequences make it wrong even when it is fast enough:
 * `backdrop-filter` forms a stacking context on every row (so a row-level
 * `z-index`, e.g. a sticky action column, is scoped to that row and cannot rise
 * above its neighbours), and it establishes a containing block for `position:
 * fixed` descendants (so a fixed-position child of a cell is trapped in the row).
 *
 * The wrapper is also a **scroll container** (`overflow-x-auto`), and glass is
 * forbidden inside a scroll container by `@velobitsio/tokens/glass.css` for the
 * same repaint reason , so if this table sits *inside* a glass Dialog, the glass
 * stops at the Dialog panel.
 *
 * What that leaves: the wrapper carries the surface, and rows use the opaque
 * wash tokens (`--highlight` for hover, `--bg2` for selected) that the
 * implementation below already uses. Those are flat colours , no filter, no
 * compositing layer.
 *
 * Since 2026-08-06 the wrapper does that by DEFAULT (`surface="glass"`) rather
 * than leaving it to `containerClassName` at every call site. It is Tier S
 * without the blur, for the reason above , a scroll container is the one place
 * `.glass-surface-blur` must never appear, and `glass.css` forbids it.
 *
 * **Pass `surface="none"` for a table already inside a Card or a Dialog.** That
 * is nested glass: the inner surface composites over the outer one and the two
 * land ~2/255 apart, so the table shell vanishes and the Card looks like it has
 * a hole in it.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * ## `caption-bottom`
 *
 * The `<caption>` is the table's accessible name, and it is the first thing a
 * screen reader announces regardless of where it is painted , so rendering it
 * below the data costs nothing semantically and keeps a visible caption from
 * competing with the page heading above the table.
 */
function Table({ className, containerClassName, surface = 'glass', ...props }: TableProps) {
  return (
    <div
      data-slot="table-container"
      className={cn(
        'relative w-full overflow-x-auto',
        surface === 'glass' && 'glass-surface rounded-xl',
        surface === 'panel' && 'rounded-xl border border-border bg-panel shadow-sm',
        containerClassName,
      )}
    >
      <table
        data-slot="table"
        className={cn('w-full caption-bottom text-sm', className)}
        {...props}
      />
    </div>
  );
}

function TableHeader({ className, ...props }: React.ComponentProps<'thead'>) {
  return (
    <thead
      data-slot="table-header"
      className={cn('[&_tr]:border-b [&_tr]:border-border', className)}
      {...props}
    />
  );
}

function TableBody({ className, ...props }: React.ComponentProps<'tbody'>) {
  return (
    <tbody
      data-slot="table-body"
      className={cn('[&_tr:last-child]:border-0', className)}
      {...props}
    />
  );
}

function TableFooter({ className, ...props }: React.ComponentProps<'tfoot'>) {
  return (
    <tfoot
      data-slot="table-footer"
      className={cn(
        'border-t border-border bg-bg2/50 font-medium [&>tr]:last:border-b-0',
        className,
      )}
      {...props}
    />
  );
}

/**
 * Opaque washes only, by design , see the glass rule on `Table`.
 *
 * `--highlight` is the system's hover wash (a 5–6% ink/paper overlay) and
 * `--bg2` the selected surface; both are flat colours, so a row costs one paint
 * of one rectangle and creates no compositing layer. `transition-colors` rather
 * than `transition-all` keeps it that way even if a caller adds a layout utility
 * through `className`.
 *
 * `has-aria-expanded:` matches the dashboard app's behaviour of keeping a row
 * washed while the detail panel it opened is on screen, so the row you are reading
 * about stays findable.
 */
function TableRow({ className, ...props }: React.ComponentProps<'tr'>) {
  return (
    <tr
      data-slot="table-row"
      className={cn(
        'border-b border-border',
        'transition-colors duration-micro ease-out',
        'hover:bg-highlight has-aria-expanded:bg-highlight data-[state=selected]:bg-bg2',
        className,
      )}
      {...props}
    />
  );
}

/**
 * `scope="col"` by default rather than relying on the implicit scope a `<th>` in
 * a `<thead>` gets. The implicit rule is real HTML but assistive tech applies it
 * unevenly once a table has a footer, a caption, or cells that span , and the
 * failure mode is a screen reader reading the wrong column name for every cell in
 * a row, which nobody notices visually.
 *
 * A `<th>` that heads a *row* rather than a column must pass `scope="row"`
 * explicitly; the prop spread below lets it override.
 *
 * `text-start` and `pe-0` rather than `text-left` / `pr-0`: both are logical, so
 * a table under `dir="rtl"` needs no variant.
 */
function TableHead({ className, scope = 'col', ...props }: React.ComponentProps<'th'>) {
  return (
    <th
      data-slot="table-head"
      scope={scope}
      className={cn(
        'h-10 px-2 text-start align-middle font-medium whitespace-nowrap text-fg',
        '[&:has([role=checkbox])]:pe-0 [&>[role=checkbox]]:translate-y-[2px]',
        className,
      )}
      {...props}
    />
  );
}

function TableCell({ className, ...props }: React.ComponentProps<'td'>) {
  return (
    <td
      data-slot="table-cell"
      className={cn(
        'p-2 align-middle whitespace-nowrap',
        '[&:has([role=checkbox])]:pe-0 [&>[role=checkbox]]:translate-y-[2px]',
        className,
      )}
      {...props}
    />
  );
}

/**
 * The table's accessible name. Not optional in practice: a data table with no
 * caption and no `aria-label` is announced as "table" with a row and column
 * count, which tells a screen-reader user nothing about which of the three tables
 * on the page they landed in.
 */
function TableCaption({ className, ...props }: React.ComponentProps<'caption'>) {
  return (
    <caption
      data-slot="table-caption"
      className={cn('mt-4 text-sm text-muted-foreground', className)}
      {...props}
    />
  );
}

export { Table, TableHeader, TableBody, TableFooter, TableHead, TableRow, TableCell, TableCaption };
