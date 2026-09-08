export type ProjectType = 'website' | 'app' | 'production' | 'physical' | 'written' | 'other'
export type ProjectState =
  | 'concept'
  | 'commenced'
  | 'development'
  | 'mvp'
  | 'revised'
  | 'final'
  | 'support'
  | 'retired'
export type TodoStatus = 'todo' | 'completed'
export type Priority = 'urgent' | 'high' | 'medium' | 'low'
export type PipelineStatus = 'active' | 'completed' | 'archived'
export type PlanStatus = 'requested' | 'in_progress' | 'delayed' | 'completed' | 'failed'

export const PRIORITIES: Priority[] = ['urgent', 'high', 'medium', 'low']
export const PLAN_STATUSES: PlanStatus[] = [
  'requested',
  'in_progress',
  'delayed',
  'completed',
  'failed',
]
export const PLAN_STATUS_LABEL: Record<PlanStatus, string> = {
  requested: 'Requested',
  in_progress: 'In Progress',
  delayed: 'Delayed',
  completed: 'Completed',
  failed: 'Failed',
}
export const PROJECT_TYPES: ProjectType[] = [
  'website',
  'app',
  'production',
  'physical',
  'written',
  'other',
]
export const PROJECT_STATES: ProjectState[] = [
  'concept',
  'commenced',
  'development',
  'mvp',
  'revised',
  'final',
  'support',
  'retired',
]

/** Planning kanban priority bands — a 0..10 plan-item priority folded into
 * three swimlanes. `PLAN_BAND_PRIORITY` is the value a card's priority snaps
 * to when it's dragged into a different band's lane. */
export type PlanBand = 'high' | 'medium' | 'low'
export const PLAN_BANDS: PlanBand[] = ['high', 'medium', 'low']
export const PLAN_BAND_LABEL: Record<PlanBand, string> = {
  high: 'High priority',
  medium: 'Medium priority',
  low: 'Low priority',
}
export const PLAN_BAND_PRIORITY: Record<PlanBand, number> = { high: 9, medium: 5, low: 2 }
export function planBand(n: number): PlanBand {
  return n >= 8 ? 'high' : n >= 4 ? 'medium' : 'low'
}
export const TODO_TYPES = ['feature', 'bug', 'chore', 'idea', 'research', 'other']

/** Projects with a real hosted URL — Details' Credentials section and
 * Summary's Live/Test Site + screenshots only make sense for these. */
export const SITE_TYPES: ProjectType[] = ['website', 'app']

export interface Project {
  id: string
  name: string
  type: ProjectType
  state: ProjectState
  summary: string
  hours_worked: number
  position: number
  logo_url: string | null
  website_url: string | null
  test_site_url: string | null
  default_screenshot: string | null
  github_repo: string | null
  verification_token: string | null
  platform_project_id: string | null
  public_token: string | null
  private_token: string | null
  position_colors: Record<string, string>
  priority_colors: Partial<Record<Priority, string>>
  planning_prefs: PlanningPrefs
  tech_stack: string[]
  countries: string[]
  created_by: string | null
  created_at: string
  updated_at: string
}

/** Per-project Planning-board flow controls, stored in `projects.planning_prefs`. */
export interface PlanningPrefs {
  /** Per-column work-in-progress limit; missing or 0 means no limit. */
  wip?: Partial<Record<PlanStatus, number>>
  swimlane?: 'none' | 'priority'
}

export interface Person {
  id: string
  project_id: string
  username: string
  name: string
  password: string
  position: string
  notes: string
  extra: Record<string, string>
  avatar_url: string | null
  sort: number
  created_at: string
  updated_at: string
}

/** A project-defined extra column shown on the Users table. */
export interface PersonColumn {
  id: string
  project_id: string
  label: string
  sort: number
  created_at: string
}

/** One row parsed from an uploaded .env file. */
export interface EnvVar {
  id: string
  project_id: string
  key: string
  value: string
  sort: number
  created_at: string
}

export interface PersonComment {
  id: string
  person_id: string
  author: string
  body: string
  created_at: string
}

export interface Attachment {
  name: string
  url: string
}

export interface Todo {
  id: string
  project_id: string
  title: string
  subtitle: string
  type: string
  priority: Priority
  status: TodoStatus
  description: string
  attachments: Attachment[]
  source_plan_item_id?: string | null
  sort: number
  created_at: string
  updated_at: string
}

export interface TodoComment {
  id: string
  todo_id: string
  author: string
  body: string
  created_at: string
}

export interface Feature {
  id: string
  project_id: string
  title: string
  description: string
  source: 'manual' | 'pipeline' | 'planning'
  source_plan_item_id?: string | null
  sort: number
  created_at: string
}

export interface Detail {
  id: string
  project_id: string
  section: string
  label: string
  value: string
  sort: number
  created_at: string
}

export interface RequestItem {
  id: string
  project_id: string
  title: string
  subtitle: string
  requested_by: string
  priority: Priority
  status: TodoStatus
  notes: string
  sort: number
  created_at: string
  updated_at: string
}

export interface Pipeline {
  id: string
  project_id: string
  name: string
  status: PipelineStatus
  estimate_hours: number
  sort: number
  created_at: string
  completed_at: string | null
}

export interface PlanPhoto {
  url: string
  caption?: string
}

export interface PlanItem {
  id: string
  project_id: string
  title: string
  description: string
  status: PlanStatus
  priority: number // 0..10
  start_date: string | null
  due_date: string | null
  photos: PlanPhoto[]
  source_request_id?: string | null
  sort: number
  created_at: string
  updated_at: string
}

export interface PlanComment {
  id: string
  plan_item_id: string
  author: string
  body: string
  created_at: string
}

export interface ProjectScreenshot {
  id: string
  project_id: string
  url: string
  label: string
  sort: number
  created_at: string
}

export type AssetKind = 'link' | 'file'

export interface ProjectAsset {
  id: string
  project_id: string
  kind: AssetKind
  label: string
  url: string
  file_name: string | null
  file_size: number | null
  sort: number
  created_at: string
}

export interface PipelineItem {
  id: string
  pipeline_id: string
  body: string
  done: boolean
  sort: number
  created_at: string
}

export interface Client {
  id: string
  name: string
  company: string
  photo_url: string | null
  company_logo_url: string | null
  email_domain: string
  email: string
  phone: string
  notes: string
  countries: string[]
  sort: number
  created_at: string
  updated_at: string
}

export interface ProjectClient {
  project_id: string
  client_id: string
  created_at: string
}

export interface EmailGroup {
  id: string
  name: string
  sort: number
  created_at: string
}

export interface EmailAccount {
  id: string
  group_id: string
  name: string
  email: string
  domain: string
  password: string
  notes: string
  sort: number
  created_at: string
  updated_at: string
}

export const DEFAULT_GROUPS = ['User', 'Admin', 'Advanced'] as const

export interface MemberGroup {
  name: string
  permissions: Record<string, boolean>
  created_at: string
}

export interface Member {
  id: string
  email: string
  display_name: string
  group_name: string
  is_master: boolean
  created_at: string
  updated_at: string
}

/** A reusable starting point for a new project — seeds rows on creation, or is
 * captured from an existing project on the Settings tab. */
export interface TemplatePayload {
  summary?: string
  details?: { section: string; label: string; value: string }[]
  features?: { title: string; description: string }[]
  todos?: {
    title: string
    subtitle?: string
    type?: string
    priority?: Priority
    description?: string
  }[]
  plan_items?: { title: string; description?: string; status?: PlanStatus; priority?: number }[]
  pipelines?: { name: string; estimate_hours?: number; items: string[] }[]
}

export interface ProjectTemplate {
  id: string
  name: string
  description: string
  type: ProjectType | null
  payload: TemplatePayload
  created_by: string | null
  created_at: string
  updated_at: string
}
