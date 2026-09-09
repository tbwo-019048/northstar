/** Drop rows flagged `hidden` unless diagnostic mode is on. */
export function visibleRows<T extends { hidden?: boolean | null }>(
  rows: T[],
  diagnostic: boolean,
): T[] {
  return diagnostic ? rows : rows.filter((r) => !r.hidden)
}
