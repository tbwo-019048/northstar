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
  | 'locations'
  | 'albumArt'
  | 'album'
  | 'mindmap'

export type SummaryBlock =
  | 'url'
  | 'image'
  | 'progress'
  | 'summary'
  | 'clients'
  | 'stats'
  | 'topTodos'
  | 'pipeline'

export type DetailsBlock =
  | 'codename'
  | 'state'
  | 'hours'
  | 'summary'
  | 'countries'
  | 'links'
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
  /** Which Planning UI renders. Omitted/'full' = today's 5-status board. */
  planningVariant?: 'full' | 'simple' | 'locations'
  /** Extra tabs appended after Details, only for this type. Omitted = none. */
  extraTabs?: { key: TabKey; label: string }[]
}

// 'pipeline' is appended to every shared summary preset so existing types keep
// their previous behaviour (Summary always showed the Pipeline section for any
// project without a live site - see SummaryTab.tsx - now it's an explicit,
// type-configurable block instead of an unconditional one). Types that want it
// gone (e.g. grand_tour) just build their own array without it.
const FULL_SUMMARY: SummaryBlock[] = ['url', 'image', 'progress', 'summary', 'clients', 'pipeline']
const LEAN_SUMMARY: SummaryBlock[] = ['image', 'progress', 'summary', 'clients', 'pipeline']
const FULL_DETAILS: DetailsBlock[] = [
  'codename',
  'state',
  'hours',
  'summary',
  'countries',
  'links',
  'credentials',
  'techStack',
  'environments',
  'sections',
]
const LEAN_DETAILS: DetailsBlock[] = [
  'codename',
  'state',
  'hours',
  'summary',
  'countries',
  'links',
  'sections',
]

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

/** Just the state gauge (HalfCircleProgress, driven by project.state) — no
 * links/screenshots/summary text/clients/stats. The free-form mind-map lives
 * on its own optional "mindmap" tab (see Project.tsx's show_mindmap check),
 * not on Summary. */
const STATE_SUMMARY: SummaryBlock[] = ['progress', 'pipeline']

/** The shared "standard treatment": Summary shows only the state gauge,
 * Details is the lean set, and Planning is the simple Pending/In Progress/
 * Completed board instead of the classic 5-status one. */
const standard = (
  featuresLabel: string,
  extraLabels: Partial<Record<TabKey, string>> = {},
  extraTabs: { key: TabKey; label: string }[] = [],
): TypeLayout => ({
  hiddenTabs: ['users', 'git'],
  tabLabels: { features: featuresLabel, ...extraLabels },
  summary: STATE_SUMMARY,
  details: LEAN_DETAILS,
  simpleUsers: false,
  planningVariant: 'simple',
  extraTabs,
})

export const TYPE_LAYOUTS: Record<ProjectType, TypeLayout> = {
  website: DEFAULT_LAYOUT,
  app: DEFAULT_LAYOUT,
  production: {
    hiddenTabs: ['git'],
    tabLabels: { features: 'Store', todo: 'Orders', users: 'Customers' },
    summary: STATE_SUMMARY,
    details: LEAN_DETAILS,
    simpleUsers: true,
    planningVariant: 'simple',
  },
  physical: standard('Goals'),
  // Only Summary / Targets(features) / Details / Pipeline.
  mechanical: {
    ...standard('Targets'),
    hiddenTabs: ['assets', 'requests', 'todo', 'planning', 'users', 'git', 'analysis'],
  },
  location: standard('Destinations', { requests: 'Locations' }),
  // Only Summary / Targets(features) / Details / To-Do.
  written: {
    ...lean('Targets'),
    hiddenTabs: ['assets', 'requests', 'pipeline', 'planning', 'users', 'git', 'analysis'],
  },
  writing: {
    ...standard('Targets'),
    hiddenTabs: ['assets', 'requests', 'pipeline', 'planning', 'users', 'git', 'analysis'],
  },
  game: {
    hiddenTabs: [],
    tabLabels: {},
    summary: STATE_SUMMARY,
    details: LEAN_DETAILS,
    simpleUsers: false,
    planningVariant: 'simple',
  },
  novel: lean('Chapters'),
  music: standard('Tracks', {}, [
    { key: 'albumArt', label: 'Album Art' },
    { key: 'album', label: 'Album' },
  ]),
  // Only Summary / Prints(features) / Details / Pipeline.
  '3d_print': {
    ...lean('Prints'),
    hiddenTabs: ['assets', 'requests', 'todo', 'planning', 'users', 'git', 'analysis'],
  },
  laser_engrave: lean('Engravings'),
  // Only Summary / Assets / Locations (+ Settings, never hidden). Summary shows
  // just the state gauge and text summary - no clients, screenshots or pipeline.
  grand_tour: {
    hiddenTabs: ['features', 'details', 'requests', 'todo', 'pipeline', 'planning', 'users', 'git', 'analysis'],
    tabLabels: {},
    summary: ['progress', 'summary'],
    details: LEAN_DETAILS,
    simpleUsers: false,
    planningVariant: 'locations',
    extraTabs: [{ key: 'locations', label: 'Locations' }],
  },
  national_red_plaque: standard('Features'),
  merch: standard('Features'),
  red_knights: standard('Features'),
  updates: standard('Features'),
  sorting: standard('Features'),
  information: standard('Features'),
  technical: standard('Features'),
  research_development: standard('Features'),
  tools: DEFAULT_LAYOUT,
  other: DEFAULT_LAYOUT,
}

export function layoutFor(type: ProjectType): TypeLayout {
  return TYPE_LAYOUTS[type] ?? DEFAULT_LAYOUT
}
