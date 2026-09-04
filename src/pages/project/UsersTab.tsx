import { Fragment, useEffect, useRef, useState } from 'react'
import { ChevronRight, LayoutGrid, List, MessageSquare, Plus, Trash2, X } from 'lucide-react'
import {
  useProjectData,
  asPeople,
  asPersonColumns,
  asPersonComments,
} from '@/store/useProjectData'
import { useAuth } from '@/store/useAuth'
import type { Person, PersonColumn, Project } from '@/lib/types'
import { Chip, IconButton, Input, SecretField, Textarea } from '@/components/ui-lite'
import { PersonAvatar } from '@/components/PersonAvatar'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/velobits/dialog'

type ViewMode = 'table' | 'card'
const VIEW_KEY = 'northstar.users.view'

export function UsersTab({ project }: { project: Project }) {
  const projectId = project.id
  const rows = useProjectData((s) => s.rows.project_people)
  const columnRows = useProjectData((s) => s.rows.person_columns)
  const commentRows = useProjectData((s) => s.rows.person_comments)
  const { add, del, patch } = useProjectData()
  const people = asPeople(rows).slice().sort((a, b) => a.sort - b.sort)
  const columns = asPersonColumns(columnRows).slice().sort((a, b) => a.sort - b.sort)
  const comments = asPersonComments(commentRows)
  const [openId, setOpenId] = useState<string | null>(null)
  const open = people.find((p) => p.id === openId) ?? null
  const [view, setView] = useState<ViewMode>(() => {
    try {
      return (localStorage.getItem(VIEW_KEY) as ViewMode) || 'card'
    } catch {
      return 'card'
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(VIEW_KEY, view)
    } catch {
      /* ignore */
    }
  }, [view])

  const addPerson = async () => {
    const created = (await add('project_people', {
      project_id: projectId,
      name: 'New person',
      sort: people.length,
    })) as Person | null
    if (created && view === 'card') setOpenId(created.id)
  }

  const addColumn = () => {
    const label = prompt('New field name (e.g. Phone, Team)')?.trim()
    if (!label) return
    add('person_columns', { project_id: projectId, label, sort: columns.length })
  }

  const removeColumn = (id: string) => {
    if (!confirm('Remove this field? Its values will be lost.')) return
    del('person_columns', id)
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
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
        <div className="flex items-center gap-0.5 rounded-md border border-border p-0.5">
          <IconButton
            title="Table"
            onClick={() => setView('table')}
            className={view === 'table' ? 'bg-muted text-foreground' : ''}
          >
            <List className="size-3.5" />
          </IconButton>
          <IconButton
            title="Cards"
            onClick={() => setView('card')}
            className={view === 'card' ? 'bg-muted text-foreground' : ''}
          >
            <LayoutGrid className="size-3.5" />
          </IconButton>
        </div>
        <div className="flex flex-1 flex-wrap items-center justify-end gap-1">
          {columns.map((c) => (
            <span
              key={c.id}
              className="group/col inline-flex items-center gap-1 rounded bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground"
            >
              {c.label}
              <button
                type="button"
                onClick={() => removeColumn(c.id)}
                className="opacity-0 hover:text-destructive group-hover/col:opacity-100"
              >
                <X className="size-3" />
              </button>
            </span>
          ))}
          <button
            type="button"
            onClick={addColumn}
            className="inline-flex h-6 items-center gap-1 rounded-md border border-dashed border-border px-1.5 text-xs text-muted-foreground hover:bg-muted"
          >
            <Plus className="size-3" /> Field
          </button>
        </div>
      </div>

      {view === 'card' ? (
        <CardView people={people} project={project} onOpen={setOpenId} />
      ) : (
        <TableView people={people} columns={columns} comments={comments} onExpand={setOpenId} openId={openId} project={project} />
      )}

      <Dialog open={!!open} onOpenChange={(v) => !v && setOpenId(null)}>
        {open && (
          <DialogContent size="lg" aria-describedby={undefined}>
            <DialogHeader>
              <DialogTitle className="sr-only">{open.name || 'User'}</DialogTitle>
              <div className="flex items-center gap-3">
                <PersonAvatar
                  personId={open.id}
                  name={open.name}
                  url={open.avatar_url}
                  size="lg"
                  editable
                  onChange={(url) => patch('project_people', open.id, { avatar_url: url })}
                />
                <div className="min-w-0 flex-1">
                  <Input
                    value={open.name}
                    placeholder="Name"
                    onChange={(e) => patch('project_people', open.id, { name: e.target.value })}
                    className="font-medium"
                  />
                </div>
                <IconButton
                  onClick={() => {
                    if (confirm(`Remove ${open.name || 'this user'}?`)) {
                      del('project_people', open.id)
                      setOpenId(null)
                    }
                  }}
                  className="hover:text-destructive"
                >
                  <Trash2 className="size-4" />
                </IconButton>
              </div>
            </DialogHeader>

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Username">
                <Input
                  value={open.username}
                  onChange={(e) => patch('project_people', open.id, { username: e.target.value })}
                />
              </Field>
              <Field label="Position">
                <div className="flex items-center gap-1.5">
                  <Input
                    value={open.position}
                    list="position-suggestions"
                    onChange={(e) => patch('project_people', open.id, { position: e.target.value })}
                  />
                  {open.position && project.position_colors[open.position] && (
                    <Chip color={project.position_colors[open.position]}>{open.position}</Chip>
                  )}
                </div>
                <datalist id="position-suggestions">
                  {Object.keys(project.position_colors).map((label) => (
                    <option key={label} value={label} />
                  ))}
                </datalist>
              </Field>
              <Field label="Password">
                <SecretField
                  value={open.password}
                  onChange={(e) => patch('project_people', open.id, { password: e.target.value })}
                />
              </Field>
              {columns.map((c) => (
                <Field key={c.id} label={c.label}>
                  <Input
                    value={open.extra?.[c.id] ?? ''}
                    onChange={(e) =>
                      patch('project_people', open.id, {
                        extra: { ...open.extra, [c.id]: e.target.value },
                      })
                    }
                  />
                </Field>
              ))}
              <Field label="Notes" full>
                <Textarea
                  rows={2}
                  value={open.notes}
                  onChange={(e) => patch('project_people', open.id, { notes: e.target.value })}
                />
              </Field>
            </div>

            <PersonComments personId={open.id} comments={comments.filter((c) => c.person_id === open.id)} />
          </DialogContent>
        )}
      </Dialog>
    </div>
  )
}

function CardView({
  people,
  project,
  onOpen,
}: {
  people: Person[]
  project: Project
  onOpen: (id: string) => void
}) {
  return (
    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
      {people.map((p) => (
        <button
          key={p.id}
          type="button"
          onClick={() => onOpen(p.id)}
          className="flex flex-col items-center gap-1.5 rounded-md p-2 text-center hover:bg-muted/60"
        >
          <PersonAvatar personId={p.id} name={p.name} url={p.avatar_url} size="lg" />
          <span className="w-full truncate text-xs font-medium">{p.name || 'Unnamed'}</span>
          {p.position && (
            <Chip color={project.position_colors[p.position]} className="max-w-full truncate">
              {p.position}
            </Chip>
          )}
        </button>
      ))}
      {people.length === 0 && (
        <p className="col-span-full px-2 py-6 text-center text-xs text-muted-foreground">
          No users yet.
        </p>
      )}
    </div>
  )
}

const cellInput =
  'h-5 w-full rounded border border-transparent bg-transparent px-1 text-sm leading-5 outline-none transition-colors placeholder:text-muted-foreground/50 hover:border-border focus:border-ring focus:bg-background focus:ring-2 focus:ring-ring/30'

function TableView({
  people,
  columns,
  comments,
  openId,
  onExpand,
  project,
}: {
  people: Person[]
  columns: PersonColumn[]
  comments: ReturnType<typeof asPersonComments>
  openId: string | null
  onExpand: (id: string | null) => void
  project: Project
}) {
  const { del } = useProjectData()
  return (
    <div className="overflow-x-auto rounded-md border border-border">
      <table className="w-full min-w-[720px] text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/40 text-left text-[11px] uppercase text-muted-foreground">
            <th className="w-6" />
            <th className="w-8" />
            <th className="px-2 py-0.5 font-medium">Username</th>
            <th className="px-2 py-0.5 font-medium">Name</th>
            <th className="px-2 py-0.5 font-medium">Password</th>
            <th className="px-2 py-0.5 font-medium">Position</th>
            <th className="px-2 py-0.5 font-medium">Notes</th>
            {columns.map((c) => (
              <th key={c.id} className="px-2 py-0.5 font-medium">
                {c.label}
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
              project={project}
              open={openId === p.id}
              toggle={() => onExpand(openId === p.id ? null : p.id)}
              comments={comments.filter((c) => c.person_id === p.id)}
              onDelete={() => del('project_people', p.id)}
            />
          ))}
          {people.length === 0 && (
            <tr>
              <td colSpan={8 + columns.length} className="px-2 py-6 text-center text-xs text-muted-foreground">
                No users yet.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

function UserRow({
  person,
  columns,
  project,
  open,
  toggle,
  comments,
  onDelete,
}: {
  person: Person
  columns: PersonColumn[]
  project: Project
  open: boolean
  toggle: () => void
  comments: ReturnType<typeof asPersonComments>
  onDelete: () => void
}) {
  const { patch } = useProjectData()
  const rowRef = useRef<HTMLTableRowElement>(null)
  const pending = useRef<Record<string, unknown>>({})
  const [draft, setDraft] = useState(person)

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
          <PersonAvatar personId={person.id} name={person.name} url={person.avatar_url} size="sm" />
        </td>
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
          <SecretField
            value={draft.password}
            placeholder="—"
            onChange={(e) => setField('password', e.target.value)}
            className="h-5 border-transparent bg-transparent px-1 pr-6 leading-5 hover:border-border focus:bg-background"
          />
        </td>
        <td className="px-1 py-0.5">
          <div className="flex items-center gap-1">
            <input
              value={draft.position}
              placeholder="—"
              list="position-suggestions"
              onChange={(e) => setField('position', e.target.value)}
              className={cellInput}
            />
            {draft.position && project.position_colors[draft.position] && (
              <Chip color={project.position_colors[draft.position]}>{draft.position}</Chip>
            )}
          </div>
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
          <td colSpan={7 + columns.length} className="px-2 py-2">
            <PersonComments personId={person.id} comments={comments} />
          </td>
        </tr>
      )}
    </Fragment>
  )
}

function Field({
  label,
  full,
  children,
}: {
  label: string
  full?: boolean
  children: React.ReactNode
}) {
  return (
    <label className={full ? 'block sm:col-span-2' : 'block'}>
      <span className="text-[11px] font-medium uppercase text-muted-foreground">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
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
          <span className="mt-0.5 text-xs text-muted-foreground">{c.author.split('@')[0]}</span>
          <span className="flex-1">{c.body}</span>
          <span className="text-[10px] text-muted-foreground">
            {new Date(c.created_at).toLocaleDateString()}
          </span>
          <IconButton
            onClick={() => del('person_comments', c.id)}
            className="opacity-0 group-hover:opacity-100 hover:text-destructive"
          >
            <Trash2 className="size-3" />
          </IconButton>
        </div>
      ))}
      <form onSubmit={submit} className="flex gap-1.5">
        <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Add a comment…" />
        <button className="h-7 shrink-0 rounded-md bg-primary px-2 text-xs font-medium text-primary-foreground hover:bg-primary/90">
          Post
        </button>
      </form>
    </div>
  )
}
