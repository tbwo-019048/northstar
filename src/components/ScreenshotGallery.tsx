import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { PlusIcon } from '@/components/ui/plus'
import { StarIcon } from '@/components/ui/star'
import { TrashIcon } from '@/components/ui/trash'
import { useProjectData, asScreenshots } from '@/store/useProjectData'
import { useProjects } from '@/store/useProjects'
import { supabase } from '@/lib/supabase'
import { mshotUrl } from '@/lib/screenshot'
import { IconButton } from '@/components/ui-lite'
import { NorthStarIcon } from '@/components/NorthStarIcon'
import type { Project } from '@/lib/types'

interface Entry {
  key: string
  label: string
  url: string
  deletable: boolean
}

/** Shown in place of the raw mshots placeholder while a screenshot loads: a
 * NorthStar mark that spins one way, then the other, next to "Loading" with
 * dots that fill in one at a time (rather than a continuous one-way spin or
 * WordPress's own placeholder logo flashing up first). */
function PreviewSkeleton() {
  const [dots, setDots] = useState(1)
  const [angle, setAngle] = useState(0)
  const dirRef = useRef<1 | -1>(1)

  useEffect(() => {
    const id = setInterval(() => setDots((d) => (d % 3) + 1), 450)
    return () => clearInterval(id)
  }, [])

  useEffect(() => {
    const id = setInterval(() => {
      setAngle((a) => a + dirRef.current * 360)
      dirRef.current *= -1
    }, 1100)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="flex h-72 w-full items-center justify-center gap-3 bg-muted/30">
      <motion.div
        animate={{ rotate: angle }}
        transition={{ duration: 1.1, ease: 'linear' }}
      >
        <NorthStarIcon className="size-6 text-primary" />
      </motion.div>
      <p className="text-sm text-muted-foreground">
        Loading{'.'.repeat(dots)}
        <span className="invisible">{'.'.repeat(3 - dots)}</span>
      </p>
    </div>
  )
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
  const isLiveShot = active?.key === 'live' || active?.key === 'test'

  // mshots (Live/Test Site) often serves a "still generating" placeholder on
  // the first request — a plain onLoad can't tell that apart from the real
  // screenshot, so for those two entries only: keep the skeleton up and
  // re-fetch (cache-busted) a few times over ~9s, which is normally enough
  // for mshots to have rendered the real thing by the time it's revealed.
  // Uploaded screenshots have no such placeholder, so they just wait for
  // their one real onLoad.
  const [loaded, setLoaded] = useState(false)
  const [settled, setSettled] = useState(false)
  const [retryNonce, setRetryNonce] = useState(0)

  useEffect(() => {
    if (!active) return
    setRetryNonce(0)

    // If the browser already has this exact URL cached (e.g. flipping back
    // to a project/site you've already viewed this session), Image.complete
    // resolves synchronously — skip the skeleton entirely instead of
    // replaying the loading animation for an image that's already there.
    const probe = new Image()
    probe.src = isLiveShot ? `${active.url}&_r=0` : active.url
    const cached = probe.complete && probe.naturalWidth > 0
    setLoaded(cached)
    setSettled(cached)
    if (!isLiveShot || cached) return

    let tries = 0
    const MAX_TRIES = 3
    const id = setInterval(() => {
      tries += 1
      if (tries >= MAX_TRIES) {
        setSettled(true)
        clearInterval(id)
        return
      }
      setRetryNonce((n) => n + 1)
    }, 3000)
    return () => clearInterval(id)
  }, [activeKey, isLiveShot])

  const showSkeleton = !!active && (isLiveShot ? !settled : !loaded)
  const previewSrc = active ? (isLiveShot ? `${active.url}&_r=${retryNonce}` : active.url) : ''

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
          <PlusIcon size={12} /> Add screenshot
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
          {showSkeleton && <PreviewSkeleton />}
          <img
            src={previewSrc}
            alt={active.label}
            onLoad={() => setLoaded(true)}
            onError={() => setLoaded(true)}
            className={'h-72 w-full object-cover ' + (showSkeleton ? 'hidden' : '')}
          />
          <div className="absolute right-1.5 top-1.5 flex items-center gap-1">
            <IconButton
              onClick={setAsDefault}
              title={project.default_screenshot === active.key ? 'Default screenshot' : 'Set as default'}
              className="border border-border bg-background/90 hover:bg-background"
            >
              <StarIcon
                size={14}
                filled={project.default_screenshot === active.key}
                className={project.default_screenshot === active.key ? 'text-primary' : ''}
              />
            </IconButton>
            {active.deletable && (
              <IconButton
                onClick={removeActive}
                title="Remove"
                className="border border-border bg-background/90 hover:bg-background hover:text-destructive"
              >
                <TrashIcon size={14} />
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
          <PlusIcon size={12} /> Add
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
