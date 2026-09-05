import { useRef, useState } from 'react'
import { Download, ExternalLink, File, Link2, Plus, Trash2 } from 'lucide-react'
import { useProjectData, asAssets } from '@/store/useProjectData'
import { supabase } from '@/lib/supabase'
import { Input, IconButton } from '@/components/ui-lite'

function formatSize(bytes: number | null) {
  if (!bytes) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function AssetsTab({ projectId }: { projectId: string }) {
  const rows = useProjectData((s) => s.rows.project_assets)
  const { add, del } = useProjectData()
  const assets = asAssets(rows).slice().sort((a, b) => a.sort - b.sort)
  const fileRef = useRef<HTMLInputElement>(null)
  const [addingLink, setAddingLink] = useState(false)
  const [label, setLabel] = useState('')
  const [url, setUrl] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const addLink = (e: React.FormEvent) => {
    e.preventDefault()
    if (!url.trim()) return
    add('project_assets', {
      project_id: projectId,
      kind: 'link',
      label: label.trim() || url.trim(),
      url: url.trim(),
      sort: assets.length,
    })
    setLabel('')
    setUrl('')
    setAddingLink(false)
  }

  const uploadFile = async (file: File) => {
    setBusy(true)
    setError(null)
    const path = `${projectId}/${Date.now()}-${file.name}`
    const { error: upErr } = await supabase.storage
      .from('project-assets')
      .upload(path, file, { upsert: true, cacheControl: '3600' })
    if (upErr) {
      setError(upErr.message)
      setBusy(false)
      return
    }
    const { data } = supabase.storage.from('project-assets').getPublicUrl(path)
    await add('project_assets', {
      project_id: projectId,
      kind: 'file',
      label: file.name,
      url: data.publicUrl,
      file_name: file.name,
      file_size: file.size,
      sort: assets.length,
    })
    setBusy(false)
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Assets · {assets.length}
        </h2>
        <button
          type="button"
          onClick={() => setAddingLink((v) => !v)}
          className="inline-flex h-6 items-center gap-1 rounded-md border border-border px-1.5 text-xs hover:bg-muted"
        >
          <Link2 className="size-3" /> Add link
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => fileRef.current?.click()}
          className="inline-flex h-6 items-center gap-1 rounded-md border border-border px-1.5 text-xs hover:bg-muted disabled:opacity-50"
        >
          <Plus className="size-3" /> {busy ? 'Uploading…' : 'Upload file'}
        </button>
        <input
          ref={fileRef}
          type="file"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) void uploadFile(file)
            e.target.value = ''
          }}
        />
      </div>

      {addingLink && (
        <form onSubmit={addLink} className="flex flex-wrap items-center gap-1.5 rounded-md border border-border bg-muted/30 p-2">
          <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Label (optional)" className="max-w-[160px]" />
          <Input
            autoFocus
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://…"
            className="max-w-sm"
          />
          <button className="h-7 rounded-md bg-primary px-2.5 text-xs font-medium text-primary-foreground hover:bg-primary/90">
            Add
          </button>
          <button
            type="button"
            onClick={() => setAddingLink(false)}
            className="h-7 rounded-md px-2 text-xs text-muted-foreground hover:bg-muted"
          >
            Cancel
          </button>
        </form>
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}

      <div className="divide-y divide-border rounded-md border border-border">
        {assets.map((a) => (
          <div key={a.id} className="group flex items-center gap-2 px-2 py-1.5 text-sm">
            {a.kind === 'link' ? (
              <Link2 className="size-3.5 shrink-0 text-muted-foreground" />
            ) : (
              <File className="size-3.5 shrink-0 text-muted-foreground" />
            )}
            <a
              href={a.url}
              target="_blank"
              rel="noreferrer"
              download={a.kind === 'file' ? a.file_name || undefined : undefined}
              className="min-w-0 flex-1 truncate hover:underline"
            >
              {a.label}
            </a>
            {a.kind === 'file' && a.file_size && (
              <span className="shrink-0 text-[11px] text-muted-foreground">{formatSize(a.file_size)}</span>
            )}
            {a.kind === 'link' ? (
              <ExternalLink className="size-3 shrink-0 text-muted-foreground" />
            ) : (
              <Download className="size-3 shrink-0 text-muted-foreground" />
            )}
            <IconButton
              onClick={() => del('project_assets', a.id)}
              className="opacity-0 group-hover:opacity-100 hover:text-destructive"
            >
              <Trash2 className="size-3.5" />
            </IconButton>
          </div>
        ))}
        {assets.length === 0 && (
          <p className="px-2 py-6 text-center text-xs text-muted-foreground">
            No assets yet — add a link or upload a file.
          </p>
        )}
      </div>
    </div>
  )
}
