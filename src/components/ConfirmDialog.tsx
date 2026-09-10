import { useRef } from 'react'
import { useConfirmStore } from '@/store/useConfirm'
import { Button } from '@/components/ui/velobits/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/velobits/dialog'

/**
 * Renders the custom confirmation dialog. Mounted once, next to the toast host.
 * Driven entirely by `useConfirmStore` — components call `useConfirm()`.
 */
export function ConfirmDialogHost() {
  const request = useConfirmStore((s) => s.request)
  const settle = useConfirmStore((s) => s.settle)
  const cancelRef = useRef<HTMLButtonElement>(null)

  const danger = (request?.tone ?? 'danger') === 'danger'

  return (
    <Dialog
      open={!!request}
      onOpenChange={(open) => {
        if (!open) settle(false)
      }}
    >
      {request && (
        <DialogContent
          size="sm"
          aria-describedby={undefined}
          onOpenAutoFocus={(event) => {
            // Radix swallows `autoFocus`; land on Cancel ourselves.
            event.preventDefault()
            cancelRef.current?.focus()
          }}
        >
          <DialogHeader>
            <DialogTitle>{request.title}</DialogTitle>
          </DialogHeader>
          {request.message != null && (
            <div className="text-sm text-muted-foreground">{request.message}</div>
          )}
          <DialogFooter>
            <Button ref={cancelRef} variant="secondary" size="sm" onClick={() => settle(false)}>
              {request.cancelLabel ?? 'Cancel'}
            </Button>
            <Button
              variant={danger ? 'destructive' : 'primary'}
              size="sm"
              onClick={() => settle(true)}
            >
              {request.confirmLabel ?? 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      )}
    </Dialog>
  )
}
