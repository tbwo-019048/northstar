import { create } from 'zustand'

const KEY = 'northstar.diagnostic'

const read = () => {
  try {
    return localStorage.getItem(KEY) === '1'
  } catch {
    return false
  }
}

/** Per-browser "diagnostic mode": reveals a hide checkbox on list rows across
 * the app. When off, rows flagged `hidden` don't render at all. */
export const useDiagnostic = create<{ on: boolean; setOn: (v: boolean) => void }>((set) => ({
  on: read(),
  setOn: (v) => {
    try {
      localStorage.setItem(KEY, v ? '1' : '0')
    } catch {
      /* ignore */
    }
    set({ on: v })
  },
}))
