import { Fragment, useState } from 'react'
import { ChevronRight, MessageSquare, Plus, Trash2 } from 'lucide-react'
import { useProjectData, asPeople, asPersonComments } from '@/store/useProjectData'
import { useAuth } from '@/store/useAuth'
import { EditableText, IconButton, Input } from '@/components/ui-lite'

export function UsersTab({ projectId }: { projectId: string }) {
  const rows = useProjectData((s) => s.rows.project_people)
  const commentRows = useProjectData((s) => s.rows.person_comments)
  const { add, patch, del } = useProjectData()
  const people = asPeople(rows)
  const comments = asPersonComments(commentRows)
  const [open, setOpen] = useState<string | null>(null)

  const addPerson = () =>
    add('project_people', { project_id: projectId, name: 'New person', sort: people.length })

  const cell = 'px-2 py-1 align-top'

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
      </div>

      <div className="overflow-x-auto rounded-md border border-border">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40 text-left text-[11px] uppercase text-muted-foreground">
              <th className="w-6" />
              <th className="px-2 py-1 font-medium">Username</th>
              <th className="px-2 py-1 font-medium">Name</th>
              <th className="px-2 py-1 font-medium">Password</th>
              <th className="px-2 py-1 font-medium">Position</th>
              <th className="px-2 py-1 font-medium">Notes</th>
              <th className="w-8" />
            </tr>
          </thead>
          <tbody>
            {people.map((p) => {
              const mine = comments.filter((c) => c.person_id === p.id)
              const isOpen = open === p.id
              return (
                <Fragment key={p.id}>
                  <tr className="border-b border-border last:border-0 hover:bg-muted/30">
                    <td className="px-1 py-1">
                      <IconButton onClick={() => setOpen(isOpen ? null : p.id)}>
                        <ChevronRight
                          className={'size-3.5 transition-transform ' + (isOpen ? 'rotate-90' : '')}
                        />
                      </IconButton>
                    </td>
                    <td className={cell}>
                      <EditableText value={p.username} placeholder="username" onSave={(v) => patch('project_people', p.id, { username: v })} />
                    </td>
                    <td className={cell}>
                      <EditableText value={p.name} placeholder="name" onSave={(v) => patch('project_people', p.id, { name: v })} />
                    </td>
                    <td className={cell}>
                      <EditableText value={p.password} placeholder="—" onSave={(v) => patch('project_people', p.id, { password: v })} />
                    </td>
                    <td className={cell}>
                      <EditableText value={p.position} placeholder="—" onSave={(v) => patch('project_people', p.id, { position: v })} />
                    </td>
                    <td className={cell}>
                      <EditableText value={p.notes} placeholder="—" onSave={(v) => patch('project_people', p.id, { notes: v })} />
                    </td>
                    <td className="px-1 py-1">
                      <IconButton onClick={() => del('project_people', p.id)} className="hover:text-destructive">
                        <Trash2 className="size-3.5" />
                      </IconButton>
                    </td>
                  </tr>
                  {isOpen && (
                    <tr className="border-b border-border bg-muted/20">
                      <td />
                      <td colSpan={6} className="px-2 py-2">
                        <PersonComments personId={p.id} comments={mine} />
                      </td>
                    </tr>
                  )}
                </Fragment>
              )
            })}
            {people.length === 0 && (
              <tr>
                <td colSpan={7} className="px-2 py-6 text-center text-xs text-muted-foreground">
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
