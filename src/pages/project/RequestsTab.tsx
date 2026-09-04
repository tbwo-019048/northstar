import { Fragment, useMemo, useState } from 'react'
import { Check, ChevronRight, Plus, Trash2, Undo2 } from 'lucide-react'
import { useProjectData, asRequests } from '@/store/useProjectData'
import { PRIORITIES } from '@/lib/types'
import { EditableText, IconButton, Select } from '@/components/ui-lite'
import { useDebouncedSave } from '@/hooks/useDebouncedSave'

export function RequestsTab({ projectId }: { projectId: string }) {
  const rows = useProjectData((s) => s.rows.requests)
  const { add, patch, del } = useProjectData()
  const requests = asRequests(rows)
  const [open, setOpen] = useState<string | null>(null)

  const { openList, doneList } = useMemo(
    () => ({
      openList: requests.filter((r) => r.status === 'todo').sort((a, b) => a.sort - b.sort),
      doneList: requests.filter((r) => r.status === 'completed').sort((a, b) => a.sort - b.sort),
    }),
    [requests],
  )

  const addReq = () =>
    add('requests', {
      project_id: projectId,
      title: 'New request',
      priority: 'medium',
      status: 'todo',
      sort: openList.length,
    })

  const Row = ({ r }: { r: (typeof requests)[number] }) => (
    <Fragment>
      <tr className="border-b border-border last:border-0 hover:bg-muted/30">
        <td className="w-6 px-1">
          <IconButton onClick={() => setOpen(open === r.id ? null : r.id)}>
            <ChevronRight className={'size-3.5 transition-transform ' + (open === r.id ? 'rotate-90' : '')} />
          </IconButton>
        </td>
        <td className="w-24 px-1 py-1">
          <Select
            value={r.priority}
            onChange={(e) => patch('requests', r.id, { priority: e.target.value })}
            className="h-6 w-full border-0 bg-transparent px-0"
          >
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </Select>
        </td>
        <td className="px-1 py-1">
          <EditableText value={r.title} onSave={(v) => patch('requests', r.id, { title: v })} className="font-medium" />
          <EditableText
            value={r.subtitle}
            placeholder="add subtitle…"
            onSave={(v) => patch('requests', r.id, { subtitle: v })}
            className="text-xs text-muted-foreground"
          />
        </td>
        <td className="w-36 px-1 py-1">
          <EditableText
            value={r.requested_by}
            placeholder="requested by…"
            onSave={(v) => patch('requests', r.id, { requested_by: v })}
            className="text-xs"
          />
        </td>
        <td className="w-8 px-1">
          <IconButton
            onClick={() =>
              patch('requests', r.id, { status: r.status === 'todo' ? 'completed' : 'todo' })
            }
            className="hover:text-primary"
            title={r.status === 'todo' ? 'Mark done' : 'Reopen'}
          >
            {r.status === 'todo' ? <Check className="size-3.5" /> : <Undo2 className="size-3.5" />}
          </IconButton>
        </td>
        <td className="w-8 px-1">
          <IconButton onClick={() => del('requests', r.id)} className="hover:text-destructive">
            <Trash2 className="size-3.5" />
          </IconButton>
        </td>
      </tr>
      {open === r.id && (
        <tr className="border-b border-border bg-muted/20">
          <td />
          <td colSpan={5} className="px-2 py-2">
            <ReqNotes id={r.id} initial={r.notes} onSave={(v) => patch('requests', r.id, { notes: v })} />
          </td>
        </tr>
      )}
    </Fragment>
  )

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <div className="flex items-center gap-2">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Requests · {openList.length}
          </h2>
          <button
            type="button"
            onClick={addReq}
            className="inline-flex h-6 items-center gap-1 rounded-md border border-border px-1.5 text-xs hover:bg-muted"
          >
            <Plus className="size-3" /> Add
          </button>
        </div>
        <div className="overflow-x-auto rounded-md border border-border">
          <table className="w-full min-w-[640px] text-sm">
            <tbody>
              {openList.map((r) => (
                <Row key={r.id} r={r} />
              ))}
              {openList.length === 0 && (
                <tr>
                  <td className="px-2 py-5 text-center text-xs text-muted-foreground">No open requests.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {doneList.length > 0 && (
        <div className="space-y-1.5">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Fulfilled · {doneList.length}
          </h2>
          <div className="overflow-x-auto rounded-md border border-border opacity-90">
            <table className="w-full min-w-[640px] text-sm">
              <tbody>
                {doneList.map((r) => (
                  <Row key={r.id} r={r} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

function ReqNotes({
  id,
  initial,
  onSave,
}: {
  id: string
  initial: string
  onSave: (v: string) => void
}) {
  const [val, setVal, status] = useDebouncedSave(initial, onSave)
  return (
    <label className="block" key={id}>
      <span className="text-[11px] font-medium uppercase text-muted-foreground">
        Notes {status !== 'idle' && <em className="not-italic text-primary">· {status}</em>}
      </span>
      <textarea
        value={val}
        onChange={(e) => setVal(e.target.value)}
        rows={3}
        className="mt-1 w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
        placeholder="Context for this future item…"
      />
    </label>
  )
}
