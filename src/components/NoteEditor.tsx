import { useEffect, useRef } from 'react'
import { Bold, Italic, List, ListOrdered, Underline } from 'lucide-react'
import { IconButton } from '@/components/ui-lite'
import { sanitizeNoteHtml } from '@/lib/sanitizeNoteHtml'

interface NoteEditorProps {
  value: string
  onSave: (html: string) => void
}

const SAVE_DEBOUNCE_MS = 800

function ToolbarButton({
  onClick,
  label,
  children,
}: {
  onClick: () => void
  label: string
  children: React.ReactNode
}) {
  return (
    // preventDefault keeps the contentEditable's text selection alive across
    // the click — otherwise the browser clears it before execCommand runs
    // and formatting silently no-ops.
    <IconButton onMouseDown={(e) => e.preventDefault()} onClick={onClick} aria-label={label} title={label}>
      {children}
    </IconButton>
  )
}

/** A small notepad-style rich text editor: Bold/Italic/Underline/bullet and
 * numbered lists via document.execCommand — no editor dependency exists in
 * this codebase, and this narrow formatting set doesn't need one. */
export function NoteEditor({ value, onSave }: NoteEditorProps) {
  const ref = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<number | null>(null)

  useEffect(() => {
    if (ref.current && document.activeElement !== ref.current) {
      ref.current.innerHTML = sanitizeNoteHtml(value || '')
    }
  }, [value])

  useEffect(() => () => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current)
  }, [])

  const scheduleSave = () => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current)
    debounceRef.current = window.setTimeout(() => {
      if (ref.current) onSave(ref.current.innerHTML)
    }, SAVE_DEBOUNCE_MS)
  }

  const flushSave = () => {
    if (debounceRef.current) window.clearTimeout(debounceRef.current)
    if (ref.current) onSave(ref.current.innerHTML)
  }

  const exec = (command: string) => {
    ref.current?.focus()
    document.execCommand(command)
    scheduleSave()
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <div className="flex items-center gap-1 border-b border-border pb-1.5">
        <ToolbarButton onClick={() => exec('bold')} label="Bold">
          <Bold size={15} />
        </ToolbarButton>
        <ToolbarButton onClick={() => exec('italic')} label="Italic">
          <Italic size={15} />
        </ToolbarButton>
        <ToolbarButton onClick={() => exec('underline')} label="Underline">
          <Underline size={15} />
        </ToolbarButton>
        <div className="mx-1 h-4 w-px bg-border" />
        <ToolbarButton onClick={() => exec('insertUnorderedList')} label="Bullet list">
          <List size={15} />
        </ToolbarButton>
        <ToolbarButton onClick={() => exec('insertOrderedList')} label="Numbered list">
          <ListOrdered size={15} />
        </ToolbarButton>
      </div>
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        onInput={scheduleSave}
        onBlur={flushSave}
        className="min-h-[240px] flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30 [&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:pl-5"
      />
    </div>
  )
}
