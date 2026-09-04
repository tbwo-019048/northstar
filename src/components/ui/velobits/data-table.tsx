'use client';

import { memo, useMemo } from 'react';

import { ArrowDownIcon, ArrowUpDownIcon } from '@velobitsio/icons';

import { cn } from '@/lib/utils';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  type TableProps,
} from './table';

/**
 * A sortable, selectable, activatable table built from a **column registry**.
 *
 * ```tsx
 * const columns: DataTableColumn<Flag, Ctx>[] = [
 *   { id: 'key', header: 'Key', sortKey: 'key', cell: (f) => <code>{f.key}</code> },
 *   { id: 'state', header: 'State', sortKey: 'state', cell: (f) => <StatusChip status={f.status} /> },
 *   { id: 'toggle', header: '', interactive: true, cell: (f, c) => <Switch onCheckedChange={…} /> },
 * ];
 *
 * <DataTable
 *   label="Flags in Production"
 *   columns={columns}
 *   rows={page}
 *   rowKey={(f) => f.id}
 *   context={ctx}
 *   sort={sort}
 *   onSortChange={setSort}
 *   onRowActivate={openDetail}
 *   rowLabel={(f) => f.key}
 *   empty={<EmptyState title="No flags match this filter" … />}
 * />
 * ```
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ## WHY THIS IS NOT TANSTACK TABLE
 *
 * A deliberate choice, not an omission. TanStack is excellent and it is the
 * right answer for pivoting, grouping, faceted filters and column resizing ,
 * none of which any VeloBits surface does. What our tables actually need is a
 * list of columns, a sort key, a selection set and a row click.
 *
 * Against that, a headless table engine costs a ~14 kB dependency, a second
 * mental model for "what is a column", and a rewrite of the column definitions
 * that already exist and already work. The registry shape below is lifted from
 * the dashboard app's flags table, which arrived at it independently , so
 * adopting it is a move, not a migration.
 *
 * If a surface ever genuinely needs grouping or virtualisation, that surface
 * should use TanStack directly on top of `Table`. This component does not need
 * to grow into it.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * ## The four things a hand-rolled version gets wrong
 *
 *  1. **`aria-sort` on the `<th>`, not on the sort button.** The attribute
 *     describes the column, and assistive tech reads it from the header cell. On
 *     the button it is silently ignored , the visual arrow works, the
 *     announcement does not, and nothing anywhere reports a problem.
 *  2. **A clickable `<tr>` is mouse-only.** See `onRowActivate` below.
 *  3. **Interactive cells must swallow the click**, or flipping a switch also
 *     opens the row. Declared per column in the registry rather than inside each
 *     control, so a new interactive column cannot forget.
 *  4. **An empty `<tbody>` is not an empty state.** It announces as a table with
 *     zero rows and reads as broken. `empty` renders a real spanning cell.
 */

export interface SortState {
  key: string;
  dir: 'asc' | 'desc';
}

/**
 * Click a new column → sort it ascending. Click the active column → flip it.
 *
 * Ascending-first is the right default for text and for the "worst first"
 * orderings status columns tend to define; a numeric column that wants
 * largest-first should say so by seeding `sort` itself, not by inverting this.
 */
export function nextSort(current: SortState, key: string): SortState {
  if (current.key !== key) return { key, dir: 'asc' };
  return { key, dir: current.dir === 'asc' ? 'desc' : 'asc' };
}

export interface DataTableColumn<TRow, TContext = undefined> {
  /** Stable identity. Used as the React key and for nothing else. */
  id: string;
  /**
   * The column's name , and it is a name, not decoration.
   *
   * **Never empty.** A `<th>` with no text is an axe `empty-table-header`
   * violation and, more to the point, a screen reader announcing every cell in
   * that column with no idea what it contains. A column with nothing to *show*
   * in its header , actions, a kebab menu , still has a name: pass it, and set
   * `hideHeader`.
   */
  header: React.ReactNode;
  /**
   * Keep `header` as the accessible name but do not paint it. For the actions
   * column, where a visible "Actions" label is noise above a row of icon
   * buttons.
   */
  hideHeader?: boolean;
  /** The cell body. */
  cell: (row: TRow, context: TContext) => React.ReactNode;
  /**
   * Makes the header a sort control. The value is opaque here , it is passed
   * back through `onSortChange` for the caller to interpret.
   */
  sortKey?: string;
  /**
   * Owns its own header , the select-all checkbox, which has nothing to sort by.
   * Wins over `header` and over the sort button.
   */
  headerCell?: (context: TContext) => React.ReactNode;
  /**
   * This column contains controls. Its cells stop click propagation, so
   * activating a switch, a checkbox or a menu inside them does not also fire
   * `onRowActivate`.
   */
  interactive?: boolean;
  /** Applied to both the `<th>` and every `<td>`, so a width cannot drift. */
  className?: string;
  /** Applied to the `<th>` only. */
  headClassName?: string;
  /** Return false to drop the column , a permission, a narrow viewport, a mode. */
  visible?: (context: TContext) => boolean;
}

export interface DataTableProps<TRow, TContext = undefined> extends Omit<
  React.ComponentProps<'table'>,
  'children'
> {
  columns: readonly DataTableColumn<TRow, TContext>[];
  rows: readonly TRow[];
  rowKey: (row: TRow) => string;
  /**
   * Passed to every `cell`, `headerCell` and `visible` call.
   *
   * **Memoise it.** The rows below are `memo`ised and this object is one of the
   * props they compare, so a fresh object per render makes the memo dead code ,
   * and the symptom is not a bug, it is a filter box that stutters at a hundred
   * rows. This component cannot enforce it; what it can do is not be the reason
   * the comparison fails.
   */
  context: TContext;
  /** Names the table. Rendered as a `<caption>` unless `hideLabel`. */
  label: string;
  /** Keep the caption as the accessible name but do not paint it. */
  hideLabel?: boolean;
  sort?: SortState;
  onSortChange?: (sort: SortState) => void;
  /**
   * Open the row. See the note on keyboard activation below , this makes the
   * `<tr>` focusable and Enter/Space-activatable, which is the *convenience*
   * path; the row should still contain a real link or button.
   */
  onRowActivate?: (row: TRow) => void;
  /** Required alongside `onRowActivate`: the row's accessible name. */
  rowLabel?: (row: TRow) => string;
  /** Draws the row as selected. Pair with `useRowSelection`. */
  isRowSelected?: (row: TRow) => boolean;
  /** Extra classes per row , dimming an archived record, say. */
  rowClassName?: (row: TRow) => string | undefined;
  /** Shown in a spanning cell when `rows` is empty. */
  empty?: React.ReactNode;
  /** Classes for the scroll wrapper. Surface treatment belongs here. */
  containerClassName?: string;
  /**
   * Forwarded to the underlying {@link Table} , `'glass'` (default), `'panel'` or
   * `'none'`.
   *
   * **Pass `'none'` for a DataTable already inside a Card, Dialog or SidePanel.**
   * That is the nested-glass case `glass.css` forbids: the inner surface
   * composites over the outer one, the two land ~2/255 apart, and both stop
   * reading as a material while costing two paints.
   *
   * This existed on `Table` from the start and was missing here, so the one
   * component most likely to be dropped inside a Card was also the one that could
   * not opt out , `surface` is not part of `React.ComponentProps<'table'>`, so it
   * was not reachable through the prop spread either. It is declared explicitly
   * rather than left to `...props` so the compiler can see it.
   */
  surface?: TableProps['surface'];
}

function DataTable<TRow, TContext = undefined>({
  columns,
  rows,
  rowKey,
  context,
  label,
  hideLabel = false,
  sort,
  onSortChange,
  onRowActivate,
  rowLabel,
  isRowSelected,
  rowClassName,
  empty,
  containerClassName,
  surface,
  className,
  ...props
}: DataTableProps<TRow, TContext>) {
  const visible = useMemo(
    () => columns.filter((column) => column.visible?.(context) ?? true),
    [columns, context],
  );

  return (
    <Table
      className={className}
      containerClassName={containerClassName}
      surface={surface}
      {...props}
    >
      {/*
       * The caption IS the accessible name, and it is announced wherever it is
       * painted , so `sr-only` costs nothing semantically. A table with neither
       * a caption nor an aria-label announces as "table, 5 columns, 40 rows",
       * which does not say which of the three tables on the page you are in.
       */}
      <caption className={cn('mt-4 text-sm text-muted-foreground', hideLabel && 'sr-only')}>
        {label}
      </caption>

      {/* Tinted, so the header reads as chrome rather than as a first row. */}
      <TableHeader className="bg-bg2">
        <TableRow className="hover:bg-transparent">
          {visible.map((column) => {
            const active = Boolean(column.sortKey && sort?.key === column.sortKey);
            return (
              <TableHead
                key={column.id}
                className={cn(
                  'text-[11px] font-semibold tracking-wide uppercase text-muted-foreground',
                  column.className,
                  column.headClassName,
                )}
                /*
                 * On the `<th>`, NOT on the button inside it. `aria-sort` is a
                 * property of the column, and AT reads it from the header cell;
                 * on the button it is ignored and the sort state is announced
                 * nowhere, while the arrow glyph keeps working. Omitted rather
                 * than set to "none" on inactive columns , "none" on every other
                 * header is noise, and absent means the same thing.
                 */
                aria-sort={active ? (sort!.dir === 'asc' ? 'ascending' : 'descending') : undefined}
              >
                {column.headerCell ? (
                  column.headerCell(context)
                ) : column.sortKey && onSortChange ? (
                  <button
                    type="button"
                    /*
                     * `border-0 bg-transparent p-0` is required, not tidying. A
                     * consumer whose legacy stylesheet styles bare `button` in
                     * Tailwind's `components` layer renders every column header
                     * as a bordered form control without these three. Size,
                     * colour and letter-spacing are inherited from the `<th>`
                     * rather than repeated, so a sortable head and an unsortable
                     * one cannot drift apart.
                     */
                    className={cn(
                      'flex items-center gap-1 border-0 bg-transparent p-0',
                      'font-semibold uppercase text-inherit',
                      'cursor-pointer transition-colors duration-micro ease-out hover:text-fg',
                      'outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40',
                    )}
                    onClick={() =>
                      onSortChange(nextSort(sort ?? { key: '', dir: 'asc' }, column.sortKey!))
                    }
                  >
                    {column.header}
                    {active ? (
                      <ArrowDownIcon
                        size={12}
                        className={cn(
                          'transition-transform duration-micro ease-out',
                          sort!.dir === 'asc' && 'rotate-180',
                        )}
                      />
                    ) : (
                      <ArrowUpDownIcon size={12} className="opacity-40" />
                    )}
                  </button>
                ) : (
                  // `sr-only`, never an empty `<th>` , see the note on `header`.
                  <span className={column.hideHeader ? 'sr-only' : undefined}>{column.header}</span>
                )}
              </TableHead>
            );
          })}
        </TableRow>
      </TableHeader>

      <TableBody>
        {rows.length === 0
          ? empty && (
              /*
               * A real row with a spanning cell, not an empty tbody. An empty
               * tbody announces as a table with zero rows and looks like a
               * failed render; this way the explanation is IN the table, where
               * someone who just narrowed a filter is already looking.
               */
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={visible.length} className="p-0">
                  {empty}
                </TableCell>
              </TableRow>
            )
          : rows.map((row) => (
              <DataTableRow
                key={rowKey(row)}
                row={row}
                columns={visible}
                context={context}
                selected={isRowSelected?.(row) ?? false}
                onActivate={onRowActivate}
                label={rowLabel?.(row)}
                className={rowClassName?.(row)}
              />
            ))}
      </TableBody>
    </Table>
  );
}

interface DataTableRowProps<TRow, TContext> {
  row: TRow;
  columns: readonly DataTableColumn<TRow, TContext>[];
  context: TContext;
  selected: boolean;
  onActivate?: (row: TRow) => void;
  label?: string;
  className?: string;
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * ## A CLICKABLE `<tr>` IS MOUSE-ONLY UNLESS YOU DO ALL THREE OF THESE
 *
 * `onClick` on a table row is the most common keyboard trap in an admin UI: it
 * works perfectly for everyone testing it with a mouse, and a keyboard user
 * simply cannot open the record. Making it work needs three things together, and
 * two of them have their own trap:
 *
 *  1. **`tabIndex={0}`** so the row can be focused at all. On its own this is
 *     worse than nothing , a focus stop that does nothing when you press Enter.
 *  2. **A keydown handler for Enter and Space**, with `preventDefault` on Space.
 *     Without it, Space scrolls the page: the row activates *and* the viewport
 *     jumps, which reads as a broken navigation.
 *  3. **`event.target === event.currentTarget`.** Without this check, pressing
 *     Space on the row's own checkbox ticks the box AND opens the row, because
 *     the keydown bubbles. This is the one that survives review, because nobody
 *     tests the keyboard path through a cell control.
 *
 * `aria-label` is what turns it into something announceable: a focusable row with
 * no name is read as its full cell contents, which for a nine-column table is a
 * paragraph. Hence `rowLabel` being required alongside `onRowActivate`.
 *
 * **This is still the convenience path, not the primary one.** A row that opens
 * a record should also contain a real `<a>` in its identifying cell , that is
 * what gives middle-click, Cmd-click, "open in new tab", a status-bar URL
 * preview, and a sane experience in a screen reader's link list. The row click
 * is an accelerator layered on top of it.
 * ─────────────────────────────────────────────────────────────────────────────
 */
function DataTableRowBase<TRow, TContext>({
  row,
  columns,
  context,
  selected,
  onActivate,
  label,
  className,
}: DataTableRowProps<TRow, TContext>) {
  const activatable = Boolean(onActivate);

  return (
    <TableRow
      className={cn(activatable && 'cursor-pointer', className)}
      /*
       * Reuses `table.tsx`'s own `data-[state=selected]` wash rather than adding
       * a second class for the same idea, so a selected row here and a selected
       * row anywhere else tint identically.
       */
      data-state={selected ? 'selected' : undefined}
      /*
       * No `aria-selected` here, deliberately. This is a `table`, not a `grid`:
       * row selection is not a table-level concept, and the accessible truth
       * about whether a row is selected already exists , it is the checkbox in
       * the select column, which announces checked. Adding `aria-selected`
       * would state the same fact twice, in a role context where screen readers
       * handle it inconsistently, and the two could then disagree.
       */
      tabIndex={activatable ? 0 : undefined}
      aria-label={activatable ? label : undefined}
      onClick={activatable ? () => onActivate!(row) : undefined}
      onKeyDown={
        activatable
          ? (event) => {
              // See trap 3: without this, Space on a cell checkbox both ticks
              // the box and opens the row.
              if (event.target !== event.currentTarget) return;
              if (event.key !== 'Enter' && event.key !== ' ') return;
              // See trap 2: Space would otherwise also scroll the page.
              event.preventDefault();
              onActivate!(row);
            }
          : undefined
      }
    >
      {columns.map((column) => (
        <TableCell
          key={column.id}
          className={column.className}
          onClick={column.interactive ? (event) => event.stopPropagation() : undefined}
        >
          {column.cell(row, context)}
        </TableCell>
      ))}
    </TableRow>
  );
}

/**
 * Memoised, and it is the difference between a usable filter box and a stuttering
 * one.
 *
 * A toolbar search re-derives the filtered list on every keystroke. Without this,
 * each character re-renders every visible row , and a row is not cheap: it
 * formats a timestamp, mounts a switch, a tooltip and a Radix menu.
 *
 * It only bites while `context` keeps its identity between renders, which is the
 * caller's job. See the note on the `context` prop.
 *
 * The cast preserves the generic signature through `memo`, which otherwise widens
 * the component to its constraint and loses per-row type inference at the call
 * site.
 */
const DataTableRow = memo(DataTableRowBase) as typeof DataTableRowBase;

export { DataTable };
