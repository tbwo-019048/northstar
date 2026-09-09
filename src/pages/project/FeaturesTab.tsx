import { useState } from 'react'
import { PlusIcon } from '@/components/ui/plus'
import { TrashIcon } from '@/components/ui/trash'
import { useProjectData, asFeatures } from '@/store/useProjectData'
import { useDiagnostic } from '@/store/useDiagnostic'
import { visibleRows } from '@/lib/hidden'
import { HideToggle } from '@/components/HideToggle'
import { Markdown } from '@/components/Markdown'
import { EditableText, IconButton, Chip } from '@/components/ui-lite'
import { useDebouncedSave } from '@/hooks/useDebouncedSave'
import type { Feature } from '@/lib/types'

type Mode = 'view' | 'edit'
const MODE_KEY = 'northstar.features.mode'

export function FeaturesTab({ projectId, label }: { projectId: string; label?: string }) {
  const rows = useProjectData((s) => s.rows.features)
  const { add, patch, del } = useProjectData()
  const diagnostic = useDiagnostic((s) => s.on)
  const features = visibleRows(
    asFeatures(rows).slice().sort((a, b) => a.sort - b.sort),
    diagnostic,
  )
  const heading = label ?? 'Features'
  const newTitle = 'New ' + (label ? label.toLowerCase().replace(/s$/, '') : 'feature')

  const [mode, setMode] = useState<Mode>(() => {
    try {
      return (localStorage.getItem(MODE_KEY) as Mode) || 'view'
    } catch {
      return 'view'
    }
  })
  const setModePersist = (m: Mode) => {
    setMode(m)
    try {
      localStorage.setItem(MODE_KEY, m)
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {heading} · {features.length}
        </h2>
        {mode === 'edit' && (
          <button
            type="button"
            onClick={() => add('features', { project_id: projectId, title: newTitle, sort: features.length })}
            className="inline-flex h-6 items-center gap-1 rounded-md border border-border px-1.5 text-xs hover:bg-muted"
          >
            <PlusIcon size={12} /> Add
          </button>
        )}
        <div className="ml-auto flex items-center gap-0.5 rounded-md border border-border p-0.5">
          <button
            type="button"
            onClick={() => setModePersist('view')}
            className={
              'h-6 rounded px-2 text-xs ' +
              (mode === 'view' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground')
            }
          >
            View
          </button>
          <button
            type="button"
            onClick={() => setModePersist('edit')}
            className={
              'h-6 rounded px-2 text-xs ' +
              (mode === 'edit' ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground')
            }
          >
            Edit
          </button>
        </div>
      </div>

      {features.length === 0 ? (
        <div className="rounded-md border border-dashed border-border px-3 py-8 text-center text-xs text-muted-foreground">
          Nothing recorded yet. Completed pipelines land here automatically
          {mode === 'view' ? ' — switch to Edit to add one.' : '.'}
        </div>
      ) : mode === 'view' ? (
        <article className="space-y-6 rounded-md border border-border bg-background px-4 py-4">
          {features.map((f, idx) => (
            <section key={f.id} className={'space-y-1.5' + (f.hidden ? ' opacity-50' : '')}>
              <h3 className="flex items-baseline gap-2 text-base font-semibold">
                <span className="text-xs tabular-nums text-muted-foreground">{idx + 1}.</span>
                {f.title || 'Untitled'}
                {f.source === 'pipeline' && <Chip>from pipeline</Chip>}
              </h3>
              {f.description ? (
                <Markdown className="pl-5 text-muted-foreground">{f.description}</Markdown>
              ) : (
                <p className="pl-5 text-xs italic text-muted-foreground/70">No description.</p>
              )}
            </section>
          ))}
        </article>
      ) : (
        <div className="space-y-2">
          {features.map((f) => (
            <FeatureEditRow
              key={f.id}
              feature={f}
              diagnostic={diagnostic}
              onTitle={(v) => patch('features', f.id, { title: v })}
              onDescription={async (v) => {
                await patch('features', f.id, { description: v })
              }}
              onToggleHidden={(v) => patch('features', f.id, { hidden: v })}
              onDelete={() => del('features', f.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function FeatureEditRow({
  feature,
  diagnostic,
  onTitle,
  onDescription,
  onToggleHidden,
  onDelete,
}: {
  feature: Feature
  diagnostic: boolean
  onTitle: (v: string) => void
  onDescription: (v: string) => void | Promise<void>
  onToggleHidden: (v: boolean) => void
  onDelete: () => void
}) {
  const [desc, setDesc, status] = useDebouncedSave(feature.description, onDescription)

  return (
    <div
      className={
        'group rounded-md border border-border p-2' + (feature.hidden ? ' opacity-50' : '')
      }
    >
      <div className="flex items-center gap-2">
        {diagnostic && <HideToggle hidden={feature.hidden} onToggle={onToggleHidden} />}
        <span className="size-1.5 shrink-0 rounded-full bg-primary" />
        <div className="min-w-0 flex-1">
          <EditableText
            value={feature.title}
            placeholder="Title"
            onSave={onTitle}
            className="font-medium"
          />
        </div>
        {feature.source === 'pipeline' && <Chip>from pipeline</Chip>}
        {status !== 'idle' && <span className="text-[10px] text-primary">{status}</span>}
        <IconButton onClick={onDelete} className="hover:text-destructive">
          <TrashIcon size={14} />
        </IconButton>
      </div>
      <textarea
        value={desc}
        onChange={(e) => setDesc(e.target.value)}
        rows={Math.min(12, Math.max(3, desc.split('\n').length + 1))}
        placeholder="Description — Markdown supported (# headings, **bold**, - lists, `code`, links)…"
        className="mt-1.5 w-full rounded-md border border-border bg-background px-2 py-1.5 font-mono text-xs outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
      />
    </div>
  )
}
