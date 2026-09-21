import { useState } from 'react'
import { Plus, Trash2, X } from 'lucide-react'
import { EditableText, IconButton, Input } from '@/components/ui-lite'
import { cn } from '@/lib/utils'
import type { ChecklistSection } from '@/lib/types'
import { useTopics } from '@/store/useTopics'

// Cloned from NoteChecklist.tsx, retargeted at useTopics/topicId. Notes'
// own component is untouched.

interface TopicChecklistProps {
  topicId: string
  sections: ChecklistSection[]
}

/** A topic's checklists — plural: you can create several named checklists
 * within one topic, each independently managed by ChecklistSectionView
 * below. Click an item to strike it through and drop it below the not-done
 * ones — the reorder comes for free from useTopics' optimistic
 * toggleChecklistItem, so these components stay purely presentational. */
export function TopicChecklist({ topicId, sections }: TopicChecklistProps) {
  const { addChecklistSection } = useTopics()
  const [newTitle, setNewTitle] = useState('')

  const commitAddSection = () => {
    if (!newTitle.trim()) return
    addChecklistSection(topicId, newTitle)
    setNewTitle('')
  }

  return (
    <div className="flex flex-col gap-3">
      {sections
        .slice()
        .sort((a, b) => a.order - b.order)
        .map((section) => (
          <ChecklistSectionView key={section.id} topicId={topicId} section={section} />
        ))}

      <div className="flex items-center gap-1.5">
        <Input
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && commitAddSection()}
          placeholder="New checklist name…"
        />
        <IconButton onClick={commitAddSection} aria-label="Add checklist">
          <Plus size={15} />
        </IconButton>
      </div>
      {sections.length === 0 && <p className="text-sm text-muted-foreground">No checklists yet — add one above.</p>}
    </div>
  )
}

function ChecklistSectionView({ topicId, section }: { topicId: string; section: ChecklistSection }) {
  const { renameChecklistSection, removeChecklistSection, toggleChecklistItem, addChecklistItem, removeChecklistItem } =
    useTopics()
  const [draft, setDraft] = useState('')

  const commitAdd = () => {
    if (!draft.trim()) return
    addChecklistItem(topicId, section.id, draft)
    setDraft('')
  }

  return (
    <div className="rounded-md border border-border p-2">
      <div className="mb-1.5 flex items-center gap-1.5 border-b border-border pb-1.5">
        <EditableText
          value={section.title}
          onSave={(title) => renameChecklistSection(topicId, section.id, title)}
          className="flex-1 text-sm font-medium"
        />
        <IconButton
          onClick={() => removeChecklistSection(topicId, section.id)}
          aria-label="Delete checklist"
          className="hover:text-destructive"
        >
          <Trash2 size={14} />
        </IconButton>
      </div>

      <ul className="flex flex-col gap-0.5">
        {section.items.map((item) => (
          <li key={item.id} className="group flex items-center gap-2 rounded px-1 py-1 hover:bg-muted/60">
            <button
              type="button"
              onClick={() => toggleChecklistItem(topicId, section.id, item.id)}
              className={cn('flex-1 text-left text-sm', item.done && 'text-muted-foreground line-through')}
            >
              {item.text}
            </button>
            <IconButton
              onClick={() => removeChecklistItem(topicId, section.id, item.id)}
              aria-label="Delete item"
              className="opacity-0 group-hover:opacity-100"
            >
              <X size={13} />
            </IconButton>
          </li>
        ))}
        {section.items.length === 0 && <li className="px-1 py-1 text-sm text-muted-foreground">No items yet.</li>}
      </ul>

      <div className="mt-1.5 flex items-center gap-1.5">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && commitAdd()}
          placeholder="Add item…"
        />
        <IconButton onClick={commitAdd} aria-label="Add item">
          <Plus size={15} />
        </IconButton>
      </div>
    </div>
  )
}
