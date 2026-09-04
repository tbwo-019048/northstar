import * as React from 'react'
import { cn } from '@/lib/utils'

/**
 * Small, dependency-light primitives tuned for NorthStar's dense layout.
 * VeloBits supplies the visual tokens; these keep inputs uniform and compact.
 */

export const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<'input'>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        'h-7 w-full rounded-md border border-border bg-background px-2 text-sm outline-none transition-colors placeholder:text-muted-foreground/70 focus:border-ring focus:ring-2 focus:ring-ring/30 disabled:opacity-50',
        className,
      )}
      {...props}
    />
  ),
)
Input.displayName = 'Input'

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.ComponentProps<'textarea'>>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        'w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm outline-none transition-colors placeholder:text-muted-foreground/70 focus:border-ring focus:ring-2 focus:ring-ring/30 disabled:opacity-50',
        className,
      )}
      {...props}
    />
  ),
)
Textarea.displayName = 'Textarea'

export const Select = React.forwardRef<HTMLSelectElement, React.ComponentProps<'select'>>(
  ({ className, children, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(
        'h-7 rounded-md border border-border bg-background px-1.5 text-sm outline-none transition-colors focus:border-ring focus:ring-2 focus:ring-ring/30 disabled:opacity-50',
        className,
      )}
      {...props}
    >
      {children}
    </select>
  ),
)
Select.displayName = 'Select'

export function IconButton({
  className,
  ...props
}: React.ComponentProps<'button'>) {
  return (
    <button
      type="button"
      className={cn(
        'grid size-6 shrink-0 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-40',
        className,
      )}
      {...props}
    />
  )
}

const PRIORITY_STYLES: Record<string, string> = {
  urgent: 'bg-red-500/15 text-red-600 dark:text-red-400',
  high: 'bg-orange-500/15 text-orange-600 dark:text-orange-400',
  medium: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
  low: 'bg-sky-500/15 text-sky-600 dark:text-sky-400',
}

const TYPE_STYLES: Record<string, string> = {
  feature: 'bg-violet-500/15 text-violet-600 dark:text-violet-400',
  bug: 'bg-red-500/15 text-red-600 dark:text-red-400',
  chore: 'bg-zinc-500/15 text-zinc-600 dark:text-zinc-400',
  idea: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
  research: 'bg-blue-500/15 text-blue-600 dark:text-blue-400',
}

export function Chip({
  children,
  tone,
  className,
}: {
  children: React.ReactNode
  tone?: 'priority' | 'type' | 'neutral'
  className?: string
}) {
  const key = String(children).toLowerCase()
  const map =
    tone === 'priority' ? PRIORITY_STYLES : tone === 'type' ? TYPE_STYLES : undefined
  return (
    <span
      className={cn(
        'inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-medium capitalize leading-none',
        map?.[key] ?? 'bg-muted text-muted-foreground',
        className,
      )}
    >
      {children}
    </span>
  )
}

/** Inline-editable text cell — click to edit, blur / Enter to save. */
export function EditableText({
  value,
  onSave,
  placeholder,
  className,
  multiline,
}: {
  value: string
  onSave: (v: string) => void
  placeholder?: string
  className?: string
  multiline?: boolean
}) {
  const [editing, setEditing] = React.useState(false)
  const [draft, setDraft] = React.useState(value)
  React.useEffect(() => setDraft(value), [value])

  if (editing) {
    const commit = () => {
      setEditing(false)
      if (draft !== value) onSave(draft)
    }
    return multiline ? (
      <Textarea
        autoFocus
        rows={3}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        className={className}
      />
    ) : (
      <Input
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit()
          if (e.key === 'Escape') {
            setDraft(value)
            setEditing(false)
          }
        }}
        className={className}
      />
    )
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      className={cn(
        'w-full truncate rounded px-1 py-0.5 text-left text-sm hover:bg-muted/60',
        !value && 'text-muted-foreground/60',
        className,
      )}
    >
      {value || placeholder || '—'}
    </button>
  )
}
