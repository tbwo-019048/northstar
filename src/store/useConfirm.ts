import type React from 'react'
import { create } from 'zustand'

export interface ConfirmOptions {
  title: string
  message?: React.ReactNode
  confirmLabel?: string
  cancelLabel?: string
  tone?: 'danger' | 'default'
}

interface ConfirmRequest extends ConfirmOptions {
  id: number
  resolve: (ok: boolean) => void
}

interface ConfirmState {
  request: ConfirmRequest | null
  /** Opens the dialog and resolves `true` on confirm, `false` on cancel/dismiss. */
  ask: (options: ConfirmOptions) => Promise<boolean>
  /** Called by the host to settle the pending request. */
  settle: (ok: boolean) => void
}

let nextId = 0

export const useConfirmStore = create<ConfirmState>((set, get) => ({
  request: null,
  ask: (options) =>
    new Promise<boolean>((resolve) => {
      set({ request: { ...options, id: (nextId += 1), resolve } })
    }),
  settle: (ok) => {
    const { request } = get()
    if (request) request.resolve(ok)
    set({ request: null })
  },
}))

/**
 * Custom replacement for `window.confirm`. Stable identity, so it's safe in
 * `useCallback` / `useEffect` deps.
 *
 *   const confirm = useConfirm()
 *   if (await confirm({ title: 'Delete client?', message: '…', tone: 'danger' })) { … }
 */
export function useConfirm() {
  return useConfirmStore.getState().ask
}
