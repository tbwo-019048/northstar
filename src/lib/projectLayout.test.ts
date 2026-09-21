import { describe, expect, it } from 'vitest'
import { applySimpleMode, SIMPLE_MODE_TAB_KEYS } from '@/lib/projectLayout'
import type { TabKey } from '@/lib/projectLayout'

const typeTabs: { key: TabKey; label: string }[] = [
  { key: 'summary', label: 'Summary' },
  { key: 'features', label: 'Features' },
  { key: 'details', label: 'Details' },
  { key: 'assets', label: 'Assets' },
  { key: 'todo', label: 'To-Do' },
  { key: 'settings', label: 'Settings' },
]

describe('applySimpleMode', () => {
  it('leaves the tab list untouched when Simple Mode is off', () => {
    expect(applySimpleMode(typeTabs, false, 'To-Do')).toEqual(typeTabs)
    expect(applySimpleMode(typeTabs, undefined, 'To-Do')).toEqual(typeTabs)
  })

  it('collapses to exactly Summary, To-Do and Settings when Simple Mode is on', () => {
    const result = applySimpleMode(typeTabs, true, 'To-Do')
    expect(result.map((t) => t.key)).toEqual(['summary', 'todo', 'settings'])
    expect(result.map((t) => t.key)).toEqual(SIMPLE_MODE_TAB_KEYS)
  })

  it('drops Features/Details/Assets and any other type-specific tab when on', () => {
    const result = applySimpleMode(typeTabs, true, 'To-Do')
    expect(result.some((t) => t.key === 'features')).toBe(false)
    expect(result.some((t) => t.key === 'details')).toBe(false)
    expect(result.some((t) => t.key === 'assets')).toBe(false)
  })

  it('keeps the type-specific To-Do label (e.g. production’s "Orders")', () => {
    const result = applySimpleMode(typeTabs, true, 'Orders')
    expect(result.find((t) => t.key === 'todo')?.label).toBe('Orders')
  })
})
