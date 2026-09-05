import type { ProjectState } from '@/lib/types'

/** Text-only color per state — used for the half-circle progress gauge
 * (via `currentColor`) and as the base for the chip background below. */
export const STATE_TEXT_CLASS: Partial<Record<ProjectState, string>> = {
  concept: 'text-zinc-600 dark:text-zinc-400',
  commenced: 'text-sky-600 dark:text-sky-400',
  development: 'text-violet-600 dark:text-violet-400',
  mvp: 'text-amber-600 dark:text-amber-400',
  revised: 'text-orange-600 dark:text-orange-400',
  final: 'text-emerald-600 dark:text-emerald-400',
  support: 'text-teal-600 dark:text-teal-400',
}

/** Chip-style background + text per state (Overview table/grid). */
export const STATE_CHIP_CLASS: Partial<Record<ProjectState, string>> = {
  concept: 'bg-zinc-500/15 text-zinc-600 dark:text-zinc-400',
  commenced: 'bg-sky-500/15 text-sky-600 dark:text-sky-400',
  development: 'bg-violet-500/15 text-violet-600 dark:text-violet-400',
  mvp: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
  revised: 'bg-orange-500/15 text-orange-600 dark:text-orange-400',
  final: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
  support: 'bg-teal-500/15 text-teal-600 dark:text-teal-400',
}
