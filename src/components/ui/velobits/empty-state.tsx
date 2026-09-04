'use client';

import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

/**
 * The "there is nothing here" panel: an optional glyph, a short title, a line of
 * explanation, and the one action that resolves it.
 *
 * Hand-rolled in the dashboard app's flag, audit, search and home surfaces, four
 * times, with four different paddings. This is that component, generalised.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ## THREE DIFFERENT THINGS LOOK LIKE AN EMPTY STATE. THEY ARE NOT.
 *
 * The distinction is not cosmetic , it decides what the user should do next, and
 * getting it wrong is how "your filter matched nothing" comes to read as "you
 * have no data", after which people go and create a duplicate of a record they
 * already own.
 *
 *  1. **First run** , the collection has never had anything in it. The action is
 *     *create the first one*, and this is the only case that should explain what
 *     the thing IS.
 *  2. **Filtered to nothing** , the collection has rows; this query does not
 *     match them. The action is *clear the filter*, never *create*. Say what was
 *     searched for.
 *  3. **Failed to load** , an error wearing an empty state's clothes. This is an
 *     `Alert`, not an `EmptyState`; it needs a retry and it must not imply the
 *     collection is empty, because nobody knows whether it is.
 *
 * The component cannot tell these apart, so it does not try. What it does is
 * make all three cheap to write, so there is no incentive to reuse one for
 * another.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * ## The title is a paragraph unless you say otherwise
 *
 * `headingLevel` is undefined by default and the title renders as a `<p>`.
 *
 * That is deliberate and it is the opposite of the usual advice. An `EmptyState`
 * is nearly always the body of a `Card`, `Panel` or table that already carries a
 * heading naming the same collection , so promoting the title would put two
 * headings in a row saying almost the same thing, and heading-navigation would
 * land on the useless one. Pass `headingLevel` when the empty state is the whole
 * page (the state the flags surface shows a brand-new project), because there a
 * document with no heading at all is the worse failure.
 *
 * Same reasoning, and the same prop, as `AccordionTrigger`.
 *
 * ## `icon` takes an element, not a component type
 *
 * ```tsx
 * <EmptyState icon={<FlagIcon />} title="No flags yet" />
 * ```
 *
 * The dashboard app's version takes `ComponentType<IconProps>` and renders it at
 * a fixed `size={22}`. An element is passed here instead, for two reasons: an
 * empty state's glyph is quite often not an icon at all (an illustration, an
 * avatar stack, a spinner for a collection still loading), and the sizing rule
 * below is the system's existing idiom for this , the same
 * `[&_svg:not([class*='size-'])]` escape hatch `Button` and `Badge` use, so a
 * caller who wants a different size just says so on the icon.
 *
 * **This is a call-site change at migration** (`icon={Icon}` → `icon={<Icon />}`),
 * and it is the reason this file is not a drop-in replacement.
 */
const emptyStateVariants = cva('flex flex-col items-center text-center', {
  variants: {
    size: {
      /** Page- or panel-sized. The default, and what a table body wants. */
      default: 'gap-2 px-6 py-12',
      /** For a small well , a card body, a popover, an empty sub-list. */
      compact: 'gap-1.5 px-4 py-6',
    },
  },
  defaultVariants: { size: 'default' },
});

export interface EmptyStateProps
  extends Omit<React.ComponentProps<'div'>, 'title'>, VariantProps<typeof emptyStateVariants> {
  /**
   * A glyph above the title. Rendered `aria-hidden` , see the note on the slot
   * below; it is decoration, and the title already says what this is.
   */
  icon?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  /** The one action that resolves the state. Keep it to one. */
  action?: React.ReactNode;
  /**
   * Promote the title to a heading, so it joins the document outline. Leave
   * unset inside a container that already has a heading , see the docblock.
   */
  headingLevel?: 2 | 3 | 4;
  /**
   * Supplemental content below the action , the "what happens next" list a
   * first-run state shows. Below the button rather than above it, so someone who
   * already knows what they are creating never reads past the thing they came to
   * click.
   */
  children?: React.ReactNode;
  /**
   * The material behind the state. **Defaults to `none`, and that default is
   * deliberate , it is the odd one out among the surface-bearing components.**
   *
   * `Table`, `Accordion` and `Card` all default to `glass` because they are
   * normally the outermost thing on a page. An EmptyState almost never is: the
   * `default` size exists for a table body, and `compact` is documented for a
   * card body, a popover, an empty sub-list. Every one of those is already a
   * glass surface, and glass inside glass composites ~2/255 apart , both layers
   * disappear and the caller sees a bug they cannot explain.
   *
   * Pass `surface="glass"` for the case that genuinely wants it: a page-level
   * first-run state sitting directly on `--bg` with no container around it.
   */
  surface?: 'glass' | 'panel' | 'none';
}

function EmptyState({
  className,
  size,
  icon,
  title,
  description,
  action,
  headingLevel,
  children,
  surface = 'none',
  ...props
}: EmptyStateProps) {
  const Title = headingLevel ? (`h${headingLevel}` as 'h2' | 'h3' | 'h4') : 'p';

  return (
    <div
      data-slot="empty-state"
      className={cn(
        emptyStateVariants({ size }),
        surface === 'glass' && 'glass-surface rounded-xl',
        surface === 'panel' && 'rounded-xl border border-border bg-panel shadow-sm',
        className,
      )}
      {...props}
    >
      {icon && (
        /**
         * `aria-hidden` on the wrapper rather than trusting the caller's icon to
         * carry it. Every glyph in this component is redundant with the title
         * beside it, so announcing it can only produce noise , and the failure
         * mode when it is missed ("flag, No flags yet") is invisible on screen.
         *
         * The sizing rule is the system's standard escape hatch: a caller who
         * writes `<FlagIcon size={40} />` gets 40, because `size` renders a
         * `size-*` class the `:not()` excludes.
         */
        <span
          aria-hidden
          data-slot="empty-state-icon"
          className={cn(
            'mb-1 flex items-center justify-center text-muted-foreground',
            "[&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-6",
          )}
        >
          {icon}
        </span>
      )}

      <Title data-slot="empty-state-title" className="m-0 text-sm font-semibold text-fg">
        {title}
      </Title>

      {description && (
        /**
         * `max-w-md` caps the measure. An empty state is centred, and centred
         * text is markedly harder to read as the line gets longer , there is no
         * fixed left edge for the eye to return to.
         */
        <p
          data-slot="empty-state-description"
          className="m-0 max-w-md text-[13px] leading-relaxed text-muted-foreground"
        >
          {description}
        </p>
      )}

      {action && (
        <div data-slot="empty-state-action" className="mt-2 flex items-center gap-2">
          {action}
        </div>
      )}

      {children}
    </div>
  );
}

export { EmptyState, emptyStateVariants };
