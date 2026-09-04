import { useCallback, useEffect, useRef, useState } from 'react'

type SaveStatus = 'idle' | 'saving' | 'saved'

/**
 * Controlled local text state that autosaves to a persistence function after
 * `delay` ms of inactivity, and again on unmount. Returns [value, setValue, status].
 * Adopts external changes (realtime) while the field is not dirty.
 */
export function useDebouncedSave(
  initial: string,
  save: (value: string) => void | Promise<void>,
  delay = 600,
): [string, (v: string) => void, SaveStatus] {
  const [value, setValue] = useState(initial)
  const [status, setStatus] = useState<SaveStatus>('idle')

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const saveRef = useRef(save)
  const latest = useRef(initial)
  const dirty = useRef(false)
  const external = useRef(initial)

  saveRef.current = save

  useEffect(() => {
    if (!dirty.current && initial !== external.current) {
      external.current = initial
      latest.current = initial
      setValue(initial)
    }
  }, [initial])

  const commit = useCallback(async () => {
    if (!dirty.current) return
    dirty.current = false
    const v = latest.current
    setStatus('saving')
    await saveRef.current(v)
    external.current = v
    setStatus('saved')
    setTimeout(() => setStatus((s) => (s === 'saved' ? 'idle' : s)), 1200)
  }, [])

  const update = useCallback(
    (v: string) => {
      latest.current = v
      dirty.current = true
      setValue(v)
      setStatus('saving')
      if (timer.current) clearTimeout(timer.current)
      timer.current = setTimeout(commit, delay)
    },
    [commit, delay],
  )

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current)
      void commit()
    }
  }, [commit])

  return [value, update, status]
}
