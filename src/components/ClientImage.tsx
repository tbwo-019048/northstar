import { useRef, useState } from 'react'
import { Building2, Loader2, UserRound } from 'lucide-react'
import { PhotoIcon } from '@/components/ui/photo'
import { supabase } from '@/lib/supabase'
import { cn } from '@/lib/utils'

export function ClientImage({
  clientId,
  name,
  url,
  kind,
  size = 'md',
  editable = false,
  onChange,
  className,
}: {
  clientId: string
  name: string
  url: string | null
  kind: 'photo' | 'company-logo'
  size?: 'sm' | 'md' | 'lg'
  editable?: boolean
  onChange?: (url: string) => void
  className?: string
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const dims = size === 'lg' ? 'size-16' : size === 'sm' ? 'size-7' : 'size-10'
  const rounded = kind === 'photo' ? 'rounded-full' : 'rounded-md'

  const upload = async (file: File) => {
    setBusy(true)
    setError(null)
    const ext = file.name.split('.').pop() || 'png'
    const path = `${clientId}/${kind}-${Date.now()}.${ext}`
    const { error: uploadError } = await supabase.storage
      .from('client-media')
      .upload(path, file, { upsert: true, cacheControl: '3600' })
    if (uploadError) {
      setError(uploadError.message)
      setBusy(false)
      return
    }
    const { data } = supabase.storage.from('client-media').getPublicUrl(path)
    onChange?.(data.publicUrl)
    setBusy(false)
  }

  const content = url ? (
    <img src={url} alt="" className={cn(dims, rounded, 'object-cover')} />
  ) : (
    <div className={cn(dims, rounded, 'grid place-items-center bg-muted text-muted-foreground')}>
      {kind === 'photo' && name ? (
        <span className="text-xs font-semibold uppercase">{name.slice(0, 2)}</span>
      ) : kind === 'photo' ? (
        <UserRound className="size-4" />
      ) : (
        <Building2 className="size-4" />
      )}
    </div>
  )

  if (!editable) return <div className={className}>{content}</div>

  return (
    <div className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        title={kind === 'photo' ? 'Upload client photo' : 'Upload company logo'}
        className={cn(dims, rounded, 'group relative overflow-hidden ring-offset-2 ring-offset-background hover:ring-2 hover:ring-ring')}
      >
        {content}
        <span className="absolute inset-0 hidden items-center justify-center bg-black/45 group-hover:flex">
          {busy ? <Loader2 className="size-4 animate-spin text-white" /> : <PhotoIcon size={16} className="text-white" />}
        </span>
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (file) void upload(file)
          event.target.value = ''
        }}
      />
      {error && <p className="absolute top-full z-10 mt-1 w-44 text-[10px] text-destructive">{error}</p>}
    </div>
  )
}
