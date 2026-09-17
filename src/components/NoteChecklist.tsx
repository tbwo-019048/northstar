import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import { IconButton, Input } from '@/components/ui-lite'
import { cn } from '@/lib/utils'
import type { ChecklistItem } from '@/lib/types'
import { useNotes } from '@/store/useNotes'

interface NoteChecklistProps {
  noteId: string
  items: ChecklistItem[]
}

/** A note's checklist: click an item to strike it through and drop it below
 * the not-done items — the reorder comes for free from useNotes' optimistic
 * toggleChecklistItem, so this component stays purely presentational. */
export function NoteChecklist({ noteId, items }: NoteChecklistProps) {
  const { toggleChecklistItem, addChecklistItem, removeChecklistItem } = useNotes()
  const [draft, setDraft] = useState('')

  const commitAdd = () => {
    if (!draft.trim()) return
    addChecklistItem(noteId, draft)
    setDraft('')
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-1.5">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && commitAdd()}
          placeholder="Add checklist item…"
        />
        <IconButton onClick={commitAdd} aria-label="Add item">
          <Plus size={15} />
        </IconButton>
      </div>
      <ul className="flex flex-col gap-0.5">
        {items.map((item) => (
          <li key={item.id} className="group flex items-center gap-2 rounded px-1 py-1 hover:bg-muted/60">
            <button
              type="button"
              onClick={() => toggleChecklistItem(noteId, item.id)}
              className={cn('flex-1 text-left text-sm', item.done && 'text-muted-foreground line-through')}
            >
              {item.text}
            </button>
            <IconButton
              onClick={() => removeChecklistItem(noteId, item.id)}
              aria-label="Delete item"
              className="opacity-0 group-hover:opacity-100"
            >
              <X size={13} />
            </IconButton>
          </li>
        ))}
        {items.length === 0 && <li className="px-1 py-1 text-sm text-muted-foreground">No items yet.</li>}
      </ul>
    </div>
  )
}
