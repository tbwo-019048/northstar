import { useRef, useState } from 'react'
import { Plus, Star, Trash2 } from 'lucide-react'
import { useProjectData, asAlbumArt } from '@/store/useProjectData'
import { useProjects } from '@/store/useProjects'
import { supabase } from '@/lib/supabase'
import { IconButton } from '@/components/ui-lite'
import type { Project } from '@/lib/types'

/** Upload cover-art candidates for a Music project; picking one sets it as
 * both the project's summary image and its icon (project.logo_url) — the
 * same field ProjectLogo.tsx already writes to. */
export function AlbumArtTab({ project }: { project: Project }) {
  const rows = useProjectData((s) => s.rows.album_art)
  const { add, del } = useProjectData()
  const { update } = useProjects()
  const art = asAlbumArt(rows).slice().sort((a, b) => a.sort - b.sort)
  const fileRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const uploadFile = async (file: File) => {
    setBusy(true)
    setError(null)
    const path = `${project.id}/${Date.now()}-${file.name}`
    const { error: upErr } = await supabase.storage
      .from('project-album-art')
      .upload(path, file, { upsert: true, cacheControl: '3600' })
    if (upErr) {
      setError(upErr.message)
      setBusy(false)
      return
    }
    const { data } = supabase.storage.from('project-album-art').getPublicUrl(path)
    await add('album_art', { project_id: project.id, url: data.publicUrl, sort: art.length })
    setBusy(false)
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Album Art · {art.length}
        </h2>
        <button
          type="button"
          disabled={busy}
          onClick={() => fileRef.current?.click()}
          className="inline-flex h-6 items-center gap-1 rounded-md border border-border px-1.5 text-xs hover:bg-muted disabled:opacity-50"
        >
          <Plus size={12} /> {busy ? 'Uploading…' : 'Upload image'}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) void uploadFile(file)
            e.target.value = ''
          }}
        />
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}

      {art.length === 0 ? (
        <p className="rounded-md border border-dashed border-border px-3 py-8 text-center text-xs text-muted-foreground">
          No album art yet — upload an image to pick as this project's cover.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {art.map((entry) => {
            const isIcon = project.logo_url === entry.url
            return (
              <div key={entry.id} className="group relative overflow-hidden rounded-md border border-border">
                <img src={entry.url} alt="Album art candidate" className="aspect-square w-full object-cover" />
                <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 bg-background/90 px-1.5 py-1 opacity-0 transition-opacity group-hover:opacity-100">
                  <button
                    type="button"
                    onClick={() => void update(project.id, { logo_url: entry.url })}
                    className="inline-flex items-center gap-1 rounded px-1 py-0.5 text-[11px] font-medium hover:bg-muted"
                  >
                    <Star size={11} className={isIcon ? 'fill-primary text-primary' : undefined} />
                    {isIcon ? 'Icon' : 'Set as icon'}
                  </button>
                  <IconButton onClick={() => void del('album_art', entry.id)} className="hover:text-destructive">
                    <Trash2 size={13} />
                  </IconButton>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
