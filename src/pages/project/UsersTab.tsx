import { Fragment, useEffect, useRef, useState } from 'react'
import { ChevronRight, MessageSquare, Plus, Trash2, X } from 'lucide-react'
import {
  useProjectData,
  asPeople,
  asPersonColumns,
  asPersonComments,
} from '@/store/useProjectData'
import { useAuth } from '@/store/useAuth'
import type { Person } from '@/lib/types'
import { IconButton, Input } from '@/components/ui-lite'

const cellInput =
  'h-5 w-full rounded border border-transparent bg-transparent px-1 text-sm leading-5 outline-none transition-colors placeholder:text-muted-foreground/50 hover:border-border focus:border-ring focus:bg-background focus:ring-2 focus:ring-ring/30'

export function UsersTab({ projectId }: { projectId: string }) {
  const rows = useProjectData((s) => s.rows.project_people)
  const columnRows = useProjectData((s) => s.rows.person_columns)
  const commentRows = useProjectData((s) => s.rows.person_comments)
  const { add, del } = useProjectData()
  const people = asPeople(rows).slice().sort((a, b) => a.sort - b.sort)
  const columns = asPersonColumns(columnRows).slice().sort((a, b) => a.sort - b.sort)
  const comments = asPersonComments(commentRows)
  const [open, setOpen] = useState<string | null>(null)

  const addPerson = () =>
    add('project_people', { project_id: projectId, name: 'New person', sort: people.length })

  const addColumn = () => {
    const label = prompt('New column name')?.trim()
    if (!label) return
    add('person_columns', { project_id: projectId, label, sort: columns.length })
  }

  const removeColumn = (id: string) => {
    if (!confirm('Remove this column? Its values will be lost.')) return
    del('person_columns', id)
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Users · {people.length}
        </h2>
        <button
          type="button"
          onClick={addPerson}
          className="inline-flex h-6 items-center gap-1 rounded-md border border-border px-1.5 text-xs hover:bg-muted"
        >
          <Plus className="size-3" /> Add
        </button>
        <button
          type="button"
          onClick={addColumn}
          className="inline-flex h-6 items-center gap-1 rounded-md border border-dashed border-border px-1.5 text-xs text-muted-foreground hover:bg-muted"
        >
          <Plus className="size-3" /> Column
        </button>
      </div>

      <div className="overflow-x-auto rounded-md border border-border">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40 text-left text-[11px] uppercase text-muted-foreground">
              <th className="w-6" />
              <th className="px-2 py-0.5 font-medium">Username</th>
              <th className="px-2 py-0.5 font-medium">Name</th>
              <th className="px-2 py-0.5 font-medium">Password</th>
              <th className="px-2 py-0.5 font-medium">Position</th>
              <th className="px-2 py-0.5 font-medium">Notes</th>
              {columns.map((c) => (
                <th key={c.id} className="group/col px-2 py-0.5 font-medium">
                  <span className="flex items-center gap-1">
                    {c.label}
                    <button
                      type="button"
                      onClick={() => removeColumn(c.id)}
                      className="opacity-0 hover:text-destructive group-hover/col:opacity-100"
                    >
                      <X className="size-3" />
                    </button>
                  </span>
                </th>
              ))}
              <th className="w-8" />
            </tr>
          </thead>
          <tbody>
            {people.map((p) => (
              <UserRow
                key={p.id}
                person={p}
                columns={columns}
                open={open === p.id}
                toggle={() => setOpen(open === p.id ? null : p.id)}
                comments={comments.filter((c) => c.person_id === p.id)}
                onDelete={() => del('project_people', p.id)}
              />
            ))}
            {people.length === 0 && (
              <tr>
                <td colSpan={7 + columns.length} className="px-2 py-6 text-center text-xs text-muted-foreground">
                  No users yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function UserRow({
  person,
  columns,
  open,
  toggle,
  comments,
  onDelete,
}: {
  person: Person
  columns: ReturnType<typeof asPersonColumns>
  open: boolean
  toggle: () => void
  comments: ReturnType<typeof asPersonComments>
  onDelete: () => void
}) {
  const { patch } = useProjectData()
  const rowRef = useRef<HTMLTableRowElement>(null)
  const pending = useRef<Record<string, unknown>>({})
  const [draft, setDraft] = useState(person)

  // Adopt remote changes (realtime / another device) as long as nothing here
  // is mid-edit — never stomp on unsaved keystrokes.
  useEffect(() => {
    if (Object.keys(pending.current).length === 0) setDraft(person)
  }, [person])

  const setField = (field: keyof Person, value: string) => {
    setDraft((d) => ({ ...d, [field]: value }))
    pending.current[field] = value
  }

  const setExtra = (colId: string, value: string) => {
    setDraft((d) => ({ ...d, extra: { ...d.extra, [colId]: value } }))
    const prevExtra = (pending.current.extra as Record<string, string>) ?? draft.extra
    pending.current.extra = { ...prevExtra, [colId]: value }
  }

  const commit = () => {
    if (Object.keys(pending.current).length === 0) return
    const changes = pending.current
    pending.current = {}
    void patch('project_people', person.id, changes)
  }

  // Commit only when focus truly leaves this row (not just moving between
  // its own cells with Tab) — that's the "don't save until you click off of
  // it" behaviour.
  const onBlurCapture = (e: React.FocusEvent<HTMLTableRowElement>) => {
    const next = e.relatedTarget as Node | null
    if (next && rowRef.current?.contains(next)) return
    commit()
  }

  return (
    <Fragment>
      <tr
        ref={rowRef}
        onBlurCapture={onBlurCapture}
        className="border-b border-border last:border-0 hover:bg-muted/30"
      >
        <td className="px-1 py-0.5">
          <IconButton onClick={toggle}>
            <ChevronRight className={'size-3.5 transition-transform ' + (open ? 'rotate-90' : '')} />
          </IconButton>
        </td>
        <td className="px-1 py-0.5">
          <input
            value={draft.username}
            placeholder="username"
            onChange={(e) => setField('username', e.target.value)}
            className={cellInput}
          />
        </td>
        <td className="px-1 py-0.5">
          <input
            value={draft.name}
            placeholder="name"
            onChange={(e) => setField('name', e.target.value)}
            className={cellInput}
          />
        </td>
        <td className="px-1 py-0.5">
          <input
            value={draft.password}
            placeholder="—"
            onChange={(e) => setField('password', e.target.value)}
            className={cellInput}
          />
        </td>
        <td className="px-1 py-0.5">
          <input
            value={draft.position}
            placeholder="—"
            onChange={(e) => setField('position', e.target.value)}
            className={cellInput}
          />
        </td>
        <td className="px-1 py-0.5">
          <input
            value={draft.notes}
            placeholder="—"
            onChange={(e) => setField('notes', e.target.value)}
            className={cellInput}
          />
        </td>
        {columns.map((c) => (
          <td key={c.id} className="px-1 py-0.5">
            <input
              value={draft.extra?.[c.id] ?? ''}
              placeholder="—"
              onChange={(e) => setExtra(c.id, e.target.value)}
              className={cellInput}
            />
          </td>
        ))}
        <td className="px-1 py-0.5">
          <IconButton onClick={onDelete} className="hover:text-destructive">
            <Trash2 className="size-3.5" />
          </IconButton>
        </td>
      </tr>
      {open && (
        <tr className="border-b border-border bg-muted/20">
          <td />
          <td colSpan={6 + columns.length} className="px-2 py-2">
            <PersonComments personId={person.id} comments={comments} />
          </td>
        </tr>
      )}
    </Fragment>
  )
}

function PersonComments({
  personId,
  comments,
}: {
  personId: string
  comments: ReturnType<typeof asPersonComments>
}) {
  const { add, del } = useProjectData()
  const email = useAuth((s) => s.user?.email ?? 'unknown')
  const [text, setText] = useState('')

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!text.trim()) return
    add('person_comments', { person_id: personId, author: email, body: text.trim() })
    setText('')
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1 text-[11px] font-medium uppercase text-muted-foreground">
        <MessageSquare className="size-3" /> Comments
      </div>
      {comments.map((c) => (
        <div key={c.id} className="group flex items-start gap-2 text-sm">
          <span className="mt-0.5 text-xs text-muted-foreground">
            {c.author.split('@')[0]}
          </span>
          <span className="flex-1">{c.body}</span>
          <span className="text-[10px] text-muted-foreground">
            {new Date(c.created_at).toLocaleDateString()}
          </span>
          <IconButton onClick={() => del('person_comments', c.id)} className="opacity-0 group-hover:opacity-100 hover:text-destructive">
            <Trash2 className="size-3" />
          </IconButton>
        </div>
      ))}
      <form onSubmit={submit} className="flex gap-1.5">
        <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Add a comment…" />
        <button className="h-7 rounded-md bg-primary px-2 text-xs font-medium text-primary-foreground hover:bg-primary/90">
          Post
        </button>
      </form>
    </div>
  )
}
