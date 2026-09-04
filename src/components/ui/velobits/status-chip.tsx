'use client';

import {
  ArchiveIcon,
  CircleCheckIcon,
  CircleHalfIcon,
  CircleSlashIcon,
  ClockIcon,
  type Icon,
} from '@velobitsio/icons';

import { cn } from '@/lib/utils';
import { Badge, type BadgeProps } from './badge';

/**
 * A row's state, as one small chip: an icon, a colour and a word.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ## THE ICON IS NOT DECORATION. IT IS THE SECOND CHANNEL.
 *
 * On and off are encoded here as green and red. Around 8% of men have a
 * red/green deficiency, so for one reader in twelve a colour-only chip conveys
 * *nothing* , and on-versus-off is the single most consequential distinction a
 * control plane makes. WCAG 1.4.1 is the rule; this is the case it was written
 * for.
 *
 * So every status ships a **distinct glyph**, and the glyphs are distinguishable
 * in silhouette rather than by fill: a tick, a barred circle, a half-filled
 * circle, a clock, a box. The text label is the third channel, which is why
 * there is no icon-only mode: a chip that renders as a bare coloured dot is
 * exactly the thing this component exists to stop people writing.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * ## It composes `Badge` rather than re-deriving the palette
 *
 * The hand-rolled version in the dashboard app writes `bg-*-soft text-*` pairs
 * inline. Those pairs are already `Badge`'s variants and are already gated, so
 * this maps status → variant and stops. The gate includes the composite: at
 * 12px the 4.5:1 target applies, and each text-over-wash pairing is measured
 * flattened over the page, the panel and the tier-S glass surface in both
 * themes , the soft-chip suite in `@velobitsio/tokens`. The token re-tune
 * that made those composites pass landed for `Badge` and this component at the
 * same time, precisely because there is only one set of values.
 *
 * ## The DOM text is sentence case; the uppercase is CSS
 *
 * `<StatusChip status="on" />` renders the text `On` and paints it `ON`.
 *
 * Literal `"ON"` in the DOM is what the hand-rolled version does, and some
 * screen readers spell a short all-caps token letter by letter , "oh en". A
 * `text-transform` changes only the glyphs, so the accessible name stays the
 * word. Free correctness; the visual result is identical.
 */
export type Status = 'on' | 'off' | 'partial' | 'pending' | 'archived';

const PRESENTATION: Record<
  Status,
  { icon: Icon; variant: NonNullable<BadgeProps['variant']>; label: string }
> = {
  on: { icon: CircleCheckIcon, variant: 'success', label: 'On' },
  off: { icon: CircleSlashIcon, variant: 'danger', label: 'Off' },
  /** A rollout, a partial deploy, a half-applied migration. */
  partial: { icon: CircleHalfIcon, variant: 'warning', label: 'Partial' },
  /** Queued, scheduled, awaiting approval , not yet in effect either way. */
  pending: { icon: ClockIcon, variant: 'info', label: 'Pending' },
  /**
   * Deliberately `neutral`, not a colour. Archived is not a *state of the
   * thing*, it is a statement that the thing is no longer live , giving it a
   * status colour would put it on the same axis as on/off and invite the reading
   * "archived, and also somehow off".
   */
  archived: { icon: ArchiveIcon, variant: 'neutral', label: 'Archived' },
};

/**
 * Sort order, exported because a status column has to sort by something and
 * alphabetical is meaningless here.
 *
 * `off` first: someone opening a list during an incident is looking for what is
 * switched off. `archived` last, because it is not a live state at all.
 */
export const STATUS_ORDER: Record<Status, number> = {
  off: 0,
  partial: 1,
  pending: 2,
  on: 3,
  archived: 4,
};

export interface StatusChipProps extends Omit<BadgeProps, 'variant' | 'children'> {
  status: Status;
  /**
   * Replaces the default word. The case for it: a partial rollout should read
   * `25%`, which is strictly more information than `Partial` in the same space.
   *
   * Whatever is passed still has to *say the state* , this is a label override,
   * not a slot for extra content.
   */
  children?: React.ReactNode;
}

function StatusChip({ status, children, className, ...props }: StatusChipProps) {
  const { icon: StatusIcon, variant, label } = PRESENTATION[status];

  return (
    <Badge
      data-slot="status-chip"
      data-status={status}
      variant={variant}
      className={cn(
        // `tabular-nums` so a percentage does not change width as it counts:
        // proportional digits make a column of chips ripple on every poll.
        'gap-1 px-1.5 font-semibold uppercase tabular-nums',
        className,
      )}
      {...props}
    >
      {/*
       * Left decorative , `createIcon` already sets `aria-hidden`, and that is
       * correct here rather than something to override: the label beside it
       * carries the meaning. The glyph is the second channel for *sighted*
       * readers with a colour deficiency, not a third announcement.
       *
       * 11px rather than Badge's default 12: at this weight the glyph otherwise
       * out-measures the cap height of the text next to it and the chip reads
       * icon-first.
       */}
      <StatusIcon size={11} />
      {children ?? label}
    </Badge>
  );
}

export { StatusChip };
