import { useMemo, useRef, useState } from 'react'
import { AlertTriangle, Download, Plus, Trash2, Upload } from 'lucide-react'
import { useProjects } from '@/store/useProjects'
import {
  useProjectData,
  asPeople,
  asTodos,
  asFeatures,
  asRequests,
  asDetails,
} from '@/store/useProjectData'
import { PRIORITIES, PROJECT_TYPES, type Priority, type Project } from '@/lib/types'
import { ColorDot, Input } from '@/components/ui-lite'
import { parseCSV, downloadText } from '@/lib/csv'
import {
  SHEET_NAMES,
  buildProjectWorkbook,
  downloadWorkbook,
  readWorkbookFile,
  sheetRows,
  rowsToDetailsPatch,
  rowsToFeaturesPatch,
  rowsToPeoplePatch,
  rowsToRequestsPatch,
  rowsToTodosPatch,
} from '@/lib/projectWorkbook'

const FALLBACK_PRIORITY_COLOR: Record<Priority, string> = {
  urgent: '#ef4444',
  high: '#f97316',
  medium: '#f59e0b',
  low: '#0ea5e9',
}

export function ProjectSettingsTab({ project }: { project: Project }) {
  const { update } = useProjects()
  const peopleRows = useProjectData((s) => s.rows.project_people)
  const usedPositions = useMemo(
    () => [...new Set(asPeople(peopleRows).map((p) => p.position).filter(Boolean))],
    [peopleRows],
  )
  const [newLabel, setNewLabel] = useState('')

  const positionColors = project.position_colors
  const labels = useMemo(
    () => [...new Set([...Object.keys(positionColors), ...usedPositions])],
    [positionColors, usedPositions],
  )

  const setPositionColor = (label: string, color: string) =>
    update(project.id, { position_colors: { ...positionColors, [label]: color } })

  const removePosition = (label: string) => {
    const next = { ...positionColors }
    delete next[label]
    update(project.id, { position_colors: next })
  }

  const setPriorityColor = (p: Priority, color: string) =>
    update(project.id, { priority_colors: { ...project.priority_colors, [p]: color } })

  return (
    <div className="space-y-4">
      <section className="space-y-2">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Position colors
        </h2>
        <p className="text-xs text-muted-foreground">
          Colors shown on each person's badge in the Users tab.
        </p>
        <div className="divide-y divide-border rounded-md border border-border">
          {labels.map((label) => {
            const color = positionColors[label] ?? '#64748b'
            return (
              <div key={label} className="flex items-center gap-2 px-2 py-1.5">
                <ColorDot color={color} />
                <span className="flex-1 truncate text-sm">{label}</span>
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setPositionColor(label, e.target.value)}
                  className="h-6 w-10 cursor-pointer rounded border border-border bg-transparent"
                />
                <button
                  type="button"
                  onClick={() => removePosition(label)}
                  className="grid size-6 place-items-center rounded text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>
            )
          })}
          {labels.length === 0 && (
            <p className="px-2 py-4 text-center text-xs text-muted-foreground">
              No positions yet — add one, or set a position on a user first.
            </p>
          )}
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            const l = newLabel.trim()
            if (!l) return
            setPositionColor(l, '#64748b')
            setNewLabel('')
          }}
          className="flex items-center gap-1.5"
        >
          <Input
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            placeholder="New position (e.g. Developer)"
            className="max-w-xs"
          />
          <button className="inline-flex h-7 items-center gap-1 rounded-md border border-border px-2 text-xs hover:bg-muted">
            <Plus className="size-3" /> Add
          </button>
        </form>
      </section>

      <section className="space-y-2">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Priority colors
        </h2>
        <p className="text-xs text-muted-foreground">
          Colors used for priority chips and dropdowns in Requests and To-Do.
        </p>
        <div className="divide-y divide-border rounded-md border border-border">
          {PRIORITIES.map((p) => {
            const color = project.priority_colors[p] ?? FALLBACK_PRIORITY_COLOR[p]
            return (
              <div key={p} className="flex items-center gap-2 px-2 py-1.5">
                <ColorDot color={color} />
                <span className="flex-1 truncate text-sm capitalize">{p}</span>
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setPriorityColor(p, e.target.value)}
                  className="h-6 w-10 cursor-pointer rounded border border-border bg-transparent"
                />
              </div>
            )
          })}
        </div>
      </section>

      <ImportExportSection project={project} />
    </div>
  )
}

function ImportExportSection({ project }: { project: Project }) {
  const { update } = useProjects()
  const peopleRows = useProjectData((s) => s.rows.project_people)
  const todoRows = useProjectData((s) => s.rows.todos)
  const featureRows = useProjectData((s) => s.rows.features)
  const requestRows = useProjectData((s) => s.rows.requests)
  const detailRows = useProjectData((s) => s.rows.details)
  const { add, patch } = useProjectData()
  const fileRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const people = asPeople(peopleRows)
  const todos = asTodos(todoRows)
  const features = asFeatures(featureRows)
  const requests = asRequests(requestRows)
  const details = asDetails(detailRows)

  const downloadExcel = async () => {
    const wb = await buildProjectWorkbook(project, { people, todos, features, requests, details })
    await downloadWorkbook(wb, `${project.name.replace(/\s+/g, '-').toLowerCase()}.xlsx`)
  }

  const downloadUsersCsv = () => {
    const csv =
      'name,username,position,notes\n' +
      people
        .map((p) => [p.name, p.username, p.position, p.notes].map(csvEscape).join(','))
        .join('\n')
    downloadText(`${project.name.replace(/\s+/g, '-').toLowerCase()}-users.csv`, csv, 'text/csv')
  }

  /** Create rows with no id, patch rows whose id matches something already
   * loaded. Never deletes — a partial upload can't wipe data it didn't
   * mention. Rows with an invalid value (e.g. a priority/status/type that
   * isn't one of the database's allowed values) fail individually rather
   * than aborting the whole sheet. */
  const applyRows = async <T extends { id: string }>(
    existing: T[],
    parsed: { id: string | null; fields: Record<string, unknown> }[],
    table: 'project_people' | 'todos' | 'features' | 'requests' | 'details',
    extra: Record<string, unknown>,
  ) => {
    let created = 0
    let updated = 0
    let failed = 0
    for (const [i, row] of parsed.entries()) {
      const existsHere = row.id && existing.some((e) => e.id === row.id)
      if (existsHere && row.id) {
        const { error } = await patch(table, row.id, row.fields)
        if (error) failed++
        else updated++
      } else {
        const created_ = await add(table, { ...extra, ...row.fields, sort: existing.length + i })
        if (created_) created++
        else failed++
      }
    }
    return { created, updated, failed }
  }

  const importWorkbook = async (file: File) => {
    setBusy(true)
    setError(null)
    setResult(null)
    try {
      const isCsv = /\.csv$/i.test(file.name)
      let totals = { created: 0, updated: 0, failed: 0 }

      if (isCsv) {
        // A CSV can only hold one table — treated as Users (name/username/
        // position/notes), matching by name since a plain CSV has no id column.
        const text = await file.text()
        const records = parseCSV(text)
        const parsed = records.map((r) => {
          const match = people.find((p) => p.name.toLowerCase() === (r.name ?? '').toLowerCase())
          return {
            id: match?.id ?? null,
            fields: {
              name: r.name ?? '',
              username: r.username ?? '',
              position: r.position ?? '',
              notes: r.notes ?? '',
            },
          }
        })
        totals = await applyRows(people, parsed, 'project_people', { project_id: project.id })
      } else {
        const wb = await readWorkbookFile(file)

        const projectRow = (await sheetRows(wb, SHEET_NAMES.project))[0]
        if (projectRow) {
          const patchProject: Partial<Project> = {}
          if (typeof projectRow.name === 'string' && projectRow.name) patchProject.name = projectRow.name
          if (typeof projectRow.type === 'string' && PROJECT_TYPES.includes(projectRow.type as never)) {
            patchProject.type = projectRow.type as Project['type']
          }
          if (typeof projectRow.summary === 'string') patchProject.summary = projectRow.summary
          if (projectRow.hours_worked !== undefined && projectRow.hours_worked !== '') {
            patchProject.hours_worked = Number(projectRow.hours_worked) || 0
          }
          if (typeof projectRow.website_url === 'string') patchProject.website_url = projectRow.website_url || null
          if (typeof projectRow.test_site_url === 'string') {
            patchProject.test_site_url = projectRow.test_site_url || null
          }
          if (typeof projectRow.github_repo === 'string') patchProject.github_repo = projectRow.github_repo || null
          await update(project.id, patchProject)
        }

        const [usersSheet, todosSheet, featuresSheet, requestsSheet, detailsSheet] = await Promise.all([
          sheetRows(wb, SHEET_NAMES.users),
          sheetRows(wb, SHEET_NAMES.todos),
          sheetRows(wb, SHEET_NAMES.features),
          sheetRows(wb, SHEET_NAMES.requests),
          sheetRows(wb, SHEET_NAMES.details),
        ])

        const parts = await Promise.all([
          applyRows(people, rowsToPeoplePatch(usersSheet), 'project_people', { project_id: project.id }),
          applyRows(todos, rowsToTodosPatch(todosSheet), 'todos', { project_id: project.id }),
          applyRows(features, rowsToFeaturesPatch(featuresSheet), 'features', { project_id: project.id }),
          applyRows(requests, rowsToRequestsPatch(requestsSheet), 'requests', { project_id: project.id }),
          applyRows(details, rowsToDetailsPatch(detailsSheet), 'details', { project_id: project.id }),
        ])
        totals = parts.reduce(
          (a, b) => ({
            created: a.created + b.created,
            updated: a.updated + b.updated,
            failed: a.failed + b.failed,
          }),
          totals,
        )
      }

      setResult(
        `Imported: ${totals.created} created, ${totals.updated} updated` +
          (totals.failed ? `, ${totals.failed} failed (check priority/status/type values)` : '') +
          '. Nothing already there was deleted.',
      )
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Import failed.')
    }
    setBusy(false)
  }

  return (
    <section className="space-y-2">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Import / Export
      </h2>
      <p className="text-xs text-muted-foreground">
        Download this project (Users, To-Do, Features, Requests, Details) as an Excel workbook,
        edit it, and upload it back — rows with an existing id are updated, new rows are created,
        and nothing is ever deleted by an import. A plain CSV upload is treated as a Users list
        (matched by name) since a CSV can't hold multiple sheets. Passwords, tokens and
        environment variables are never included — manage those in their own masked fields.
      </p>
      <div className="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          onClick={downloadExcel}
          className="inline-flex h-7 items-center gap-1 rounded-md border border-border px-2 text-xs hover:bg-muted"
        >
          <Download className="size-3" /> Download Excel
        </button>
        <button
          type="button"
          onClick={downloadUsersCsv}
          className="inline-flex h-7 items-center gap-1 rounded-md border border-border px-2 text-xs hover:bg-muted"
        >
          <Download className="size-3" /> Download Users CSV
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => fileRef.current?.click()}
          className="inline-flex h-7 items-center gap-1 rounded-md border border-border px-2 text-xs hover:bg-muted disabled:opacity-50"
        >
          <Upload className="size-3" /> {busy ? 'Importing…' : 'Upload (.xlsx or .csv)'}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) void importWorkbook(file)
            e.target.value = ''
          }}
        />
      </div>
      {result && <p className="text-xs text-primary">{result}</p>}
      {error && (
        <p className="flex items-center gap-1 text-xs text-destructive">
          <AlertTriangle className="size-3 shrink-0" /> {error}
        </p>
      )}
    </section>
  )
}

function csvEscape(v: string | number) {
  const s = String(v ?? '')
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}
