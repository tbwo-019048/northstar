import { useState } from 'react'
import { MessageSquare, Plus, Trash2, X } from 'lucide-react'
import {
  useProjectData,
  asPeople,
  asPersonColumns,
  asPersonComments,
} from '@/store/useProjectData'
import { useAuth } from '@/store/useAuth'
import type { Person, Project } from '@/lib/types'
import { Chip, IconButton, Input, SecretField, Textarea } from '@/components/ui-lite'
import { PersonAvatar } from '@/components/PersonAvatar'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/velobits/dialog'

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

  const addPerson = async () => {
    const created = (await add('project_people', {
      project_id: projectId,
      name: 'New person',
      sort: people.length,
    })) as Person | null
    if (created) setOpenId(created.id)
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

      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
        {people.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setOpenId(p.id)}
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
    <div className="space-y-1.5 border-t border-border pt-3">
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
