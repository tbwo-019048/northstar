import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { MiniKanban } from '@/components/MiniKanban'
import { useProjectData, asPlanItems } from '@/store/useProjectData'
import { SIMPLE_PLAN_STATUSES, SIMPLE_PLAN_STATUS_LABEL, type PlanItem, type SimplePlanStatus } from '@/lib/types'
import { EditableText } from '@/components/ui-lite'
import { useDebouncedSave } from '@/hooks/useDebouncedSave'
import { useConfirm } from '@/store/useConfirm'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/velobits/dialog'

const COLUMNS = SIMPLE_PLAN_STATUSES.map((s) => ({ id: s, label: SIMPLE_PLAN_STATUS_LABEL[s] }))

/** The new, additive Pending/In Progress/Completed board — a lighter
 * alternative to the classic 5-status Planning board, used by "standard
 * treatment" project types. Only rows with a non-null simple_status render
 * or are touched here; classic-board rows/types are completely unaffected. */
export function SimplePlanBoard({ projectId }: { projectId: string }) {
  const rows = useProjectData((s) => s.rows.plan_items)
  const { add, patch, reorder } = useProjectData()
  const items = asPlanItems(rows).filter((i) => i.simple_status != null)
  const [openId, setOpenId] = useState<string | null>(null)
  const openItem = items.find((i) => i.id === openId) ?? null

  const addItem = () =>
    add('plan_items', {
      project_id: projectId,
      title: 'New item',
      status: 'requested',
      simple_status: 'pending',
      priority: 5,
      sort: items.length,
    })

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Planning · {items.length}
        </h2>
        <button
          type="button"
          onClick={addItem}
          className="inline-flex h-6 items-center gap-1 rounded-md border border-border px-1.5 text-xs hover:bg-muted"
        >
          <Plus size={12} /> Add
        </button>
      </div>

      <MiniKanban
        columns={COLUMNS}
        items={items}
        getColumn={(item) => item.simple_status as string}
        onMove={(id, to) => void patch('plan_items', id, { simple_status: to as SimplePlanStatus })}
        onReorder={(_column, ordered) => void reorder('plan_items', ordered)}
        onCardClick={(item) => setOpenId(item.id)}
        renderCard={(item) => <p className="truncate text-xs font-medium">{item.title || 'Untitled'}</p>}
      />

      <Dialog open={!!openItem} onOpenChange={(v) => !v && setOpenId(null)}>
        {openItem && <SimplePlanItemModal item={openItem} onClose={() => setOpenId(null)} />}
      </Dialog>
    </div>
  )
}

function SimplePlanItemModal({ item, onClose }: { item: PlanItem; onClose: () => void }) {
  const { patch, del } = useProjectData()
  const confirm = useConfirm()
  const [desc, setDesc, descStatus] = useDebouncedSave(item.description, async (v) => {
    await patch('plan_items', item.id, { description: v })
  })

  return (
    <DialogContent aria-describedby={undefined}>
      <DialogHeader>
        <DialogTitle className="sr-only">{item.title || 'Plan item'}</DialogTitle>
        <EditableText
          value={item.title}
          placeholder="Title"
          onSave={(v) => patch('plan_items', item.id, { title: v })}
          className="!text-base font-semibold"
        />
      </DialogHeader>

      <label className="block">
        <span className="text-[11px] font-medium uppercase text-muted-foreground">
          Description {descStatus !== 'idle' && <em className="not-italic text-primary">· {descStatus}</em>}
        </span>
        <textarea
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          rows={4}
          className="mt-1 w-full rounded-md border border-border bg-background px-2 py-1.5 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/30"
          placeholder="Details…"
        />
      </label>

      <div className="flex justify-end border-t border-border pt-3">
        <button
          type="button"
          onClick={async () => {
            if (await confirm({ title: 'Delete this item?' })) {
              del('plan_items', item.id)
              onClose()
            }
          }}
          className="inline-flex h-7 items-center gap-1 rounded-md px-2 text-xs text-muted-foreground hover:bg-muted hover:text-destructive"
        >
          <Trash2 size={12} /> Delete
        </button>
      </div>
    </DialogContent>
  )
}
