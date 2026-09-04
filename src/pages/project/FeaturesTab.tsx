import { Plus, Trash2 } from 'lucide-react'
import { useProjectData, asFeatures } from '@/store/useProjectData'
import { EditableText, IconButton, Chip } from '@/components/ui-lite'

export function FeaturesTab({ projectId }: { projectId: string }) {
  const rows = useProjectData((s) => s.rows.features)
  const { add, patch, del } = useProjectData()
  const features = asFeatures(rows).slice().sort((a, b) => a.sort - b.sort)

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Features · {features.length}
        </h2>
        <button
          type="button"
          onClick={() => add('features', { project_id: projectId, title: 'New feature', sort: features.length })}
          className="inline-flex h-6 items-center gap-1 rounded-md border border-border px-1.5 text-xs hover:bg-muted"
        >
          <Plus className="size-3" /> Add
        </button>
      </div>

      <div className="divide-y divide-border rounded-md border border-border">
        {features.map((f) => (
          <div key={f.id} className="group flex items-start gap-2 px-2 py-1.5">
            <span className="mt-1 size-1.5 shrink-0 rounded-full bg-primary" />
            <div className="min-w-0 flex-1">
              <EditableText
                value={f.title}
                placeholder="Feature title"
                onSave={(v) => patch('features', f.id, { title: v })}
                className="font-medium"
              />
              <EditableText
                value={f.description}
                placeholder="Description…"
                multiline
                onSave={(v) => patch('features', f.id, { description: v })}
                className="text-xs text-muted-foreground"
              />
            </div>
            {f.source === 'pipeline' && <Chip>from pipeline</Chip>}
            <IconButton onClick={() => del('features', f.id)} className="opacity-0 group-hover:opacity-100 hover:text-destructive">
              <Trash2 className="size-3.5" />
            </IconButton>
          </div>
        ))}
        {features.length === 0 && (
          <div className="px-2 py-6 text-center text-xs text-muted-foreground">
            No features recorded yet. Completed pipelines land here automatically.
          </div>
        )}
      </div>
    </div>
  )
}
