import { create } from 'zustand'

export type ChangeNotificationTone = 'success' | 'error'

export interface ChangeNotification {
  id: number
  tone: ChangeNotificationTone
  title: string
  description?: string
}

interface ChangeNotificationState {
  notification: ChangeNotification | null
  publish: (notification: Omit<ChangeNotification, 'id'>) => void
  dismiss: () => void
}

let nextNotificationId = 0
let savedTimer: ReturnType<typeof setTimeout> | null = null

export const useChangeNotifications = create<ChangeNotificationState>((set) => ({
  notification: null,
  publish: (notification) =>
    set({ notification: { ...notification, id: (nextNotificationId += 1) } }),
  dismiss: () => set({ notification: null }),
}))

export function notifySaved(description = 'Your latest changes are safely stored.', immediate = false) {
  if (savedTimer) clearTimeout(savedTimer)

  const publish = () => {
    savedTimer = null
    useChangeNotifications.getState().publish({
      tone: 'success',
      title: 'Changes saved',
      description,
    })
  }

  if (immediate) publish()
  else savedTimer = setTimeout(publish, 350)
}

export function notifySaveError(error?: unknown) {
  if (savedTimer) {
    clearTimeout(savedTimer)
    savedTimer = null
  }

  const description =
    typeof error === 'string'
      ? error
      : error instanceof Error
        ? error.message
        : 'Your change could not be saved. Please try again.'

  useChangeNotifications.getState().publish({
    tone: 'error',
    title: 'Save failed',
    description,
  })
}
