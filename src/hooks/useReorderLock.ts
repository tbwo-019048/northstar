import { useState } from 'react'

/** A per-page "unlock to reorder" toggle, remembered in localStorage. */
export function useReorderLock(key: string): [boolean, (v: boolean) => void] {
  const storeKey = `northstar.reorder.${key}`
  const [unlocked, set] = useState(() => {
    try {
      return localStorage.getItem(storeKey) === '1'
    } catch {
      return false
    }
  })
  const setUnlocked = (v: boolean) => {
    set(v)
    try {
      localStorage.setItem(storeKey, v ? '1' : '0')
    } catch {
      /* ignore */
    }
  }
  return [unlocked, setUnlocked]
}
