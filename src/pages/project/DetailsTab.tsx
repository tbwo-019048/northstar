import { useMemo, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { useProjectData, asDetails } from '@/store/useProjectData'
import { useProjects } from '@/store/useProjects'
import { EditableText, IconButton, Input, SecretField } from '@/components/ui-lite'
import { useDebouncedSave } from '@/hooks/useDebouncedSave'
import type { Project } from '@/lib/types'

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
      <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
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
        <label className="block">
          <span className="text-[11px] font-medium uppercase text-muted-foreground">Hours worked</span>
          <Input
            type="number"
            step="0.5"
            value={project.hours_worked ?? 0}
            onChange={(e) => update(projectId, { hours_worked: Number(e.target.value) || 0 })}
            className="mt-1 w-28"
          />
        </label>
      </div>

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
