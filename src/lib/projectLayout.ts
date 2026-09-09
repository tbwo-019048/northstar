import type { ProjectType } from '@/lib/types'

/** The tab keys used by the project shell (src/pages/Project.tsx). */
export type TabKey =
  | 'summary'
  | 'features'
  | 'details'
  | 'assets'
  | 'requests'
  | 'todo'
  | 'pipeline'
  | 'planning'
  | 'users'
  | 'git'
  | 'analysis'
  | 'settings'

export type SummaryBlock = 'url' | 'image' | 'progress' | 'summary' | 'clients' | 'stats' | 'topTodos'

export type DetailsBlock =
  | 'codename'
  | 'state'
  | 'hours'
  | 'summary'
  | 'countries'
  | 'credentials'
  | 'techStack'
  | 'environments'
  | 'sections'

export interface TypeLayout {
  /** Tabs removed from the project nav (and redirected to Summary if opened). */
  hiddenTabs: TabKey[]
  /** Nav label + in-tab heading overrides, e.g. features → "Store". */
  tabLabels: Partial<Record<TabKey, string>>
  /** Which Summary blocks render, in this order. */
  summary: SummaryBlock[]
  /** Which Details blocks render, in this order. */
  details: DetailsBlock[]
  /** Trim the Users tab to a name / contact / notes list. */
  simpleUsers: boolean
}

const FULL_SUMMARY: SummaryBlock[] = ['url', 'image', 'progress', 'summary', 'clients']
const LEAN_SUMMARY: SummaryBlock[] = ['image', 'progress', 'summary', 'clients']
const FULL_DETAILS: DetailsBlock[] = [
  'codename',
  'state',
  'hours',
  'summary',
  'countries',
  'credentials',
  'techStack',
  'environments',
  'sections',
]
const LEAN_DETAILS: DetailsBlock[] = ['codename', 'state', 'hours', 'summary', 'countries', 'sections']

const DEFAULT_LAYOUT: TypeLayout = {
  hiddenTabs: [],
  tabLabels: {},
  summary: FULL_SUMMARY,
  details: FULL_DETAILS,
  simpleUsers: false,
}

/** A creative/physical project: no live site, no users or git, features renamed. */
const lean = (featuresLabel: string, extraLabels: Partial<Record<TabKey, string>> = {}): TypeLayout => ({
  hiddenTabs: ['users', 'git'],
  tabLabels: { features: featuresLabel, ...extraLabels },
  summary: LEAN_SUMMARY,
  details: LEAN_DETAILS,
  simpleUsers: false,
})

export const TYPE_LAYOUTS: Record<ProjectType, TypeLayout> = {
  website: DEFAULT_LAYOUT,
  app: DEFAULT_LAYOUT,
  production: {
    hiddenTabs: ['git'],
    tabLabels: { features: 'Store', todo: 'Orders', users: 'Customers' },
    summary: LEAN_SUMMARY,
    details: LEAN_DETAILS,
    simpleUsers: true,
  },
  physical: lean('Goals'),
  mechanical: lean('Targets'),
  location: lean('Destinations', { requests: 'Locations' }),
  written: lean('Targets'),
  writing: lean('Targets'),
  other: DEFAULT_LAYOUT,
}

export function layoutFor(type: ProjectType): TypeLayout {
  return TYPE_LAYOUTS[type] ?? DEFAULT_LAYOUT
}
