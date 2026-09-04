import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import { useProjects } from '@/store/useProjects'
import { useProjectData } from '@/store/useProjectData'
import { PROJECT_TYPES, type ProjectType } from '@/lib/types'
import { EditableText, Select } from '@/components/ui-lite'
import { ProjectLogo } from '@/components/ProjectLogo'
import { SummaryTab } from '@/pages/project/SummaryTab'
import { UsersTab } from '@/pages/project/UsersTab'
import { TodoTab } from '@/pages/project/TodoTab'
import { FeaturesTab } from '@/pages/project/FeaturesTab'
import { DetailsTab } from '@/pages/project/DetailsTab'
import { RequestsTab } from '@/pages/project/RequestsTab'
import { PipelineTab } from '@/pages/project/PipelineTab'
import { AnalysisTab } from '@/pages/project/AnalysisTab'
import { GitTab } from '@/pages/project/GitTab'
import { ProjectSettingsTab } from '@/pages/project/ProjectSettingsTab'

const TABS = [
  { key: 'summary', label: 'Summary' },
  { key: 'features', label: 'Features' },
  { key: 'details', label: 'Details' },
  { key: 'requests', label: 'Requests' },
  { key: 'todo', label: 'To-Do' },
  { key: 'pipeline', label: 'Pipeline' },
  { key: 'users', label: 'Users' },
  { key: 'git', label: 'Git' },
  { key: 'analysis', label: 'Analysis' },
  { key: 'settings', label: 'Settings' },
] as const

export function Project() {
  const { id, tab } = useParams()
  const nav = useNavigate()
  const { projects, loaded, load: loadProjects, update } = useProjects()
  const { load, reset, subscribe } = useProjectData()
  const [typeError, setTypeError] = useState<string | null>(null)

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
  const active = tab ?? 'summary'

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
        {project && (
          <ProjectLogo
            project={project}
            size="sm"
            editable
            onChange={(url) => update(project.id, { logo_url: url })}
          />
        )}
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
            onChange={async (e) => {
              setTypeError(null)
              const { error } = await update(project.id, { type: e.target.value as ProjectType })
              if (error) setTypeError(error)
            }}
          >
            {[...PROJECT_TYPES, ...(PROJECT_TYPES.includes(project.type) ? [] : [project.type])].map(
              (t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ),
            )}
          </Select>
        )}
      </div>
      {typeError && (
        <p className="text-xs text-destructive">
          {typeError}
          {typeError.toLowerCase().includes('invalid input value for enum') &&
            ' — re-run supabase/schema.sql to add the new project types to the database.'}
        </p>
      )}

      <nav className="flex items-center gap-0.5 overflow-x-auto border-b border-border">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => nav(`/app/project/${id}/${t.key}`)}
            className={
              'relative h-8 shrink-0 px-2.5 text-xs font-medium transition-colors ' +
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
        {active === 'summary' && project && <SummaryTab project={project} />}
        {active === 'features' && <FeaturesTab projectId={id} />}
        {active === 'details' && project && <DetailsTab project={project} />}
        {active === 'requests' && project && <RequestsTab project={project} />}
        {active === 'todo' && <TodoTab projectId={id} />}
        {active === 'pipeline' && <PipelineTab projectId={id} />}
        {active === 'users' && project && <UsersTab project={project} />}
        {active === 'git' && <GitTab projectId={id} />}
        {active === 'analysis' && project && <AnalysisTab project={project} />}
        {active === 'settings' && project && <ProjectSettingsTab project={project} />}
      </div>
    </div>
  )
}
