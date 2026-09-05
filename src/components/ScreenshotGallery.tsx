import { useRef, useState } from 'react'
import { ImagePlus, Star, Trash2 } from 'lucide-react'
import { useProjectData, asScreenshots } from '@/store/useProjectData'
import { useProjects } from '@/store/useProjects'
import { supabase } from '@/lib/supabase'
import { mshotUrl } from '@/lib/screenshot'
import { IconButton } from '@/components/ui-lite'
import type { Project } from '@/lib/types'

interface Entry {
  key: string
  label: string
  url: string
  deletable: boolean
}

export function ScreenshotGallery({ project }: { project: Project }) {
  const rows = useProjectData((s) => s.rows.project_screenshots)
  const { add, del } = useProjectData()
  const { update } = useProjects()
  const screenshots = asScreenshots(rows).slice().sort((a, b) => a.sort - b.sort)
  const fileRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pickedKey, setPickedKey] = useState<string | null>(null)

  const entries: Entry[] = []
  if (project.website_url) {
    const url = mshotUrl(project.website_url)
    if (url) entries.push({ key: 'live', label: 'Live Site', url, deletable: false })
  }
  if (project.test_site_url) {
    const url = mshotUrl(project.test_site_url)
    if (url) entries.push({ key: 'test', label: 'Test Site', url, deletable: false })
  }
  for (const s of screenshots) {
    entries.push({ key: s.id, label: s.label || 'Screenshot', url: s.url, deletable: true })
  }

  const activeKey =
    pickedKey && entries.some((e) => e.key === pickedKey)
      ? pickedKey
      : entries.some((e) => e.key === project.default_screenshot)
        ? project.default_screenshot!
        : (entries[0]?.key ?? null)
  const active = entries.find((e) => e.key === activeKey) ?? null

  const upload = async (file: File) => {
    setBusy(true)
    setError(null)
    const path = `${project.id}/${Date.now()}-${file.name}`
    const { error: upErr } = await supabase.storage
      .from('project-screenshots')
      .upload(path, file, { upsert: true, cacheControl: '3600' })
    if (upErr) {
      setError(upErr.message)
      setBusy(false)
      return
    }
    const { data } = supabase.storage.from('project-screenshots').getPublicUrl(path)
    const label = prompt('Label for this screenshot (optional)')?.trim() ?? ''
    const created = await add<{ id: string }>('project_screenshots', {
      project_id: project.id,
      url: data.publicUrl,
      label,
      sort: screenshots.length,
    })
    if (created) setPickedKey(created.id)
    setBusy(false)
  }

  const removeActive = async () => {
    if (!active || !active.deletable) return
    if (!confirm('Remove this screenshot?')) return
    await del('project_screenshots', active.key)
    setPickedKey(null)
  }

  const setAsDefault = async () => {
    if (!active) return
    await update(project.id, { default_screenshot: active.key })
  }

  if (entries.length === 0) {
    return (
      <div className="flex items-center gap-2 rounded-md border border-dashed border-border px-3 py-3">
        <p className="flex-1 text-xs text-muted-foreground">
          No screenshots yet. Set a Live/Test Site above for an automatic preview, or upload one.
        </p>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={busy}
          className="inline-flex h-7 shrink-0 items-center gap-1 rounded-md border border-border px-2 text-xs hover:bg-muted disabled:opacity-50"
        >
          <ImagePlus className="size-3" /> Add screenshot
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) void upload(file)
            e.target.value = ''
          }}
        />
      </div>
    )
  }

  return (
    <div className="space-y-1.5">
      {active && (
        <div className="relative overflow-hidden rounded-md">
          <img src={active.url} alt={active.label} className="max-h-72 w-full object-contain" />
          <div className="absolute right-1.5 top-1.5 flex items-center gap-1">
            <IconButton
              onClick={setAsDefault}
              title={project.default_screenshot === active.key ? 'Default screenshot' : 'Set as default'}
              className="border border-border bg-background/90 hover:bg-background"
            >
              <Star
                className={
                  'size-3.5 ' +
                  (project.default_screenshot === active.key ? 'fill-primary text-primary' : '')
                }
              />
            </IconButton>
            {active.deletable && (
              <IconButton
                onClick={removeActive}
                title="Remove"
                className="border border-border bg-background/90 hover:bg-background hover:text-destructive"
              >
                <Trash2 className="size-3.5" />
              </IconButton>
            )}
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-1.5">
        {entries.map((e) => (
          <button
            key={e.key}
            type="button"
            onClick={() => setPickedKey(e.key)}
            title={e.label}
            className={
              'h-10 w-16 shrink-0 overflow-hidden rounded border object-cover ' +
              (e.key === activeKey ? 'border-primary ring-1 ring-primary' : 'border-border opacity-70 hover:opacity-100')
            }
          >
            <img src={e.url} alt={e.label} className="size-full object-cover" />
          </button>
        ))}
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={busy}
          className="inline-flex h-10 shrink-0 items-center gap-1 rounded-md border border-dashed border-border px-2 text-xs text-muted-foreground hover:bg-muted disabled:opacity-50"
        >
          <ImagePlus className="size-3" /> Add
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) void upload(file)
            e.target.value = ''
          }}
        />
      </div>
      {active && <p className="text-[11px] text-muted-foreground">{active.label}</p>}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
