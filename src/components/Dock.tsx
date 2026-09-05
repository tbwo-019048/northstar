import { NavLink, useLocation } from 'react-router-dom'
import { HomeIcon } from '@/components/ui/home'
import { FolderIcon } from '@/components/ui/folder'
import { EnvelopeIcon } from '@/components/ui/envelope'
import { UsersIcon } from '@/components/ui/users'
import { Cog6ToothIcon } from '@/components/ui/cog-6-tooth'
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '@/components/ui/velobits/tooltip'
import { cn } from '@/lib/utils'

interface DockItem {
  to: string
  label: string
  icon: typeof HomeIcon
  end?: boolean
}

const ITEMS: DockItem[] = [
  { to: '/app/landing', label: 'Home', icon: HomeIcon, end: true },
  { to: '/app', label: 'Projects', icon: FolderIcon, end: true },
  { to: '/app/emails', label: 'Emails', icon: EnvelopeIcon },
  { to: '/app/clients', label: 'Clients', icon: UsersIcon },
  { to: '/app/settings', label: 'Settings', icon: Cog6ToothIcon },
]

/** Mirrors NavLink's own active-match rule. Computed here (instead of
 * NavLink's function-form `className`) because Radix's Tooltip asChild
 * clones the child via Slot, which merges `className` as a plain string —
 * handed a function it just stringifies it, quietly wiping out every real
 * class (including the `flex` that centers the icon) with JS source text. */
function isRouteActive(pathname: string, to: string, end?: boolean) {
  if (pathname === to) return true
  return !end && pathname.startsWith(to.endsWith('/') ? to : `${to}/`)
}

/** Compact dock, always fixed centre-bottom. */
export function Dock() {
  const { pathname } = useLocation()

  return (
    <nav className="fixed inset-x-0 bottom-6 z-30 flex justify-center">
      <div className="flex items-center gap-1 rounded-2xl border border-border bg-panel/80 p-1.5 shadow-lg backdrop-blur-md">
        {ITEMS.map(({ to, label, icon: Icon, end }) => {
          const active = isRouteActive(pathname, to, end)
          return (
            <Tooltip key={label}>
              <TooltipTrigger asChild>
                <NavLink
                  to={to}
                  end={end}
                  className={cn(
                    'flex size-9 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground',
                    active && 'bg-primary/10 text-primary',
                  )}
                >
                  <Icon size={18} />
                </NavLink>
              </TooltipTrigger>
              <TooltipContent side="top">{label}</TooltipContent>
            </Tooltip>
          )
        })}
      </div>
    </nav>
  )
}
