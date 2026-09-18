import { CheckCircle2, AlertCircle, Music2, Plus, Trash2 } from 'lucide-react'
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/velobits/accordion'
import { Input } from '@/components/ui-lite'
import { useProjectData, asAlbumTracks } from '@/store/useProjectData'
import { useDebouncedSave } from '@/hooks/useDebouncedSave'
import { isTrackDone, type AlbumTrack } from '@/lib/types'

/** One accordion row per song: title in the trigger, lyrics/style/mp3 in the
 * expanded content. A separate, additional tab alongside Features ("Tracks")
 * for Music projects — not a replacement for it. */
export function AlbumTab({ projectId }: { projectId: string }) {
  const rows = useProjectData((s) => s.rows.album_tracks)
  const { add } = useProjectData()
  const tracks = asAlbumTracks(rows).slice().sort((a, b) => a.sort - b.sort)

  const addTrack = () =>
    add('album_tracks', {
      project_id: projectId,
      title: 'Untitled track',
      mp3_generated: false,
      lyrics_finalised: false,
      style_finalised: false,
      sort: tracks.length,
    })

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Album · {tracks.length}
        </h2>
        <button
          type="button"
          onClick={addTrack}
          className="inline-flex h-6 items-center gap-1 rounded-md border border-border px-1.5 text-xs hover:bg-muted"
        >
          <Plus size={12} /> New track
        </button>
      </div>

      {tracks.length === 0 ? (
        <p className="rounded-md border border-dashed border-border px-3 py-8 text-center text-xs text-muted-foreground">
          No tracks yet — add one to start building the album.
        </p>
      ) : (
        <Accordion type="single">
          {tracks.map((track) => (
            <AccordionItem key={track.id} value={track.id}>
              <AccordionTrigger>
                <span className="flex items-center gap-2 text-sm">
                  <Music2 size={14} className="shrink-0 text-muted-foreground" />
                  {track.title || 'Untitled track'}
                  {isTrackDone(track) ? (
                    <CheckCircle2 size={14} className="shrink-0 text-emerald-500" aria-label="Done" />
                  ) : (
                    <AlertCircle size={14} className="shrink-0 text-amber-500" aria-label="Not done" />
                  )}
                </span>
              </AccordionTrigger>
              <AccordionContent>
                <TrackEditor track={track} />
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      )}
    </div>
  )
}

function TrackEditor({ track }: { track: AlbumTrack }) {
  const { patch, del } = useProjectData()
  const [lyrics, setLyrics, lyricsStatus] = useDebouncedSave(track.lyrics, async (v) => {
    await patch('album_tracks', track.id, { lyrics: v })
  })

  return (
    <div className="space-y-3 px-5 pb-4 sm:px-6">
      <label className="block">
        <span className="text-[11px] font-medium uppercase text-muted-foreground">Title</span>
        <Input
          value={track.title}
          onChange={(e) => void patch('album_tracks', track.id, { title: e.target.value })}
          className="mt-1"
        />
      </label>

      <label className="block">
        <span className="text-[11px] font-medium uppercase text-muted-foreground">Style</span>
        <Input
          value={track.style}
          placeholder="e.g. lo-fi, acoustic, drum & bass…"
          onChange={(e) => void patch('album_tracks', track.id, { style: e.target.value })}
          className="mt-1"
        />
      </label>

      <label className="block">
        <span className="text-[11px] font-medium uppercase text-muted-foreground">
          Lyrics {lyricsStatus !== 'idle' && <em className="not-italic text-primary">· {lyricsStatus}</em>}
        </span>
        <textarea
          value={lyrics}
          onChange={(e) => setLyrics(e.target.value)}
          rows={6}
          placeholder="Lyrics…"
          className="mt-1 w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
        />
      </label>

      <div className="space-y-1.5">
        <span className="text-[11px] font-medium uppercase text-muted-foreground">Progress</span>
        <div className="flex flex-wrap gap-3">
          <label className="flex items-center gap-1.5 text-sm">
            <input
              type="checkbox"
              checked={track.mp3_generated}
              onChange={(e) => void patch('album_tracks', track.id, { mp3_generated: e.target.checked })}
            />
            MP3 Generated
          </label>
          <label className="flex items-center gap-1.5 text-sm">
            <input
              type="checkbox"
              checked={track.lyrics_finalised}
              onChange={(e) => void patch('album_tracks', track.id, { lyrics_finalised: e.target.checked })}
            />
            Lyrics Finalised
          </label>
          <label className="flex items-center gap-1.5 text-sm">
            <input
              type="checkbox"
              checked={track.style_finalised}
              onChange={(e) => void patch('album_tracks', track.id, { style_finalised: e.target.checked })}
            />
            Style Finalised
          </label>
        </div>
      </div>

      <div className="flex justify-end border-t border-border pt-3">
        <button
          type="button"
          onClick={() => del('album_tracks', track.id)}
          className="inline-flex h-7 items-center gap-1 rounded-md px-2 text-xs text-muted-foreground hover:bg-muted hover:text-destructive"
        >
          <Trash2 size={12} /> Delete track
        </button>
      </div>
    </div>
  )
}
