'use client';

import { useCallback, useMemo, useRef, useState } from 'react';

/** Shared, so the overwhelmingly common "nothing selected" case never re-identifies. */
const EMPTY: ReadonlySet<string> = new Set<string>();

export interface RowSelection {
  /** Selected ids, restricted to the rows currently rendered. */
  selectedIds: ReadonlySet<string>;
  /** `selectedIds.size`. What a bulk bar counts. */
  count: number;
  /** Every row on screen is selected, and there is at least one. */
  allSelected: boolean;
  /** Some but not all , the header checkbox's indeterminate state. */
  someSelected: boolean;
  isSelected: (id: string) => boolean;
  toggle: (id: string) => void;
  /** Select every row on screen, or clear them if they already are. */
  toggleAll: () => void;
  clear: () => void;
}

/**
 * Row selection for `DataTable` , the state half of bulk operations.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ## THE SELECTION IS DERIVED, NOT STORED
 *
 * The hook keeps the raw set of ids the user has clicked, and every reader gets
 * that set **intersected with the rows currently on screen**.
 *
 * That is the whole design, and it exists because a bulk action must never point
 * at something invisible. "Disable 12 flags" has to mean the twelve you can see
 * and count , not twelve minus the four the filter just hid, and certainly not
 * twelve including one the server deleted.
 *
 * The obvious alternative , prune the stored set in an effect whenever the row
 * list changes , leaves a window between the filter narrowing and the effect
 * running, during which the bar shows a stale count and a click acts on rows
 * that are gone. Deriving closes the window rather than making it small.
 *
 * The raw set is deliberately NOT pruned, so a row that comes back into the
 * result set (the filter is cleared, "show more" is pressed) returns still
 * ticked. Selection survives you looking elsewhere; it does not survive being
 * told the row no longer exists.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * ## Identity tracks content, and that is load-bearing
 *
 * Deriving per render would hand back a fresh object every time. `DataTable`
 * memoises its rows and this object reaches them, so a hook that re-identified
 * on every keystroke would silently turn that memo into dead code , and a
 * hundred rows, each formatting a date and mounting a switch and a menu, would
 * re-render per character typed into the filter box.
 *
 * So the returned object keeps its identity until the selection actually
 * changes. That costs one `useMemo`, one ref and a set comparison over a list
 * this function already walks.
 *
 * @param rows The rows on screen, in render order. Pass the **windowed page**,
 * not the full filtered list, so "select all" means what the header checkbox
 * physically sits above.
 * @param getId Read per render from a ref, so an inline arrow at the call site
 * does not invalidate anything. Changing what it *returns* for a given row
 * mid-session is not supported , that is a different row.
 */
export function useRowSelection<TRow>(
  rows: readonly TRow[],
  getId: (row: TRow) => string,
): RowSelection {
  const [raw, setRaw] = useState<ReadonlySet<string>>(EMPTY);

  const getIdRef = useRef(getId);
  getIdRef.current = getId;

  const ids = useMemo(() => rows.map((row) => getIdRef.current(row)), [rows]);

  /*
   * Held across renders so an intersection that comes out the same is handed
   * back as the same object. Without it, filtering to a narrower list of rows
   * none of which is selected would still produce a NEW empty Set , and
   * therefore a new context object, and therefore a hundred re-rendered rows
   * for a change that did not happen.
   */
  const previous = useRef<ReadonlySet<string>>(EMPTY);

  const selectedIds = useMemo(() => {
    if (raw.size === 0) return EMPTY;
    const next = ids.filter((id) => raw.has(id));
    const last = previous.current;
    if (next.length === last.size && next.every((id) => last.has(id))) return last;
    const result: ReadonlySet<string> = new Set(next);
    previous.current = result;
    return result;
  }, [ids, raw]);

  const toggle = useCallback((id: string) => {
    setRaw((current) => {
      const next = new Set(current);
      // `delete` returns whether it removed something, so this is one lookup
      // rather than a `has` followed by a branch.
      if (!next.delete(id)) next.add(id);
      return next;
    });
  }, []);

  const allSelected = ids.length > 0 && selectedIds.size === ids.length;

  const toggleAll = useCallback(() => {
    setRaw((current) => {
      const onScreen = ids.filter((id) => current.has(id)).length;
      // Everything on screen is already ticked, so this is a clear , and it
      // clears only what is on screen, leaving an off-screen selection alone.
      if (onScreen === ids.length) {
        const next = new Set(current);
        for (const id of ids) next.delete(id);
        return next;
      }
      return new Set([...current, ...ids]);
    });
  }, [ids]);

  const clear = useCallback(() => setRaw(EMPTY), []);

  /*
   * `allSelected` is a dependency rather than being recomputed inside, because
   * it depends on `ids.length` as well as on the selection: ticking all five
   * rows of a page and then loading five more must stop claiming "all".
   */
  return useMemo(
    () => ({
      selectedIds,
      count: selectedIds.size,
      allSelected,
      someSelected: selectedIds.size > 0 && !allSelected,
      isSelected: (id: string) => selectedIds.has(id),
      toggle,
      toggleAll,
      clear,
    }),
    [selectedIds, allSelected, toggle, toggleAll, clear],
  );
}
