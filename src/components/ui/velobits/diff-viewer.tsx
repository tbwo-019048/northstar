'use client';

import { cn } from '@/lib/utils';

export type DiffKind = 'same' | 'added' | 'removed';

export interface DiffLine {
  kind: DiffKind;
  text: string;
}

/**
 * A unified line diff , what changed between two versions of a config payload.
 *
 * ```tsx
 * <DiffViewer lines={diffLines(prettyJson(before), prettyJson(after))} label="Config v3 → v4" />
 * ```
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ## GREEN AND RED ARE THE THIRD CHANNEL HERE, NOT THE FIRST
 *
 * The version this replaces distinguished added from removed with a green wash,
 * a red wash and a line-through. That is one-and-a-half channels: the washes are
 * indistinguishable to a red/green-deficient reader, and `line-through` marks
 * removals but leaves additions and unchanged lines identical.
 *
 * So every line carries a **`+` / `−` gutter marker**, which is the convention
 * every diff tool uses and the only channel that survives greyscale, colour
 * deficiency, and a screenshot pasted into a ticket. The washes stay, because
 * for everyone else they are the fastest possible scan.
 *
 * The gutter is `select-none`, so copying the diff yields the code and not a
 * column of punctuation , the thing that makes hand-marked diffs annoying to
 * reuse.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * ## What a screen reader gets
 *
 * A per-line `sr-only` "Added"/"Removed" would be intolerable , a 200-line diff
 * would announce the word "same" 190 times. Instead:
 *
 *  - the region is labelled and carries a **counted summary** ("3 lines added,
 *    1 removed"), which is the part a non-visual reader actually wants first;
 *  - the `+` and `−` markers are real text, not `aria-hidden`, so a line that
 *    changed still announces as changed when read in sequence. Unchanged lines
 *    get a non-breaking space, which announces as nothing.
 *
 * ## Wrapping is off, and that is not laziness
 *
 * Lines scroll horizontally instead of wrapping, because a wrapped line breaks
 * the one-line-one-change correspondence the gutter depends on: a soft-wrapped
 * continuation has no marker, so it reads as an unchanged line inside a change.
 * The container is focusable so the horizontal scroll is reachable by keyboard.
 */
export interface DiffViewerProps extends Omit<React.ComponentProps<'div'>, 'children'> {
  lines: readonly DiffLine[];
  /** Names the region. Set it when a page shows more than one diff. */
  label?: string;
  /** Hide the counted summary. It stays in the accessibility tree regardless. */
  hideSummary?: boolean;
}

const LINE_STYLES: Record<DiffKind, string> = {
  /**
   * `bg-*-soft` is an α 0.10–0.16 wash, so it tints whatever surface the diff
   * sits on rather than replacing it , correct here, and the reason these are
   * safe on a line where they would flatten a glass component.
   */
  added: 'bg-success-soft',
  removed: 'bg-danger-soft line-through decoration-danger/60',
  same: 'text-muted-foreground',
};

const MARKERS: Record<DiffKind, string> = {
  added: '+',
  // U+2212 MINUS SIGN, not a hyphen: it renders at the same width and vertical
  // position as `+` in a monospace face, where `-` sits low and short.
  removed: '−',
  // U+00A0 NO-BREAK SPACE, written as an escape so it cannot be mistaken for an
  // ordinary space and "tidied" away by a formatter or a careless edit. It holds
  // the gutter's width and announces as nothing.
  same: '\u00A0',
};

function DiffViewer({ lines, label, hideSummary = false, className, ...props }: DiffViewerProps) {
  const added = lines.filter((l) => l.kind === 'added').length;
  const removed = lines.filter((l) => l.kind === 'removed').length;
  const summary = `${added} ${added === 1 ? 'line' : 'lines'} added, ${removed} removed`;

  return (
    <div
      data-slot="diff-viewer"
      role="region"
      // The summary is folded into the region's own name, so it is announced on
      // arrival rather than only if the user reads down to it.
      aria-label={label ? `${label}. ${summary}` : summary}
      // The region scrolls in both axes, so it must be reachable by keyboard
      // (WCAG 2.1.1). axe calls this `scrollable-region-focusable`; it needs real
      // layout to detect, so nothing in a unit test will catch its absence.
      tabIndex={0}
      className={cn(
        'max-h-72 overflow-auto rounded-md border border-border bg-panel',
        'font-mono text-xs leading-relaxed',
        'outline-none focus-visible:ring-[3px] focus-visible:ring-ring/40',
        className,
      )}
      {...props}
    >
      {!hideSummary && (
        <p
          data-slot="diff-viewer-summary"
          // Already in the region's accessible name above; announcing it twice
          // is the more common bug than announcing it never.
          aria-hidden
          className="sticky top-0 z-raised m-0 border-b border-border bg-bg2 px-2 py-1 font-sans text-[11px] font-medium text-muted-foreground"
        >
          {summary}
        </p>
      )}

      {lines.map((line, index) => (
        <div
          // Index keys, deliberately: a diff is a positional rendering of an
          // immutable pair of inputs, and two identical lines are genuinely
          // interchangeable. There is nothing stateful in a row to mis-associate.
          key={index}
          data-slot="diff-line"
          data-kind={line.kind}
          className={cn('flex gap-2 px-2 whitespace-pre', LINE_STYLES[line.kind])}
        >
          <span
            data-slot="diff-marker"
            // NOT aria-hidden , see the docblock. `select-none` so a copied diff
            // is pasteable code rather than code with a punctuation column.
            className="w-2 shrink-0 select-none opacity-70"
          >
            {MARKERS[line.kind]}
          </span>
          <span>{line.text}</span>
        </div>
      ))}
    </div>
  );
}

/**
 * A line diff by longest common subsequence.
 *
 * Shipped alongside the viewer for the same reason `paginationRange` ships
 * alongside `Pagination`: it is pure, it is the part that is easy to get subtly
 * wrong, and a diff viewer that cannot diff is half a component. It is also the
 * whole of what the consumer's local `diff.ts` does, so that file goes away.
 *
 * ## The guard is not optional
 *
 * LCS is O(n·m) in time **and memory** , the table is `n × m` numbers. Two
 * 5,000-line inputs is 25 million array slots, which is not slow so much as it is
 * several hundred megabytes allocated synchronously on the main thread, and the
 * tab dies rather than lags. Config payloads are small and this never fires in
 * practice; the guard exists because "never in practice" is where the pathological
 * input eventually arrives, and degrading to a whole-block replace is both honest
 * and instant.
 */
export function diffLines(before: string, after: string, maxLines = 2000): DiffLine[] {
  const a = before.split('\n');
  const b = after.split('\n');

  if (a.length > maxLines || b.length > maxLines) {
    return [
      ...a.map((text): DiffLine => ({ kind: 'removed', text })),
      ...b.map((text): DiffLine => ({ kind: 'added', text })),
    ];
  }

  // lcs[i][j] = length of the longest common subsequence of a[i…] and b[j…].
  // Built backwards so the walk below can go forwards and emit in order.
  const lcs: number[][] = Array.from({ length: a.length + 1 }, () =>
    new Array<number>(b.length + 1).fill(0),
  );
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      lcs[i]![j] =
        a[i] === b[j] ? lcs[i + 1]![j + 1]! + 1 : Math.max(lcs[i + 1]![j]!, lcs[i]![j + 1]!);
    }
  }

  const out: DiffLine[] = [];
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      out.push({ kind: 'same', text: a[i]! });
      i++;
      j++;
    } else if (lcs[i + 1]![j]! >= lcs[i]![j + 1]!) {
      // Ties break toward `removed` first, so a replaced line reads as
      // "− old" then "+ new" rather than the reverse. Cosmetic, and the
      // convention every other diff tool follows.
      out.push({ kind: 'removed', text: a[i]! });
      i++;
    } else {
      out.push({ kind: 'added', text: b[j]! });
      j++;
    }
  }
  while (i < a.length) out.push({ kind: 'removed', text: a[i++]! });
  while (j < b.length) out.push({ kind: 'added', text: b[j++]! });
  return out;
}

export { DiffViewer };
