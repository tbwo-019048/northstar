'use client';

import { DropdownMenu as DropdownMenuPrimitive } from 'radix-ui';

import { CheckIcon, ChevronRightIcon, DotIcon } from '@velobitsio/icons';

import { cn } from '@/lib/utils';

/**
 * Radix DropdownMenu on the glass overlay tier , the kebab/actions menu every
 * table row and topbar in these dashboards reaches for.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * THREE REFUSALS THIS COMPONENT TREATS AS RULES, NOT PREFERENCES. All three were
 * paid for once already.
 *
 * ## 1. Highlight styling is `data-[highlighted]`, never `:hover`
 *
 * Radix funnels the pointer path and the keyboard path into ONE thing. On
 * `pointermove` it calls `item.focus()`; arrow keys move focus through the
 * roving-focus group; and `MenuItemImpl` mirrors that focus state onto
 * `data-highlighted`. So the attribute is the single hook that covers both.
 *
 * Style `hover:bg-*` instead and the menu looks perfect with a mouse and is
 * completely invisible to the keyboard: the arrows still work, the attribute
 * still flips, nothing appears to move, and the user has no idea what Enter will
 * activate. That is the regression that actually shipped once. If you ever see a
 * `hover:` on a menu item below, it is a bug, not a preference.
 *
 * Consumers' suites assert on `data-highlighted` too, so this is also a
 * published contract rather than an internal detail.
 *
 * ## 2. A DropdownMenu CANNOT host a text input. Do not retry this.
 *
 * A filter/search field inside the menu loses focus on the first keystroke: the
 * content's focus management pulls focus back to the item list, and typing is
 * additionally swallowed by Radix's typeahead. The only lever that would hold
 * focus is `onOpenAutoFocus` , which is a **private, unsupported escape hatch on
 * this primitive** and is not part of its public contract, so building on it is
 * building on something that can vanish in a patch release.
 *
 *   → Need a filterable list? Use a **Dialog** (or `CommandPalette`, which is a
 *     Dialog underneath) or a **Popover**. Both are designed to contain focus
 *     rather than manage it, so an input inside them behaves normally.
 *
 * This is the same conclusion the dashboard app reached when it tried to put an
 * environment filter in a DropdownMenu and shipped a Dialog instead.
 *
 * ## 3. Testing: `keyDown Enter`, not `click` , and Playwright cannot do it
 *
 * Modal menu content wraps itself in a `DismissableLayer` with
 * `disableOutsidePointerEvents`, which sets `pointer-events: none` on
 * `document.body`. `userEvent` v14 refuses to click anything that inherits that
 * and THROWS ("unable to perform pointer interaction as the element has
 * `pointer-events: none`") rather than failing an assertion , so the failure does
 * not look like a menu problem at all.
 *
 * Drive items with `fireEvent.keyDown(item, { key: 'Enter' })`, which is also
 * closer to how a menu is actually operated. (Radix's own handler responds to
 * Enter/Space by calling `currentTarget.click()`, so `onSelect` fires exactly as
 * it would for a real user.)
 *
 * Playwright cannot reliably click these either: the content is portalled to
 * `document.body` outside the trigger's subtree, and Radix's dismiss layer
 * intercepts the pointer sequence Playwright synthesises. Assert menu behaviour
 * in unit tests; in e2e, assert only that the menu opened.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * ## Layering
 *
 * The content sits at `z-dropdown` (1000), which is above `z-sticky` (100). A
 * sticky topbar raised to 1100 "to be safe" swallows its own menu , see the
 * z-ladder note in `@velobitsio/tokens/theme.css`.
 *
 * Submenus use `glass glass-elevated`, the plum-tinted tier, because a plain
 * glass panel over another plain glass panel composites to a single indistinct
 * smear. That is also why the tier exists.
 */
function DropdownMenu({ ...props }: React.ComponentProps<typeof DropdownMenuPrimitive.Root>) {
  return <DropdownMenuPrimitive.Root data-slot="dropdown-menu" {...props} />;
}

function DropdownMenuPortal({
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Portal>) {
  return <DropdownMenuPrimitive.Portal data-slot="dropdown-menu-portal" {...props} />;
}

function DropdownMenuTrigger({
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Trigger>) {
  return <DropdownMenuPrimitive.Trigger data-slot="dropdown-menu-trigger" {...props} />;
}

/**
 * Enter/exit animate `opacity` and `transform` only. Never add a blur-radius
 * transition here: `backdrop-filter` re-rasterises the whole backdrop on every
 * frame, and a 240ms blur tween on a menu is a measurable jank source on the
 * tables these menus hang off.
 */
function DropdownMenuContent({
  className,
  sideOffset = 6,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Content>) {
  return (
    <DropdownMenuPrimitive.Portal>
      <DropdownMenuPrimitive.Content
        data-slot="dropdown-menu-content"
        sideOffset={sideOffset}
        className={cn(
          'glass z-dropdown min-w-32 rounded-lg p-1 text-sm text-fg',
          // A long menu scrolls inside itself rather than off-screen. Radix
          // publishes the space it actually has after collision detection.
          'max-h-(--radix-dropdown-menu-content-available-height) overflow-x-hidden overflow-y-auto',
          // Scale from the edge nearest the trigger, so the menu appears to come
          // out of the button rather than out of the middle of the screen.
          'origin-(--radix-dropdown-menu-content-transform-origin)',
          'duration-enter ease-out',
          'data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95',
          'data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95',
          'data-[side=bottom]:slide-in-from-top-1 data-[side=top]:slide-in-from-bottom-1',
          'data-[side=left]:slide-in-from-right-1 data-[side=right]:slide-in-from-left-1',
          className,
        )}
        {...props}
      />
    </DropdownMenuPrimitive.Portal>
  );
}

function DropdownMenuGroup({ ...props }: React.ComponentProps<typeof DropdownMenuPrimitive.Group>) {
  return <DropdownMenuPrimitive.Group data-slot="dropdown-menu-group" {...props} />;
}

/**
 * Shared by Item, CheckboxItem, RadioItem and SubTrigger so the highlight can
 * only ever be defined in one place.
 *
 * `data-[highlighted]` , see refusal 1 in the file docblock. `bg-highlight` is
 * `--highlight`, the system's one hover/active surface, so a menu row and a
 * table row highlight identically.
 */
const menuItemBase = [
  'relative flex w-full cursor-default items-center gap-2 rounded-sm px-2 py-1.5 outline-none',
  'select-none',
  'data-[highlighted]:bg-highlight data-[highlighted]:text-fg',
  'data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
  '[&>svg]:pointer-events-none [&>svg]:size-4 [&>svg]:shrink-0 [&>svg]:text-muted-foreground',
  'data-[highlighted]:[&>svg]:text-fg',
];

export interface DropdownMenuItemProps extends React.ComponentProps<
  typeof DropdownMenuPrimitive.Item
> {
  /** Destructive actions , delete, revoke, archive. */
  variant?: 'default' | 'danger';
  /** Aligns the label with the checkbox/radio items in a mixed menu. */
  inset?: boolean;
}

/**
 * `variant` rides a `data-variant` attribute rather than a class branch so the
 * danger styling composes with `data-[highlighted]` in one selector , the
 * highlighted state of a destructive row needs its own pairing (`bg-danger-soft`
 * with `text-danger`), not the neutral highlight with red text on top of it.
 */
function DropdownMenuItem({
  className,
  variant = 'default',
  inset = false,
  ...props
}: DropdownMenuItemProps) {
  return (
    <DropdownMenuPrimitive.Item
      data-slot="dropdown-menu-item"
      data-variant={variant}
      data-inset={inset || undefined}
      className={cn(
        menuItemBase,
        // Logical, so the inset gutter lands on the correct side under dir="rtl".
        'data-[inset]:ps-8',
        'data-[variant=danger]:text-danger',
        'data-[variant=danger]:data-[highlighted]:bg-danger-soft',
        'data-[variant=danger]:data-[highlighted]:text-danger',
        'data-[variant=danger]:[&>svg]:text-danger',
        className,
      )}
      {...props}
    />
  );
}

/**
 * The indicator is absolutely positioned in a reserved inline-start gutter
 * (`ps-8` + `start-2`), both logical, so nothing has to be mirrored for RTL.
 * Radix keeps `aria-checked` in sync on the `menuitemcheckbox` role; the tick is
 * only the visible half of that.
 */
function DropdownMenuCheckboxItem({
  className,
  children,
  checked,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.CheckboxItem>) {
  return (
    <DropdownMenuPrimitive.CheckboxItem
      data-slot="dropdown-menu-checkbox-item"
      checked={checked}
      className={cn(menuItemBase, 'ps-8', className)}
      {...props}
    >
      <span className="pointer-events-none absolute start-2 flex size-4 items-center justify-center">
        <DropdownMenuPrimitive.ItemIndicator>
          <CheckIcon size={14} />
        </DropdownMenuPrimitive.ItemIndicator>
      </span>
      {children}
    </DropdownMenuPrimitive.CheckboxItem>
  );
}

function DropdownMenuRadioGroup({
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.RadioGroup>) {
  return <DropdownMenuPrimitive.RadioGroup data-slot="dropdown-menu-radio-group" {...props} />;
}

function DropdownMenuRadioItem({
  className,
  children,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.RadioItem>) {
  return (
    <DropdownMenuPrimitive.RadioItem
      data-slot="dropdown-menu-radio-item"
      className={cn(menuItemBase, 'ps-8', className)}
      {...props}
    >
      <span className="pointer-events-none absolute start-2 flex size-4 items-center justify-center">
        <DropdownMenuPrimitive.ItemIndicator>
          <DotIcon size={14} />
        </DropdownMenuPrimitive.ItemIndicator>
      </span>
      {children}
    </DropdownMenuPrimitive.RadioItem>
  );
}

export interface DropdownMenuLabelProps extends React.ComponentProps<
  typeof DropdownMenuPrimitive.Label
> {
  inset?: boolean;
}

function DropdownMenuLabel({ className, inset = false, ...props }: DropdownMenuLabelProps) {
  return (
    <DropdownMenuPrimitive.Label
      data-slot="dropdown-menu-label"
      data-inset={inset || undefined}
      className={cn(
        'px-2 py-1.5 text-xs font-medium text-muted-foreground',
        'data-[inset]:ps-8',
        className,
      )}
      {...props}
    />
  );
}

function DropdownMenuSeparator({
  className,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.Separator>) {
  return (
    <DropdownMenuPrimitive.Separator
      data-slot="dropdown-menu-separator"
      className={cn('-mx-1 my-1 h-px bg-border', className)}
      {...props}
    />
  );
}

/**
 * `⌘K` versus `Ctrl+K` is the caller's decision, exactly as in `Kbd` , deciding
 * it here would make the component render differently on server and client and
 * produce a hydration mismatch.
 *
 * `ms-auto`, not `ml-auto`: the shortcut belongs at the inline END of the row,
 * which is the left edge under `dir="rtl"`.
 */
function DropdownMenuShortcut({ className, ...props }: React.ComponentProps<'span'>) {
  return (
    <span
      data-slot="dropdown-menu-shortcut"
      className={cn('ms-auto font-mono text-xs tracking-widest text-muted-foreground', className)}
      {...props}
    />
  );
}

function DropdownMenuSub({ ...props }: React.ComponentProps<typeof DropdownMenuPrimitive.Sub>) {
  return <DropdownMenuPrimitive.Sub data-slot="dropdown-menu-sub" {...props} />;
}

export interface DropdownMenuSubTriggerProps extends React.ComponentProps<
  typeof DropdownMenuPrimitive.SubTrigger
> {
  inset?: boolean;
}

/**
 * The chevron gets `rtl:rotate-180` because a rotation is not a logical
 * property: under `dir="rtl"` the submenu opens to the LEFT, and an unrotated
 * right-pointing chevron then points away from the thing it opens.
 */
function DropdownMenuSubTrigger({
  className,
  inset = false,
  children,
  ...props
}: DropdownMenuSubTriggerProps) {
  return (
    <DropdownMenuPrimitive.SubTrigger
      data-slot="dropdown-menu-sub-trigger"
      data-inset={inset || undefined}
      className={cn(
        menuItemBase,
        'data-[inset]:ps-8',
        // The submenu's own open state, distinct from highlight: the trigger
        // stays lit while the child menu is up.
        'data-[state=open]:bg-highlight data-[state=open]:text-fg',
        className,
      )}
      {...props}
    >
      {children}
      <ChevronRightIcon size={14} className="ms-auto rtl:rotate-180" />
    </DropdownMenuPrimitive.SubTrigger>
  );
}

function DropdownMenuSubContent({
  className,
  ...props
}: React.ComponentProps<typeof DropdownMenuPrimitive.SubContent>) {
  return (
    <DropdownMenuPrimitive.Portal>
      <DropdownMenuPrimitive.SubContent
        data-slot="dropdown-menu-sub-content"
        className={cn(
          // glass-elevated: glass stacked on glass, per the tier's own rule.
          'glass glass-elevated z-dropdown min-w-32 rounded-lg p-1 text-sm text-fg',
          'origin-(--radix-dropdown-menu-content-transform-origin)',
          'duration-enter ease-out',
          'data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95',
          'data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95',
          'data-[side=left]:slide-in-from-right-1 data-[side=right]:slide-in-from-left-1',
          className,
        )}
        {...props}
      />
    </DropdownMenuPrimitive.Portal>
  );
}

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuGroup,
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
};
