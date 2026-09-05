import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from '@/components/ui/velobits/toast'
import { useChangeNotifications } from '@/store/useChangeNotifications'
import { cn } from '@/lib/utils'

function StatusIcon({ error }: { error: boolean }) {
  return error ? (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-5">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v5M12 16h.01" strokeLinecap="round" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-5">
      <circle cx="12" cy="12" r="9" />
      <path d="m8 12 2.5 2.5L16 9" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function ChangeNotificationHost() {
  const notification = useChangeNotifications((state) => state.notification)
  const dismiss = useChangeNotifications((state) => state.dismiss)

  return (
    <ToastProvider duration={6000} swipeDirection="right">
      {notification && (
        <Toast
          key={notification.id}
          defaultOpen
          type="foreground"
          onOpenChange={(open) => !open && dismiss()}
          variant={notification.tone === 'error' ? 'danger' : 'info'}
          className={cn(
            'rounded-xl border bg-panel/95 shadow-2xl backdrop-blur-xl',
            'data-[state=open]:slide-in-from-top-3 data-[state=closed]:slide-out-to-top-3',
            notification.tone === 'success' &&
              'border-blue-400/40 text-blue-800 shadow-blue-950/10 dark:text-blue-200',
          )}
        >
          <StatusIcon error={notification.tone === 'error'} />
          <ToastTitle>{notification.title}</ToastTitle>
          {notification.description && (
            <ToastDescription>{notification.description}</ToastDescription>
          )}
          <ToastClose />
        </Toast>
      )}
      <ToastViewport className="bottom-auto top-10 p-4 sm:max-w-sm" />
    </ToastProvider>
  )
}
