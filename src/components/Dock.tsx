import { useLocation, useNavigate } from 'react-router-dom'
import { HomeIcon } from '@/components/ui/home'
import { FolderIcon } from '@/components/ui/folder'
import { EnvelopeIcon } from '@/components/ui/envelope'
import { UsersIcon } from '@/components/ui/users'
import { Cog6ToothIcon } from '@/components/ui/cog-6-tooth'
import { GradientButtonGroup } from '@/components/ui/gradient-button-group'
import { useTheme } from '@/store/useTheme'

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

/** Keep nested project routes associated with the Projects destination. */
function isRouteActive(pathname: string, to: string, end?: boolean) {
  if (pathname === to) return true
  return !end && pathname.startsWith(to.endsWith('/') ? to : `${to}/`)
}

/** Compact dock, always fixed centre-bottom. */
export function Dock() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const theme = useTheme((state) => state.theme)
  const activeItem = ITEMS.find((item) => isRouteActive(pathname, item.to, item.end)) ?? ITEMS[1]

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-30 flex justify-center px-3">
      <GradientButtonGroup
        className="pointer-events-auto drop-shadow-xl"
        activeId={activeItem.to}
        isDarkMode={theme === 'dark'}
        onSelect={navigate}
        items={ITEMS.map(({ to, label, icon: Icon }) => ({
          id: to,
          label,
          icon: <Icon size={19} />,
        }))}
      />
    </div>
  )
}
