import { useMemo, useRef, useState } from 'react'
import { Download, Plus, Search, Trash2, Upload, X } from 'lucide-react'
import { useProjectData, asDetails, asEnvVars } from '@/store/useProjectData'
import { useProjects } from '@/store/useProjects'
import { EditableText, IconButton, Input, Select, SecretField } from '@/components/ui-lite'
import { useDebouncedSave } from '@/hooks/useDebouncedSave'
import { parseDotEnv, serializeDotEnv } from '@/lib/dotenv'
import { downloadText } from '@/lib/csv'
import { TECH_CATALOG, TECH_BY_ID, TECH_CATEGORIES } from '@/lib/techStack'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/velobits/dialog'
import { PROJECT_STATES, type Project, type ProjectState } from '@/lib/types'
import { formatState } from '@/lib/projectState'

export function DetailsTab({ project }: { project: Project }) {
  const projectId = project.id
  const rows = useProjectData((s) => s.rows.details)
  const { add, patch, del } = useProjectData()
  const { update } = useProjects()
  const details = asDetails(rows)
  const [newSection, setNewSection] = useState('')
  const isAppOrSite = project.type === 'website' || project.type === 'app'

  const grouped = useMemo(() => {
    const m = new Map<string, typeof details>()
    for (const d of details.slice().sort((a, b) => a.sort - b.sort)) {
      const k = d.section || 'General'
      if (!m.has(k)) m.set(k, [])
      m.get(k)!.push(d)
    }
    return [...m.entries()]
  }, [details])

  const [summary, setSummary, sumStatus] = useDebouncedSave(project.summary ?? '', async (v) => {
    await update(projectId, { summary: v })
  })

  const addRow = (section: string) =>
    add('details', { project_id: projectId, section, label: 'Label', value: '', sort: details.length })

  return (
    <div className="space-y-3">
      <label className="block">
        <span className="text-[11px] font-medium uppercase text-muted-foreground">State</span>
        <Select
          value={project.state}
          onChange={(e) => update(projectId, { state: e.target.value as ProjectState })}
          className="mt-1 w-full sm:w-56"
        >
          {[...PROJECT_STATES, ...(PROJECT_STATES.includes(project.state) ? [] : [project.state])].map(
            (s) => (
              <option key={s} value={s}>
                {formatState(s)}
              </option>
            ),
          )}
        </Select>
      </label>

      <label className="block">
        <span className="text-[11px] font-medium uppercase text-muted-foreground">Hours worked</span>
        <Input
          type="number"
          step="0.5"
          value={project.hours_worked ?? 0}
          onChange={(e) => update(projectId, { hours_worked: Number(e.target.value) || 0 })}
          className="mt-1 w-full"
        />
      </label>

      <label className="block">
        <span className="text-[11px] font-medium uppercase text-muted-foreground">
          Summary {sumStatus !== 'idle' && <em className="not-italic text-primary">· {sumStatus}</em>}
        </span>
        <textarea
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          rows={2}
          className="mt-1 w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
          placeholder="What is this project, in a sentence or two…"
        />
      </label>

      {isAppOrSite && (
        <div className="overflow-hidden rounded-md border border-border">
          <div className="border-b border-border bg-muted/40 px-2 py-1">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Credentials &amp; IDs
            </span>
          </div>
          <div className="grid gap-3 p-2 sm:grid-cols-2">
            <label className="block">
              <span className="text-[11px] font-medium uppercase text-muted-foreground">Project ID</span>
              <SecretField
                className="mt-1"
                value={project.platform_project_id ?? ''}
                placeholder="e.g. the platform's project identifier"
                onChange={(e) => update(projectId, { platform_project_id: e.target.value })}
              />
            </label>
            <label className="block">
              <span className="text-[11px] font-medium uppercase text-muted-foreground">
                Verification token
              </span>
              <SecretField
                className="mt-1"
                value={project.verification_token ?? ''}
                placeholder="if the platform requires one"
                onChange={(e) => update(projectId, { verification_token: e.target.value })}
              />
            </label>
            <label className="block">
              <span className="text-[11px] font-medium uppercase text-muted-foreground">Public token</span>
              <SecretField
                className="mt-1"
                value={project.public_token ?? ''}
                onChange={(e) => update(projectId, { public_token: e.target.value })}
              />
            </label>
            <label className="block">
              <span className="text-[11px] font-medium uppercase text-muted-foreground">Private token</span>
              <SecretField
                className="mt-1"
                value={project.private_token ?? ''}
                onChange={(e) => update(projectId, { private_token: e.target.value })}
              />
            </label>
          </div>
        </div>
      )}

      <EnvVarsSection projectId={projectId} />

      <TechStackSection project={project} />

      {grouped.map(([section, items]) => (
        <div key={section} className="overflow-hidden rounded-md border border-border">
          <div className="flex items-center justify-between border-b border-border bg-muted/40 px-2 py-1">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              {section}
            </span>
            <button
              type="button"
              onClick={() => addRow(section)}
              className="inline-flex h-5 items-center gap-1 rounded px-1 text-[11px] text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <Plus className="size-3" /> Row
            </button>
          </div>
          <table className="w-full text-sm">
            <tbody>
              {items.map((d) => (
                <tr key={d.id} className="group border-b border-border last:border-0">
                  <td className="w-1/3 px-2 py-0.5 align-top">
                    <EditableText value={d.label} onSave={(v) => patch('details', d.id, { label: v })} className="text-muted-foreground" />
                  </td>
                  <td className="px-2 py-0.5 align-top">
                    <EditableText value={d.value} placeholder="—" multiline onSave={(v) => patch('details', d.id, { value: v })} />
                  </td>
                  <td className="w-8 px-1 py-0.5">
                    <IconButton onClick={() => del('details', d.id)} className="opacity-0 group-hover:opacity-100 hover:text-destructive">
                      <Trash2 className="size-3.5" />
                    </IconButton>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}

      <form
        onSubmit={(e) => {
          e.preventDefault()
          const s = newSection.trim()
          if (!s) return
          addRow(s)
          setNewSection('')
        }}
        className="flex items-center gap-1.5"
      >
        <Input
          value={newSection}
          onChange={(e) => setNewSection(e.target.value)}
          placeholder="New section (e.g. UI, Libraries, Materials)"
          className="max-w-xs"
        />
        <button className="inline-flex h-7 items-center gap-1 rounded-md border border-border px-2 text-xs hover:bg-muted">
          <Plus className="size-3" /> Section
        </button>
      </form>
    </div>
  )
}

function EnvVarsSection({ projectId }: { projectId: string }) {
  const rows = useProjectData((s) => s.rows.env_vars)
  const { add, patch, del } = useProjectData()
  const vars = asEnvVars(rows).slice().sort((a, b) => a.sort - b.sort)
  const fileRef = useRef<HTMLInputElement>(null)

  const onUpload = async (file: File) => {
    const text = await file.text()
    const parsed = parseDotEnv(text)
    if (parsed.length === 0) {
      alert('No KEY=VALUE lines found in that file.')
      return
    }
    if (
      vars.length > 0 &&
      !confirm(`Replace the ${vars.length} existing variable(s) with the ${parsed.length} from this file?`)
    ) {
      return
    }
    await Promise.all(vars.map((v) => del('env_vars', v.id)))
    await Promise.all(
      parsed.map((v, i) => add('env_vars', { project_id: projectId, key: v.key, value: v.value, sort: i })),
    )
  }

  const downloadEnv = () => {
    downloadText('.env', serializeDotEnv(vars.map((v) => ({ key: v.key, value: v.value }))), 'text/plain')
  }

  return (
    <div className="overflow-hidden rounded-md border border-border">
      <div className="flex items-center gap-2 border-b border-border bg-muted/40 px-2 py-1">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Environment Variables
        </span>
        <div className="flex-1" />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="inline-flex h-5 items-center gap-1 rounded px-1 text-[11px] text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <Upload className="size-3" /> Upload .env
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".env,text/plain"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) void onUpload(file)
            e.target.value = ''
          }}
        />
        {vars.length > 0 && (
          <button
            type="button"
            onClick={downloadEnv}
            className="inline-flex h-5 items-center gap-1 rounded px-1 text-[11px] text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <Download className="size-3" /> Download
          </button>
        )}
        <button
          type="button"
          onClick={() => add('env_vars', { project_id: projectId, key: 'KEY', value: '', sort: vars.length })}
          className="inline-flex h-5 items-center gap-1 rounded px-1 text-[11px] text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <Plus className="size-3" /> Row
        </button>
      </div>
      <table className="w-full text-sm">
        <tbody>
          {vars.map((v) => (
            <tr key={v.id} className="group border-b border-border last:border-0">
              <td className="w-1/3 px-2 py-0.5 align-top">
                <EditableText
                  value={v.key}
                  onSave={(val) => patch('env_vars', v.id, { key: val })}
                  className="font-mono text-xs text-muted-foreground"
                />
              </td>
              <td className="px-2 py-0.5 align-top">
                <SecretField
                  value={v.value}
                  onChange={(e) => patch('env_vars', v.id, { value: e.target.value })}
                  className="h-6 border-transparent bg-transparent font-mono text-xs hover:border-border focus:bg-background"
                />
              </td>
              <td className="w-8 px-1 py-0.5">
                <IconButton onClick={() => del('env_vars', v.id)} className="opacity-0 group-hover:opacity-100 hover:text-destructive">
                  <Trash2 className="size-3.5" />
                </IconButton>
              </td>
            </tr>
          ))}
          {vars.length === 0 && (
            <tr>
              <td colSpan={3} className="px-2 py-4 text-center text-xs text-muted-foreground">
                No variables yet — upload a .env file or add one manually.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

function TechStackSection({ project }: { project: Project }) {
  const { update } = useProjects()
  const [pickerOpen, setPickerOpen] = useState(false)
  const selected = project.tech_stack

  const toggle = (id: string) => {
    const next = selected.includes(id) ? selected.filter((t) => t !== id) : [...selected, id]
    update(project.id, { tech_stack: next })
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Tech Stack
        </h2>
        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          className="inline-flex h-6 items-center gap-1 rounded-md border border-border px-1.5 text-xs hover:bg-muted"
        >
          <Plus className="size-3" /> Add
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {selected.map((id) => {
          const tech = TECH_BY_ID[id]
          if (!tech) return null
          return (
            <div key={id} className="group relative flex w-16 flex-col items-center gap-1 rounded-md p-1.5 text-center hover:bg-muted/60">
              <img src={tech.iconUrl} alt="" className="size-8 object-contain" />
              <span className="w-full truncate text-[11px] text-muted-foreground">{tech.name}</span>
              <button
                type="button"
                onClick={() => toggle(id)}
                className="absolute -right-1 -top-1 grid size-4 place-items-center rounded-full bg-destructive text-white opacity-0 group-hover:opacity-100"
              >
                <X className="size-3" />
              </button>
            </div>
          )
        })}
        {selected.length === 0 && (
          <p className="px-1 py-2 text-xs text-muted-foreground">
            No tech recorded yet — click Add to pick frameworks, UI libraries and tools.
          </p>
        )}
      </div>

      <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
        {pickerOpen && (
          <DialogContent size="lg" aria-describedby={undefined}>
            <DialogHeader>
              <DialogTitle>Tech Stack</DialogTitle>
            </DialogHeader>
            <TechPicker selected={selected} onToggle={toggle} />
          </DialogContent>
        )}
      </Dialog>
    </div>
  )
}

function TechPicker({ selected, onToggle }: { selected: string[]; onToggle: (id: string) => void }) {
  const [q, setQ] = useState('')
  const filtered = TECH_CATALOG.filter((t) => t.name.toLowerCase().includes(q.toLowerCase()))

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search frameworks, libraries, tools…"
          className="pl-7"
        />
      </div>
      <div className="max-h-96 space-y-3 overflow-y-auto pr-1">
        {TECH_CATEGORIES.map((cat) => {
          const items = filtered.filter((t) => t.category === cat)
          if (items.length === 0) return null
          return (
            <div key={cat}>
              <h3 className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                {cat}
              </h3>
              <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-6">
                {items.map((t) => {
                  const active = selected.includes(t.id)
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => onToggle(t.id)}
                      className={
                        'flex flex-col items-center gap-1 rounded-md border p-1.5 text-center transition-colors ' +
                        (active
                          ? 'border-primary bg-primary/10'
                          : 'border-transparent hover:bg-muted/60')
                      }
                    >
                      <img src={t.iconUrl} alt="" className="size-7 object-contain" />
                      <span className="w-full truncate text-[10px] text-muted-foreground">{t.name}</span>
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
        {filtered.length === 0 && (
          <p className="py-6 text-center text-xs text-muted-foreground">No matches.</p>
        )}
      </div>
    </div>
  )
}
