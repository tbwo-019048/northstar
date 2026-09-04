import { useEffect, useMemo } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import { useProjects } from '@/store/useProjects'
import { useProjectData } from '@/store/useProjectData'
import { PROJECT_TYPES, type ProjectType } from '@/lib/types'
import { EditableText, Select } from '@/components/ui-lite'
import { UsersTab } from '@/pages/project/UsersTab'
import { TodoTab } from '@/pages/project/TodoTab'
import { FeaturesTab } from '@/pages/project/FeaturesTab'
import { DetailsTab } from '@/pages/project/DetailsTab'
import { RequestsTab } from '@/pages/project/RequestsTab'
import { PipelineTab } from '@/pages/project/PipelineTab'
import { AnalysisTab } from '@/pages/project/AnalysisTab'

const TABS = [
  { key: 'users', label: 'Users' },
  { key: 'todo', label: 'To-Do' },
  { key: 'features', label: 'Features' },
  { key: 'details', label: 'Details' },
  { key: 'requests', label: 'Requests' },
  { key: 'pipeline', label: 'Pipeline' },
  { key: 'analysis', label: 'Analysis' },
] as const

export function Project() {
  const { id, tab } = useParams()
  const nav = useNavigate()
  const { projects, loaded, load: loadProjects, update } = useProjects()
  const { load, reset, subscribe } = useProjectData()

  useEffect(() => {
    if (!loaded) loadProjects()
  }, [loaded, loadProjects])

  useEffect(() => {
    if (!id) return
    load(id)
    const unsub = subscribe(id)
    return () => {
      unsub()
      reset()
    }
  }, [id, load, reset, subscribe])

  const project = useMemo(() => projects.find((p) => p.id === id), [projects, id])
  const active = tab ?? 'users'

  if (!id) return <Navigate to="/app" replace />
  if (loaded && !project) {
    return (
      <div className="text-sm text-muted-foreground">
        Project not found. <Link to="/app" className="text-link underline">Back to overview</Link>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Link
          to="/app"
          className="grid size-6 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <ChevronLeft className="size-4" />
        </Link>
        <div className="min-w-0 flex-1">
          {project && (
            <EditableText
              value={project.name}
              onSave={(v) => update(project.id, { name: v })}
              className="!text-base font-semibold"
            />
          )}
        </div>
        {project && (
          <Select
            value={project.type}
            onChange={(e) => update(project.id, { type: e.target.value as ProjectType })}
          >
            {PROJECT_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </Select>
        )}
      </div>

      <nav className="flex items-center gap-0.5 border-b border-border">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => nav(`/app/project/${id}/${t.key}`)}
            className={
              'relative h-8 px-2.5 text-xs font-medium transition-colors ' +
              (active === t.key
                ? 'text-foreground after:absolute after:inset-x-1 after:-bottom-px after:h-0.5 after:rounded-full after:bg-primary'
                : 'text-muted-foreground hover:text-foreground')
            }
          >
            {t.label}
          </button>
        ))}
      </nav>

      <div className="pt-1">
        {active === 'users' && <UsersTab projectId={id} />}
        {active === 'todo' && <TodoTab projectId={id} />}
        {active === 'features' && <FeaturesTab projectId={id} />}
        {active === 'details' && <DetailsTab projectId={id} />}
        {active === 'requests' && <RequestsTab projectId={id} />}
        {active === 'pipeline' && <PipelineTab projectId={id} />}
        {active === 'analysis' && project && <AnalysisTab project={project} />}
      </div>
    </div>
  )
}
