import { useEffect, useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { EditableText, IconButton } from '@/components/ui-lite'
import { NoteEditor } from '@/components/NoteEditor'
import { NoteChecklist } from '@/components/NoteChecklist'
import { cn } from '@/lib/utils'
import type { Note } from '@/lib/types'
import { useNotes } from '@/store/useNotes'
import { useConfirm } from '@/store/useConfirm'

export function Notes() {
  const { notes, loaded, load, subscribe, create, update, remove } = useNotes()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const confirm = useConfirm()

  useEffect(() => {
    if (!loaded) void load()
    return subscribe()
  }, [loaded, load, subscribe])

  useEffect(() => {
    if (!selectedId && notes.length) setSelectedId(notes[0].id)
    if (selectedId && !notes.some((n) => n.id === selectedId)) setSelectedId(notes[0]?.id ?? null)
  }, [notes, selectedId])

  const selected = notes.find((n) => n.id === selectedId) ?? null

  const handleCreate = async () => {
    const note = await create()
    if (note) setSelectedId(note.id)
  }

  const handleDelete = async (note: Note) => {
    if (await confirm({ title: `Delete "${note.title || 'Untitled note'}"?`, tone: 'danger' })) {
      remove(note.id)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <h1 className="text-sm font-semibold">Notes</h1>
      <div className="flex flex-col gap-4 md:flex-row">
        <div className="flex w-full shrink-0 flex-col gap-2 md:w-64">
          <button
            type="button"
            onClick={handleCreate}
            className="flex items-center justify-center gap-1.5 rounded-md border border-border bg-muted/40 py-1.5 text-sm transition-colors hover:bg-muted"
          >
            <Plus size={15} /> New note
          </button>
          <ul className="flex flex-col gap-0.5">
            {notes.map((note) => (
              <li key={note.id}>
                <button
                  type="button"
                  onClick={() => setSelectedId(note.id)}
                  className={cn(
                    'group flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm transition-colors',
                    note.id === selectedId ? 'bg-muted font-medium' : 'hover:bg-muted/60',
                  )}
                >
                  <span className="truncate">{note.title || 'Untitled note'}</span>
                  <IconButton
                    onClick={(e) => {
                      e.stopPropagation()
                      void handleDelete(note)
                    }}
                    aria-label={`Delete ${note.title || 'note'}`}
                    className="opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 size={13} />
                  </IconButton>
                </button>
              </li>
            ))}
            {loaded && notes.length === 0 && (
              <li className="px-2 py-1.5 text-sm text-muted-foreground">No notes yet.</li>
            )}
          </ul>
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-4">
          {selected ? (
            <>
              <EditableText
                key={selected.id}
                value={selected.title}
                onSave={(title) => update(selected.id, { title })}
                placeholder="Untitled note"
                className="text-lg font-semibold"
              />
              <NoteEditor key={selected.id} value={selected.body} onSave={(body) => update(selected.id, { body })} />
              <div>
                <h2 className="mb-1.5 text-xs font-medium uppercase text-muted-foreground">Checklists</h2>
                <NoteChecklist noteId={selected.id} sections={selected.checklist_sections} />
              </div>
            </>
          ) : (
            <div className="grid h-40 place-items-center text-sm text-muted-foreground">
              {notes.length ? 'Select a note' : 'Create a note to get started.'}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
