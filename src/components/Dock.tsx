import { useCallback, useEffect, useRef, useState } from 'react'
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

const DOCK_IDLE_MS = 15_000

/** Keep nested project routes associated with the Projects destination. */
function isRouteActive(pathname: string, to: string, end?: boolean) {
  if (pathname === to) return true
  return !end && pathname.startsWith(to.endsWith('/') ? to : `${to}/`)
}

/** Compact dock that lowers out of sight after 30 seconds away from its reveal zone. */
export function Dock() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const theme = useTheme((state) => state.theme)
  const [hidden, setHidden] = useState(false)
  const hideTimer = useRef<number | null>(null)
  const activeItem = ITEMS.find((item) => isRouteActive(pathname, item.to, item.end)) ?? ITEMS[1]

  const clearHideTimer = useCallback(() => {
    if (hideTimer.current !== null) {
      window.clearTimeout(hideTimer.current)
      hideTimer.current = null
    }
  }, [])

  const armHideTimer = useCallback(() => {
    clearHideTimer()
    hideTimer.current = window.setTimeout(() => {
      setHidden(true)
      hideTimer.current = null
    }, DOCK_IDLE_MS)
  }, [clearHideTimer])

  const reveal = useCallback(() => {
    clearHideTimer()
    setHidden(false)
  }, [clearHideTimer])

  useEffect(() => {
    armHideTimer()
    return clearHideTimer
  }, [armHideTimer, clearHideTimer])

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 h-24 px-3">
      <div
        className="pointer-events-auto absolute inset-x-0 bottom-0 mx-auto h-20 max-w-lg"
        onPointerEnter={reveal}
        onPointerLeave={armHideTimer}
        onFocusCapture={reveal}
        onBlurCapture={armHideTimer}
        onPointerDown={(event) => {
          setHidden(false)
          if (event.pointerType === 'touch') armHideTimer()
        }}
      >
        <div
          className={
            'absolute inset-x-0 bottom-4 transition-transform duration-500 ease-in-out ' +
            (hidden ? 'translate-y-[calc(100%+1rem)]' : 'translate-y-0')
          }
        >
          <GradientButtonGroup
            className="drop-shadow-xl"
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
      </div>
    </div>
  )
}
