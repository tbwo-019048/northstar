export type ProjectType = 'website' | 'app' | 'physical' | 'written' | 'other'
export type ProjectState =
  | 'concept'
  | 'commenced'
  | 'development'
  | 'mvp'
  | 'revised'
  | 'final'
  | 'support'
export type TodoStatus = 'todo' | 'completed'
export type Priority = 'urgent' | 'high' | 'medium' | 'low'
export type PipelineStatus = 'active' | 'completed' | 'archived'

export const PRIORITIES: Priority[] = ['urgent', 'high', 'medium', 'low']
export const PROJECT_TYPES: ProjectType[] = ['website', 'app', 'physical', 'written', 'other']
export const PROJECT_STATES: ProjectState[] = [
  'concept',
  'commenced',
  'development',
  'mvp',
  'revised',
  'final',
  'support',
]
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
  tech_stack: string[]
  countries: string[]
  created_by: string | null
  created_at: string
  updated_at: string
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
  source: 'manual' | 'pipeline'
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
