import { useEffect, useMemo, useRef, useState } from 'react'
import { ExclamationTriangleIcon } from '@/components/ui/exclamation-triangle'
import { ArrowDownTrayIcon } from '@/components/ui/arrow-down-tray'
import { PlusIcon } from '@/components/ui/plus'
import { TrashIcon } from '@/components/ui/trash'
import { ArrowUpTrayIcon } from '@/components/ui/arrow-up-tray'
import { useProjects } from '@/store/useProjects'
import { useTemplates } from '@/store/useTemplates'
import { useConfirm } from '@/store/useConfirm'
import {
  useProjectData,
  asPeople,
  asTodos,
  asFeatures,
  asRequests,
  asDetails,
  asPlanItems,
  asPipelines,
  asPipelineItems,
} from '@/store/useProjectData'
import {
  PRIORITIES,
  PROJECT_TYPES,
  type Priority,
  type Project,
  type ProjectTemplate,
  type TemplatePayload,
} from '@/lib/types'
import { ColorDot, EditableText, Input } from '@/components/ui-lite'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/velobits/dialog'
import { parseCSV, downloadText } from '@/lib/csv'
import { resolveTechIds } from '@/lib/techStack'
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
                  <TrashIcon size={14} />
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
            <PlusIcon size={12} /> Add
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

      <TemplatesSection project={project} />
    </div>
  )
}

const TEMPLATE_PARTS = [
  ['details', 'Details'],
  ['features', 'Features'],
  ['todos', 'Open to-dos'],
  ['plan_items', 'Plan items'],
  ['pipelines', 'Pipelines'],
] as const
type TemplatePart = (typeof TEMPLATE_PARTS)[number][0]

function templateCounts(t: ProjectTemplate): string {
  const p = t.payload
  const bits = [
    p.details?.length && `${p.details.length} details`,
    p.features?.length && `${p.features.length} features`,
    p.todos?.length && `${p.todos.length} to-dos`,
    p.plan_items?.length && `${p.plan_items.length} plan items`,
    p.pipelines?.length && `${p.pipelines.length} pipelines`,
  ].filter(Boolean)
  return bits.length ? bits.join(' · ') : 'empty'
}

function TemplatesSection({ project }: { project: Project }) {
  const { templates, loaded, load, subscribe, create, update, remove } = useTemplates()
  const confirm = useConfirm()
  const detailRows = useProjectData((s) => s.rows.details)
  const featureRows = useProjectData((s) => s.rows.features)
  const todoRows = useProjectData((s) => s.rows.todos)
  const planRows = useProjectData((s) => s.rows.plan_items)
  const pipeRows = useProjectData((s) => s.rows.pipelines)
  const pipeItemRows = useProjectData((s) => s.rows.pipeline_items)

  useEffect(() => {
    if (!loaded) load()
    return subscribe()
  }, [loaded, load, subscribe])

  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [parts, setParts] = useState<Record<TemplatePart, boolean>>({
    details: true,
    features: true,
    todos: true,
    plan_items: true,
    pipelines: true,
  })
  const [busy, setBusy] = useState(false)

  const buildPayload = (): TemplatePayload => {
    const p: TemplatePayload = {}
    if (project.summary) p.summary = project.summary
    if (parts.details) {
      p.details = asDetails(detailRows).map((d) => ({
        section: d.section,
        label: d.label,
        value: d.value,
      }))
    }
    if (parts.features) {
      p.features = asFeatures(featureRows).map((f) => ({ title: f.title, description: f.description }))
    }
    if (parts.todos) {
      p.todos = asTodos(todoRows)
        .filter((t) => t.status === 'todo')
        .map((t) => ({
          title: t.title,
          subtitle: t.subtitle,
          type: t.type,
          priority: t.priority,
          description: t.description,
        }))
    }
    if (parts.plan_items) {
      p.plan_items = asPlanItems(planRows).map((i) => ({
        title: i.title,
        description: i.description,
        status: i.status,
        priority: i.priority,
      }))
    }
    if (parts.pipelines) {
      const items = asPipelineItems(pipeItemRows)
      p.pipelines = asPipelines(pipeRows).map((pl) => ({
        name: pl.name,
        estimate_hours: pl.estimate_hours,
        items: items
          .filter((it) => it.pipeline_id === pl.id)
          .sort((a, b) => a.sort - b.sort)
          .map((it) => it.body)
          .filter(Boolean),
      }))
    }
    return p
  }

  const save = async () => {
    if (!name.trim() || busy) return
    setBusy(true)
    const { error } = await create(name.trim(), description.trim(), project.type, buildPayload())
    setBusy(false)
    if (!error) {
      setOpen(false)
      setName('')
      setDescription('')
    }
  }

  return (
    <section className="space-y-2">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Templates
      </h2>
      <p className="text-xs text-muted-foreground">
        Save this project's structure as a reusable template, or manage existing ones. New
        projects can be seeded from a template in the <strong>New</strong> form on the Projects
        page. Passwords, tokens and environment variables are never captured.
      </p>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-7 items-center gap-1 rounded-md border border-border px-2 text-xs hover:bg-muted"
      >
        <PlusIcon size={12} /> Save as template
      </button>

      <div className="divide-y divide-border rounded-md border border-border">
        {templates.map((t) => (
          <div key={t.id} className="flex items-center gap-2 px-2 py-1.5">
            <div className="min-w-0 flex-1">
              <EditableText
                value={t.name}
                placeholder="Untitled template"
                onSave={(v) => update(t.id, { name: v })}
                className="text-sm font-medium"
              />
              <span className="block truncate text-[11px] text-muted-foreground">
                {templateCounts(t)}
                {t.description ? ` — ${t.description}` : ''}
              </span>
            </div>
            <button
              type="button"
              onClick={async () => {
                if (await confirm({ title: `Delete template "${t.name || 'Untitled'}"?` }))
                  remove(t.id)
              }}
              className="grid size-6 place-items-center rounded text-muted-foreground hover:text-destructive"
            >
              <TrashIcon size={14} />
            </button>
          </div>
        ))}
        {templates.length === 0 && (
          <p className="px-2 py-4 text-center text-xs text-muted-foreground">No templates yet.</p>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        {open && (
          <DialogContent aria-describedby={undefined} focusFirstField>
            <DialogHeader>
              <DialogTitle>Save as template</DialogTitle>
            </DialogHeader>
            <label className="block space-y-1">
              <span className="text-[11px] font-medium uppercase text-muted-foreground">Name</span>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Standard website" />
            </label>
            <label className="block space-y-1">
              <span className="text-[11px] font-medium uppercase text-muted-foreground">
                Description
              </span>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional"
              />
            </label>
            <div className="space-y-1">
              <span className="text-[11px] font-medium uppercase text-muted-foreground">Include</span>
              {TEMPLATE_PARTS.map(([key, label]) => (
                <label key={key} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={parts[key]}
                    onChange={(e) => setParts((prev) => ({ ...prev, [key]: e.target.checked }))}
                    className="size-3.5 accent-primary"
                  />
                  {label}
                </label>
              ))}
            </div>
            <div className="flex justify-end gap-2 border-t border-border pt-3">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="h-7 rounded-md px-2 text-xs text-muted-foreground hover:bg-muted"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={save}
                disabled={busy || !name.trim()}
                className="h-7 rounded-md bg-primary px-3 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {busy ? 'Saving…' : 'Save template'}
              </button>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </section>
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
          if (typeof projectRow.tech_stack === 'string' && projectRow.tech_stack.trim()) {
            patchProject.tech_stack = resolveTechIds(projectRow.tech_stack)
          }
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
        Download this project (Project, Users, To-Do, Features, Requests, Details) as an Excel
        workbook, edit it, and upload it back — rows with an existing id are updated, new rows are
        created, and nothing is ever deleted by an import. The Project sheet carries name, type,
        summary, hours, URLs and the tech stack (comma-separated names, matched against the Tech
        Stack catalogue on import). A plain CSV upload is treated as a Users list (matched by name)
        since a CSV can't hold multiple sheets. Passwords, tokens and environment variables are
        never included — manage those in their own masked fields.
      </p>
      <div className="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          onClick={downloadExcel}
          className="inline-flex h-7 items-center gap-1 rounded-md border border-border px-2 text-xs hover:bg-muted"
        >
          <ArrowDownTrayIcon size={12} /> Download Excel
        </button>
        <button
          type="button"
          onClick={downloadUsersCsv}
          className="inline-flex h-7 items-center gap-1 rounded-md border border-border px-2 text-xs hover:bg-muted"
        >
          <ArrowDownTrayIcon size={12} /> Download Users CSV
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => fileRef.current?.click()}
          className="inline-flex h-7 items-center gap-1 rounded-md border border-border px-2 text-xs hover:bg-muted disabled:opacity-50"
        >
          <ArrowUpTrayIcon size={12} /> {busy ? 'Importing…' : 'Upload (.xlsx or .csv)'}
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
          <ExclamationTriangleIcon size={12} className="shrink-0" /> {error}
        </p>
      )}
    </section>
  )
}

function csvEscape(v: string | number) {
  const s = String(v ?? '')
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}
