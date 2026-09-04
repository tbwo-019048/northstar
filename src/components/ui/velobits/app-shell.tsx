'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { breakpoint } from '@velobitsio/tokens';
import { MenuIcon } from '@velobitsio/icons';

import { cn } from '@/lib/utils';
import { useMediaQuery } from './use-media-query';
import { buttonVariants } from './button';
import { SidePanel, SidePanelContent, SidePanelTitle, SidePanelTrigger } from './side-panel';

/**
 * The authenticated chrome: a sticky bar over a nav rail and the page.
 *
 * ```tsx
 * <AppShell
 *   header={
 *     <AppShellHeader>
 *       <AppShellSidebarTrigger />
 *       <BrandMark />
 *       <ScopePicker />
 *     </AppShellHeader>
 *   }
 *   sidebar={<NavItems />}
 *   sidebarLabel="Main"
 * >
 *   <Outlet />
 * </AppShell>
 * ```
 *
 * ## Why `sidebar` is a prop and not a child
 *
 * Because it is rendered in **two places**: as a rail at `md` and up, and inside
 * a drawer below it. One definition, two presentations , which is the only way a
 * nav item added in one place cannot go missing from the other.
 *
 * The consequence a caller has to know: **the sidebar node must be idempotent.**
 * No `id` attributes (they would duplicate while the drawer is open), and no
 * uncontrolled state worth keeping (the drawer's copy is unmounted on close, so
 * it starts fresh every time). Lift anything stateful above the shell.
 *
 * Only one copy is ever in the accessibility tree: the rail is `display: none`
 * below `md`, which removes it, and above `md` the drawer never opens.
 *
 * ## The drawer is a `SidePanel`, not a hand-rolled overlay
 *
 * So it gets the focus trap, the Esc handler, the scroll lock, `aria-modal`, and
 * , the one that is invisible until you need it , **focus restoration to the
 * hamburger** when it closes. A hand-rolled drawer typically has the first three
 * and not the fourth, so closing the menu drops focus to `<body>` and the next
 * Tab restarts from the top of the document.
 *
 * ## Two things this cannot do for you, and one it can
 *
 * It cannot close the drawer on navigation , it has no router. Do this once, in
 * your own shell file:
 *
 * ```tsx
 * const { closeSidebar } = useAppShell();
 * useEffect(closeSidebar, [pathname, closeSidebar]);
 * ```
 *
 * A drawer left open across a navigation covers the page the user just asked
 * for. It also cannot know which nav item is current; that is `aria-current` on
 * your own links.
 *
 * What it **does** handle is the resize case, because that one is pure layout: an
 * open drawer when the viewport crosses to `md` would leave the rail and the
 * drawer both showing, with a scrim over the page and no way to see what you
 * clicked. It closes itself.
 */

interface AppShellContextValue {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  /** Stable identity , safe as a `useEffect` dependency. */
  closeSidebar: () => void;
}

const AppShellContext = createContext<AppShellContextValue | null>(null);

export function useAppShell(): AppShellContextValue {
  const ctx = useContext(AppShellContext);
  if (!ctx) throw new Error('useAppShell() must be called inside an <AppShell>.');
  return ctx;
}

export interface AppShellProps extends Omit<React.ComponentProps<'div'>, 'children'> {
  /** The sticky bar. Usually an `AppShellHeader`. */
  header?: React.ReactNode;
  /** The nav. Rendered twice , see the docblock. */
  sidebar?: React.ReactNode;
  /** Names both nav landmarks and the mobile drawer. */
  sidebarLabel?: string;
  /** Tier-S glass rail, or the opaque panel. Same choice, same reasons, as `Card`. */
  sidebarSurface?: 'glass' | 'panel';
  /** Controlled drawer state. Omit for uncontrolled. */
  sidebarOpen?: boolean;
  onSidebarOpenChange?: (open: boolean) => void;
  /** The skip link's target. Change it only if it collides. */
  mainId?: string;
  mainClassName?: string;
  children: React.ReactNode;
}

function AppShell({
  header,
  sidebar,
  sidebarLabel = 'Main',
  sidebarSurface = 'glass',
  sidebarOpen: openProp,
  onSidebarOpenChange,
  mainId = 'app-shell-main',
  mainClassName,
  className,
  children,
  ...props
}: AppShellProps) {
  const [uncontrolled, setUncontrolled] = useState(false);
  const controlled = openProp !== undefined;
  const sidebarOpen = controlled ? openProp : uncontrolled;

  const setSidebarOpen = useCallback(
    (open: boolean) => {
      if (!controlled) setUncontrolled(open);
      onSidebarOpenChange?.(open);
    },
    [controlled, onSidebarOpenChange],
  );

  const closeSidebar = useCallback(() => setSidebarOpen(false), [setSidebarOpen]);

  /*
   * The breakpoint comes from @velobitsio/tokens rather than being typed here,
   * because it has to agree with the `md:` variants below. When those two
   * disagree the failure is a narrow band of viewport widths in which the rail
   * and the drawer are both showing , which nobody finds, because nobody resizes
   * a browser one pixel at a time.
   */
  const isDesktop = useMediaQuery(`(min-width: ${breakpoint.md})`);
  useEffect(() => {
    if (isDesktop && sidebarOpen) closeSidebar();
  }, [isDesktop, sidebarOpen, closeSidebar]);

  const context = useMemo(
    () => ({ sidebarOpen, setSidebarOpen, closeSidebar }),
    [sidebarOpen, setSidebarOpen, closeSidebar],
  );

  return (
    <AppShellContext.Provider value={context}>
      {/* The Dialog root wraps the whole shell so `AppShellSidebarTrigger` can
          sit in the header and still be a real Radix trigger , which is what
          wires `aria-expanded`, `aria-controls` and the focus return. */}
      <SidePanel open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <div
          data-slot="app-shell"
          className={cn('flex h-screen flex-col bg-bg', className)}
          {...props}
        >
          {/*
           * WCAG 2.4.1 Bypass Blocks, and the most-skipped requirement in an
           * admin UI. Every page here repeats a bar and a rail, so without this a
           * keyboard user tabs through ~20 identical controls after EVERY
           * navigation. It is the first element in the DOM because a skip link
           * that is not first is not a skip link.
           *
           * `sr-only focus:not-sr-only` , visible only once focused. A skip link
           * that is permanently invisible (`left: -9999px` with no focus rule) is
           * the classic broken implementation: it exists, it is announced, and
           * sighted keyboard users cannot see where their focus went.
           */}
          <a
            href={`#${mainId}`}
            data-slot="app-shell-skip-link"
            className={cn(
              'sr-only',
              'focus:not-sr-only focus:absolute focus:start-4 focus:top-4 focus:z-toast',
              'focus:rounded-md focus:bg-panel focus:px-3 focus:py-2',
              'focus:text-sm focus:font-medium focus:text-fg focus:shadow-lg',
            )}
          >
            Skip to content
          </a>

          {header}

          <div className="flex min-h-0 flex-1">
            {sidebar && (
              /*
               * `md:flex` on a `hidden` element rather than a responsive grid
               * column: the drawer copy has to leave the flow entirely, and a
               * grid track cannot.
               *
               * Tier S, and applied WITHOUT overrides. A rail is one of the
               * surfaces `glass.css` names for this tier, and the temptation
               * here is to strip its shadow and three of its borders because
               * they are off-screen anyway , which is exactly the mistake the
               * `Card` docblock warns about, since in dark mode the inset
               * specular highlight in that shadow list IS the material. They
               * cost nothing where they land: the side borders sit at the
               * viewport edge, the drop shadow points down past the fold.
               *
               * No blur. The rail sits BESIDE the scroll region, not over it, so
               * there is nothing moving behind it , and it would be a second
               * live backdrop layer on every page for no visual gain. The header
               * is the one that earns one.
               */
              <aside
                data-slot="app-shell-rail"
                className={cn(
                  'hidden w-60 shrink-0 md:flex',
                  sidebarSurface === 'glass' ? 'glass-surface' : 'border-e border-border bg-panel',
                )}
              >
                <nav
                  aria-label={sidebarLabel}
                  className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
                >
                  {sidebar}
                </nav>
              </aside>
            )}

            {/*
             * `tabIndex={-1}` is what makes the skip link actually move FOCUS.
             * Without it the browser scrolls to the target and leaves focus on
             * the link, so the very next Tab goes back into the navigation the
             * user just asked to skip , the link appears to do nothing.
             *
             * This is also the scroll container, so the header can be sticky
             * without the page scrolling underneath the whole shell.
             */}
            <main
              id={mainId}
              tabIndex={-1}
              data-slot="app-shell-main"
              className={cn(
                'min-w-0 flex-1 overflow-y-auto px-5 py-5 outline-none sm:px-6',
                mainClassName,
              )}
            >
              {children}
            </main>
          </div>
        </div>

        {sidebar && (
          <SidePanelContent
            side="left"
            data-slot="app-shell-drawer"
            className="w-[17rem] gap-0 p-0"
            // No description part, so the reference must be cleared or Radix
            // points aria-describedby at an element that never renders.
            aria-describedby={undefined}
          >
            {/*
             * Radix names the dialog from its Title and warns when there is not
             * one. Visually hidden because the drawer shows the same nav the
             * rail does, and a heading saying "Main" above it is redundant to
             * anyone who can see the links.
             */}
            <SidePanelTitle className="sr-only">{sidebarLabel}</SidePanelTitle>
            <nav
              aria-label={sidebarLabel}
              className="min-h-0 flex-1 overflow-y-auto overscroll-contain pt-12"
            >
              {sidebar}
            </nav>
          </SidePanelContent>
        )}
      </SidePanel>
    </AppShellContext.Provider>
  );
}

export interface AppShellHeaderProps extends React.ComponentProps<'header'> {
  /**
   * `chrome` (the default) , the dark app bar. Tier-O glass, or the opaque panel,
   * for a shell that wants the bar to read as part of the document instead.
   */
  surface?: 'chrome' | 'glass' | 'panel';
}

/**
 * The sticky bar.
 *
 * ## `z-sticky`, and specifically NOT higher
 *
 * App chrome sits at 100 on the shared ladder, below `z-dropdown` (1000). That
 * ordering is the whole reason the ladder exists: portalled Radix content lands
 * at `dropdown` and above, so a header at 1100 would paint over **its own**
 * account menu and scope picker. The bug reads as "the dropdown is behind the
 * bar", and raising the dropdown to fix it starts an arms race with the modal
 * and toast layers.
 *
 * ## Why the default is `chrome` and not glass
 *
 * It was glass, and in light mode that made the bar a near-white strip on a
 * near-white page: the row carrying the product's identity and its primary
 * navigation read as the first paragraph of the document rather than as the frame
 * around it. The app had no chrome, which is most of what separates "an
 * application" from "a web page".
 *
 * `chrome` is the PLUM seed, in BOTH themes , see the docblock on
 * `SemanticTokens.chrome`. The consequence for anything rendered inside this
 * header: **none of the ordinary foreground utilities apply.** On plum, `text-fg`
 * is 1.23:1, `text-muted-foreground` 1.84:1 and `text-link` 1.87:1. Use
 * `text-chrome-fg`, `text-chrome-muted-fg`, and `text-chrome-accent` (lime, at
 * 8.85:1) for the current item. `hover:bg-chrome-highlight` is safe with any of
 * them.
 *
 * `surface="glass"` and `surface="panel"` are still here for a shell that wants
 * the bar to belong to the document , a docs reader, a marketing page.
 *
 * ## Tier O, which `surface="glass"` selects, is the one place in the shell that
 * earns a blur
 *
 * Page content genuinely passes underneath a sticky bar, so its backdrop is
 * unknowable , which is the definition of Tier O, and why `.glass` steps muted
 * text up to `--muted-on-glass` for its descendants.
 *
 * `backdrop-filter` also makes this element a containing block for
 * `position: fixed` descendants. Anything fixed rendered *inside* the header is
 * therefore trapped in the header's box. In practice every overlay in this system
 * is portalled to `<body>` and so unaffected , but a hand-rolled fixed dropdown
 * put in here will land in the wrong place, and it will look like a CSS typo.
 *
 * ## The two overrides on `.glass` here, and why they are not the forbidden kind
 *
 * `border-x-0 border-t-0` sets border *widths*, leaving `.glass`'s translucent
 * border COLOUR in place on the one edge that shows. The rule the `Card`
 * docblock states is about colour utilities replacing that sanctioned
 * translucent edge with an opaque one; a width of zero on an edge nobody can see
 * is a different thing.
 *
 * `shadow-sm` replaces `--shadow-overlay`, which at `0 16px 48px` is tuned for a
 * modal floating in the middle of the page and reads as a bruise under a bar
 * pinned to the top of it. Safe **only because this is Tier O**: `.glass`'s
 * `box-shadow` is a plain drop shadow. Doing the same to a Tier-S component would
 * delete the inset specular highlight that is dark mode's entire material.
 */
function AppShellHeader({ className, surface = 'chrome', ...props }: AppShellHeaderProps) {
  return (
    <header
      data-slot="app-shell-header"
      className={cn(
        'sticky top-0 z-sticky flex h-13 shrink-0 items-center gap-2 px-3 sm:px-4',
        surface === 'chrome' && 'border-b border-chrome-border bg-chrome text-chrome-fg',
        surface === 'glass' && 'glass border-x-0 border-t-0 shadow-sm',
        surface === 'panel' && 'border-b border-border bg-panel',
        className,
      )}
      {...props}
    />
  );
}

/**
 * The hamburger. Hidden at `md` and up, where the rail is showing.
 *
 * A real `SidePanelTrigger`, so Radix owns `aria-expanded`, `aria-controls`, and
 * returning focus here when the drawer closes.
 */
function AppShellSidebarTrigger({ className, ...props }: React.ComponentProps<'button'>) {
  return (
    <SidePanelTrigger asChild>
      <button
        type="button"
        data-slot="app-shell-sidebar-trigger"
        aria-label="Open navigation menu"
        className={cn(
          buttonVariants({ variant: 'ghost', size: 'icon' }),
          'size-8 md:hidden',
          className,
        )}
        {...props}
      >
        <MenuIcon size={18} />
      </button>
    </SidePanelTrigger>
  );
}

export { AppShell, AppShellHeader, AppShellSidebarTrigger };
