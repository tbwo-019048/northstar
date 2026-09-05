import type * as XLSXType from 'xlsx'
import type { Detail, Feature, Person, Project, RequestItem, Todo } from '@/lib/types'

/**
 * Full-project Excel workbook — one sheet per flat entity (Project, Users,
 * To-Do, Features, Requests, Details). Deliberately excludes secrets
 * (passwords, API tokens, env vars) so a downloaded file isn't a bigger
 * credential-leak surface than the masked fields already are, and excludes
 * Pipelines, whose two-level (pipeline -> points) shape doesn't fit a flat
 * sheet — those already have their own .txt export.
 *
 * `xlsx` is only ever dynamically imported (never a top-level import) so its
 * ~500kB doesn't land in the main bundle for people who never open this tab.
 */

export interface ProjectWorkbookData {
  people: Person[]
  todos: Todo[]
  features: Feature[]
  requests: RequestItem[]
  details: Detail[]
}

export const SHEET_NAMES = {
  project: 'Project',
  users: 'Users',
  todos: 'To-Do',
  features: 'Features',
  requests: 'Requests',
  details: 'Details',
} as const

export async function buildProjectWorkbook(
  project: Project,
  data: ProjectWorkbookData,
): Promise<XLSXType.WorkBook> {
  const XLSX = await import('xlsx')
  const wb = XLSX.utils.book_new()

  const projectSheet = XLSX.utils.json_to_sheet([
    {
      name: project.name,
      type: project.type,
      summary: project.summary,
      hours_worked: project.hours_worked,
      website_url: project.website_url ?? '',
      test_site_url: project.test_site_url ?? '',
      github_repo: project.github_repo ?? '',
    },
  ])
  XLSX.utils.book_append_sheet(wb, projectSheet, SHEET_NAMES.project)

  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(
      data.people.map((p) => ({
        id: p.id,
        username: p.username,
        name: p.name,
        position: p.position,
        notes: p.notes,
      })),
    ),
    SHEET_NAMES.users,
  )

  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(
      data.todos.map((t) => ({
        id: t.id,
        title: t.title,
        subtitle: t.subtitle,
        type: t.type,
        priority: t.priority,
        status: t.status,
        description: t.description,
      })),
    ),
    SHEET_NAMES.todos,
  )

  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(
      data.features.map((f) => ({ id: f.id, title: f.title, description: f.description, source: f.source })),
    ),
    SHEET_NAMES.features,
  )

  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(
      data.requests.map((r) => ({
        id: r.id,
        title: r.title,
        subtitle: r.subtitle,
        requested_by: r.requested_by,
        priority: r.priority,
        status: r.status,
        notes: r.notes,
      })),
    ),
    SHEET_NAMES.requests,
  )

  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(
      data.details.map((d) => ({ id: d.id, section: d.section, label: d.label, value: d.value })),
    ),
    SHEET_NAMES.details,
  )

  return wb
}

export async function downloadWorkbook(wb: XLSXType.WorkBook, filename: string) {
  const XLSX = await import('xlsx')
  XLSX.writeFile(wb, filename)
}

export async function readWorkbookFile(file: File): Promise<XLSXType.WorkBook> {
  const XLSX = await import('xlsx')
  const buf = await file.arrayBuffer()
  return XLSX.read(buf, { type: 'array' })
}

export async function sheetRows(
  wb: XLSXType.WorkBook,
  sheetName: string,
): Promise<Record<string, unknown>[]> {
  const sheet = wb.Sheets[sheetName]
  if (!sheet) return []
  const XLSX = await import('xlsx')
  return XLSX.utils.sheet_to_json(sheet, { defval: '' })
}

const str = (v: unknown) => (v === undefined || v === null ? '' : String(v))

export function rowsToPeoplePatch(rows: Record<string, unknown>[]) {
  return rows.map((r) => ({
    id: str(r.id) || null,
    fields: { username: str(r.username), name: str(r.name), position: str(r.position), notes: str(r.notes) },
  }))
}

export function rowsToTodosPatch(rows: Record<string, unknown>[]) {
  return rows.map((r) => ({
    id: str(r.id) || null,
    fields: {
      title: str(r.title),
      subtitle: str(r.subtitle),
      type: str(r.type) || 'feature',
      priority: str(r.priority) || 'medium',
      status: str(r.status) || 'todo',
      description: str(r.description),
    },
  }))
}

export function rowsToFeaturesPatch(rows: Record<string, unknown>[]) {
  return rows.map((r) => ({
    id: str(r.id) || null,
    fields: { title: str(r.title), description: str(r.description), source: str(r.source) || 'manual' },
  }))
}

export function rowsToRequestsPatch(rows: Record<string, unknown>[]) {
  return rows.map((r) => ({
    id: str(r.id) || null,
    fields: {
      title: str(r.title),
      subtitle: str(r.subtitle),
      requested_by: str(r.requested_by),
      priority: str(r.priority) || 'medium',
      status: str(r.status) || 'todo',
      notes: str(r.notes),
    },
  }))
}

export function rowsToDetailsPatch(rows: Record<string, unknown>[]) {
  return rows.map((r) => ({
    id: str(r.id) || null,
    fields: { section: str(r.section) || 'General', label: str(r.label), value: str(r.value) },
  }))
}
