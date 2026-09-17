import { useNavigate } from 'react-router-dom'
import { MiniKanban } from '@/components/MiniKanban'
import { useProjectData, asLocations } from '@/store/useProjectData'
import { LOCATION_STATES, LOCATION_STATE_LABEL, type LocationState } from '@/lib/types'

const COLUMNS = LOCATION_STATES.map((s) => ({ id: s, label: LOCATION_STATE_LABEL[s] }))

/** Planning tab for Grand Tour: a kanban VIEW of the same locations table
 * (LocationsTab) — dragging a card between columns updates that location's
 * state directly. Cards link to the Locations tab for full editing rather
 * than duplicating an edit UI here. */
export function LocationsPlanBoard({ projectId }: { projectId: string }) {
  const rows = useProjectData((s) => s.rows.locations)
  const { patch, reorder } = useProjectData()
  const locations = asLocations(rows)
  const nav = useNavigate()

  return (
    <div className="space-y-3">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Planning · {locations.length}
      </h2>
      <MiniKanban
        columns={COLUMNS}
        items={locations}
        getColumn={(l) => l.state}
        onMove={(id, to) => void patch('locations', id, { state: to as LocationState })}
        onReorder={(_column, ordered) => void reorder('locations', ordered)}
        onCardClick={() => nav(`/app/project/${projectId}/locations`)}
        renderCard={(l) => <p className="truncate text-xs font-medium">{l.address || 'Untitled location'}</p>}
      />
    </div>
  )
}
