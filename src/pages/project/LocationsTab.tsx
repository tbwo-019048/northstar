import { Plus, Trash2 } from 'lucide-react'
import { EditableText, IconButton, Input, Select } from '@/components/ui-lite'
import { useProjectData, asLocations } from '@/store/useProjectData'
import { LOCATION_STATES, LOCATION_STATE_LABEL, type LocationState } from '@/lib/types'

/** Grand Tour's own table: one row per location. The same rows appear as a
 * Pending/Visited/Submitted kanban on the Planning tab (LocationsPlanBoard) —
 * this tab is the full-detail editor for them. */
export function LocationsTab({ projectId }: { projectId: string }) {
  const rows = useProjectData((s) => s.rows.locations)
  const { add, patch, del } = useProjectData()
  const locations = asLocations(rows)
    .slice()
    .sort((a, b) => (a.visit_date ?? '9999').localeCompare(b.visit_date ?? '9999') || a.created_at.localeCompare(b.created_at))

  const addLocation = () =>
    add('locations', { project_id: projectId, address: '', state: 'pending', sort: locations.length })

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Locations · {locations.length}
        </h2>
        <button
          type="button"
          onClick={addLocation}
          className="inline-flex h-6 items-center gap-1 rounded-md border border-border px-1.5 text-xs hover:bg-muted"
        >
          <Plus size={12} /> Add
        </button>
      </div>

      <div className="divide-y divide-border rounded-md border border-border">
        <div className="hidden grid-cols-[1fr_9rem_1fr_8rem_2rem] gap-2 px-2 py-1.5 text-[11px] font-medium uppercase text-muted-foreground sm:grid">
          <span>Address</span>
          <span>Date</span>
          <span>Letter</span>
          <span>State</span>
          <span />
        </div>
        {locations.map((location) => (
          <div key={location.id} className="grid grid-cols-1 gap-2 px-2 py-1.5 sm:grid-cols-[1fr_9rem_1fr_8rem_2rem] sm:items-center">
            <EditableText
              value={location.address}
              placeholder="Address"
              onSave={(v) => void patch('locations', location.id, { address: v })}
            />
            <Input
              type="date"
              value={location.visit_date ?? ''}
              onChange={(e) => void patch('locations', location.id, { visit_date: e.target.value || null })}
            />
            <EditableText
              value={location.letter}
              placeholder="Letter"
              onSave={(v) => void patch('locations', location.id, { letter: v })}
            />
            <Select
              value={location.state}
              onChange={(e) => void patch('locations', location.id, { state: e.target.value as LocationState })}
            >
              {LOCATION_STATES.map((s) => (
                <option key={s} value={s}>
                  {LOCATION_STATE_LABEL[s]}
                </option>
              ))}
            </Select>
            <IconButton onClick={() => del('locations', location.id)} className="justify-self-end hover:text-destructive">
              <Trash2 size={14} />
            </IconButton>
          </div>
        ))}
        {locations.length === 0 && (
          <p className="px-2 py-6 text-center text-xs text-muted-foreground">No locations yet — add one to start planning the tour.</p>
        )}
      </div>
    </div>
  )
}
