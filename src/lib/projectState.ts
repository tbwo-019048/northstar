import type { ProjectState } from '@/lib/types'

/** Display label per state — everywhere a state is shown as text should go
 * through this rather than relying on CSS `capitalize` (which would render
 * "mvp" as "Mvp" instead of "MVP"). */
export function formatState(state: ProjectState): string {
  if (state === 'mvp') return 'MVP'
  if (state === 'retired') return 'Retired'
  return state.charAt(0).toUpperCase() + state.slice(1)
}

/** Text-only color per state — used for the half-circle progress gauge
 * (via `currentColor`) and as the base for the chip background below. The
 * ramp runs cool → warm → green as a project moves from concept to done. */
export const STATE_TEXT_CLASS: Partial<Record<ProjectState, string>> = {
  concept: 'text-slate-500 dark:text-slate-400',
  commenced: 'text-sky-600 dark:text-sky-400',
  development: 'text-blue-600 dark:text-blue-400',
  mvp: 'text-indigo-600 dark:text-indigo-400',
  revised: 'text-amber-600 dark:text-amber-400',
  final: 'text-emerald-600 dark:text-emerald-400',
  support: 'text-teal-600 dark:text-teal-400',
  retired: 'text-zinc-500 dark:text-zinc-500',
}

/** Chip-style background + text per state (Overview table/grid/progress). */
export const STATE_CHIP_CLASS: Partial<Record<ProjectState, string>> = {
  concept: 'bg-slate-500/15 text-slate-600 dark:text-slate-300',
  commenced: 'bg-sky-500/15 text-sky-700 dark:text-sky-300',
  development: 'bg-blue-500/15 text-blue-700 dark:text-blue-300',
  mvp: 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300',
  revised: 'bg-amber-500/20 text-amber-700 dark:text-amber-300',
  final: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
  support: 'bg-teal-500/15 text-teal-700 dark:text-teal-300',
  retired: 'bg-zinc-500/15 text-zinc-500 dark:text-zinc-400',
}
