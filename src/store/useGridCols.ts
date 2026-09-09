import { create } from 'zustand'

const KEY = 'northstar.gridCols'
const clamp = (n: number) => Math.max(2, Math.min(12, Math.round(n) || 4))

const read = () => {
  try {
    return clamp(Number(localStorage.getItem(KEY)))
  } catch {
    return 4
  }
}

/** Column count for the grid views (Overview / Clients / Emails), 2–12. */
export const useGridCols = create<{ cols: number; setCols: (n: number) => void }>((set) => ({
  cols: read(),
  setCols: (n) => {
    const cols = clamp(n)
    try {
      localStorage.setItem(KEY, String(cols))
    } catch {
      /* ignore */
    }
    set({ cols })
  },
}))
