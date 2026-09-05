import { NavLink } from 'react-router-dom'
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
  skipActive?: boolean
}

const ITEMS: DockItem[] = [
  { to: '/app', label: 'Home', icon: HomeIcon, end: true },
  { to: '/app', label: 'Projects', icon: FolderIcon, end: true, skipActive: true },
  { to: '/app/emails', label: 'Emails', icon: EnvelopeIcon },
  { to: '/app/clients', label: 'Clients', icon: UsersIcon },
  { to: '/app/settings', label: 'Settings', icon: Cog6ToothIcon },
]

/** Compact dock, always fixed centre-bottom. Home + Projects both point at
 * `/app` (there's no separate projects route) — only Projects gets the
 * active-route highlight so the two icons don't both light up at once. */
export function Dock() {
  return (
    <nav className="fixed inset-x-0 bottom-3 z-30 flex justify-center">
      <div className="flex items-center gap-1 rounded-2xl border border-border bg-panel/80 p-1.5 shadow-lg backdrop-blur-md">
        {ITEMS.map(({ to, label, icon: Icon, end, skipActive }) => (
          <Tooltip key={label}>
            <TooltipTrigger asChild>
              <NavLink
                to={to}
                end={end}
                className={({ isActive }) =>
                  cn(
                    'grid size-9 place-items-center rounded-xl text-muted-foreground transition-colors hover:bg-muted hover:text-foreground',
                    isActive && !skipActive && 'bg-primary/10 text-primary',
                  )
                }
              >
                <Icon size={18} />
              </NavLink>
            </TooltipTrigger>
            <TooltipContent side="top">{label}</TooltipContent>
          </Tooltip>
        ))}
      </div>
    </nav>
  )
}
