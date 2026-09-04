import { useRef, useState } from 'react'
import { ImageUp, Loader2, User as UserIcon } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'

/** A person's circular avatar. Read-only by default; pass `editable` +
 * `onChange` to upload a new photo to the public `avatars` Storage bucket. */
export function PersonAvatar({
  personId,
  name,
  url,
  size = 'md',
  editable = false,
  onChange,
  className,
}: {
  personId: string
  name: string
  url: string | null
  size?: 'sm' | 'md' | 'lg'
  editable?: boolean
  onChange?: (url: string) => void
  className?: string
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const dims = size === 'lg' ? 'size-16' : size === 'sm' ? 'size-6' : 'size-10'

  const upload = async (file: File) => {
    setBusy(true)
    setError(null)
    const ext = file.name.split('.').pop() || 'png'
    const path = `${personId}/avatar-${Date.now()}.${ext}`
    const { error: upErr } = await supabase.storage
      .from('avatars')
      .upload(path, file, { upsert: true, cacheControl: '3600' })
    if (upErr) {
      setError(upErr.message)
      setBusy(false)
      return
    }
    const { data } = supabase.storage.from('avatars').getPublicUrl(path)
    onChange?.(data.publicUrl)
    setBusy(false)
  }

  const content = url ? (
    <img src={url} alt="" className={cn(dims, 'rounded-full object-cover')} />
  ) : (
    <div className={cn(dims, 'grid place-items-center rounded-full bg-muted text-muted-foreground')}>
      {name ? (
        <span className={size === 'lg' ? 'text-lg font-semibold uppercase' : 'text-xs font-semibold uppercase'}>
          {name.slice(0, 2)}
        </span>
      ) : (
        <UserIcon className="size-1/2" />
      )}
    </div>
  )

  if (!editable) return <div className={className}>{content}</div>

  return (
    <div className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        title="Upload a photo"
        className={cn(dims, 'group relative overflow-hidden rounded-full hover:ring-2 hover:ring-ring')}
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
      {error && <p className="absolute top-full mt-1 w-32 text-[10px] text-destructive">{error}</p>}
    </div>
  )
}
