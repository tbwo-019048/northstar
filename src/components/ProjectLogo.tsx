import { useRef, useState } from 'react'
import { ImageUp, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'
import type { Project } from '@/lib/types'

/**
 * Square project logo. Read-only by default; pass `editable` + `onChange` to
 * let the viewer click through to a file picker that uploads to the public
 * `project-logos` Storage bucket and reports back the new public URL.
 */
export function ProjectLogo({
  project,
  size = 'md',
  editable = false,
  onChange,
  className,
}: {
  project: Pick<Project, 'id' | 'name' | 'logo_url'>
  size?: 'xs' | 'sm' | 'md' | 'lg'
  editable?: boolean
  onChange?: (url: string) => void
  className?: string
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const dims =
    size === 'lg' ? 'size-16' : size === 'sm' ? 'size-6' : size === 'xs' ? 'size-4' : 'size-9'

  const upload = async (file: File) => {
    setBusy(true)
    setError(null)
    const ext = file.name.split('.').pop() || 'png'
    const path = `${project.id}/logo-${Date.now()}.${ext}`
    const { error: upErr } = await supabase.storage
      .from('project-logos')
      .upload(path, file, { upsert: true, cacheControl: '3600' })
    if (upErr) {
      setError(upErr.message)
      setBusy(false)
      return
    }
    const { data } = supabase.storage.from('project-logos').getPublicUrl(path)
    onChange?.(data.publicUrl)
    setBusy(false)
  }

  const content = project.logo_url ? (
    <img src={project.logo_url} alt="" className={cn(dims, 'rounded-md object-cover')} />
  ) : (
    <div
      className={cn(
        dims,
        'grid place-items-center rounded-md bg-muted text-muted-foreground',
      )}
    >
      <span
        className={cn(
          'font-semibold uppercase leading-none',
          size === 'xs' ? 'text-[7px]' : size === 'sm' ? 'text-[9px]' : 'text-xs',
        )}
      >
        {project.name.slice(0, 2)}
      </span>
    </div>
  )

  if (!editable) return <div className={className}>{content}</div>

  return (
    <div className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        title="Upload a logo"
        className={cn(dims, 'group relative overflow-hidden rounded-md ring-offset-2 ring-offset-background hover:ring-2 hover:ring-ring')}
      >
        {content}
        <span className="absolute inset-0 hidden items-center justify-center bg-black/40 group-hover:flex">
          {busy ? (
            <Loader2 className="size-4 animate-spin text-white" />
          ) : (
            <ImageUp className="size-4 text-white" />
          )}
        </span>
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
      {error && <p className="absolute top-full mt-1 w-40 text-[10px] text-destructive">{error}</p>}
    </div>
  )
}
