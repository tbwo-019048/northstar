import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { ChevronLeftIcon } from '@/components/ui/chevron-left'
import { useProjects } from '@/store/useProjects'
import { useProjectData } from '@/store/useProjectData'
import { PROJECT_TYPES, formatProjectType, type ProjectType } from '@/lib/types'
import { applySimpleMode, layoutFor, SIMPLE_MODE_TAB_KEYS, type TabKey } from '@/lib/projectLayout'
import { SummaryDetailsMerged } from '@/pages/project/SummaryDetailsMerged'
import { EditableText, Select } from '@/components/ui-lite'
import { ProjectLogo } from '@/components/ProjectLogo'
import { SummaryTab } from '@/pages/project/SummaryTab'
import { UsersTab } from '@/pages/project/UsersTab'
import { TodoTab } from '@/pages/project/TodoTab'
import { FeaturesTab } from '@/pages/project/FeaturesTab'
import { DetailsTab } from '@/pages/project/DetailsTab'
import { RequestsTab } from '@/pages/project/RequestsTab'
import { PipelineTab } from '@/pages/project/PipelineTab'
import { PlanningTab } from '@/pages/project/PlanningTab'
import { AnalysisTab } from '@/pages/project/AnalysisTab'
import { GitTab } from '@/pages/project/GitTab'
import { ProjectSettingsTab } from '@/pages/project/ProjectSettingsTab'
import { AssetsTab } from '@/pages/project/AssetsTab'
import { LocationsTab } from '@/pages/project/LocationsTab'
import { AlbumArtTab } from '@/pages/project/AlbumArtTab'
import { AlbumTab } from '@/pages/project/AlbumTab'
import { ConceptGraphTab } from '@/pages/project/ConceptGraphTab'
import { StateSelect } from '@/components/StateSelect'

const TABS = [
  { key: 'summary', label: 'Summary' },
  { key: 'features', label: 'Features' },
  { key: 'details', label: 'Details' },
  { key: 'assets', label: 'Assets' },
  { key: 'requests', label: 'Requests' },
  { key: 'todo', label: 'To-Do' },
  { key: 'pipeline', label: 'Pipeline' },
  { key: 'planning', label: 'Planning' },
  { key: 'users', label: 'Users' },
  { key: 'git', label: 'Git' },
  { key: 'analysis', label: 'Analysis' },
  { key: 'settings', label: 'Settings' },
] as const

/** The four modules a project can restrict itself to one of, via its own
 * active_module setting (see src/lib/moduleConversion.ts). */
const GOVERNED_TABS: TabKey[] = ['pipeline', 'todo', 'planning', 'requests']

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
  const layout = project ? layoutFor(project.type) : null
  const extraTabs = layout?.extraTabs ?? []
  const baseTabs = TABS.filter((t) => !layout?.hiddenTabs.includes(t.key))
  const detailsIdx = baseTabs.findIndex((t) => t.key === 'details')
  const spliced = [...baseTabs.slice(0, detailsIdx + 1), ...extraTabs, ...baseTabs.slice(detailsIdx + 1)]
  // The mind-map is a per-project opt-in (Settings), not tied to type, so it
  // splices in next to Summary regardless of which layout the project uses.
  const summaryIdx = spliced.findIndex((t) => t.key === 'summary')
  const withMindmap = project?.show_mindmap
    ? [...spliced.slice(0, summaryIdx + 1), { key: 'mindmap' as const, label: 'Mindmap' }, ...spliced.slice(summaryIdx + 1)]
    : spliced
  // Type-level hiddenTabs wins first; active_module only narrows further among
  // the governed tabs a type already allows (see moduleConversion.ts).
  const activeModule = project?.active_module
  const typeTabs = withMindmap.filter((t) => !GOVERNED_TABS.includes(t.key) || !activeModule || activeModule === t.key)
  const labelFor = (key: TabKey, fallback: string) => layout?.tabLabels[key] ?? fallback
  // Simple Mode is a project-level override on top of everything above: no
  // matter what the type's layout or active_module would otherwise show,
  // a Simple Mode project is always exactly these three tabs.
  const tabs = applySimpleMode(typeTabs, project?.simple_mode, labelFor('todo', 'To-Do'))

  if (!id) return <Navigate to="/app" replace />
  if (loaded && !project) {
    return (
      <div className="text-sm text-muted-foreground">
        Project not found. <Link to="/app" className="text-link underline">Back to overview</Link>
      </div>
    )
  }
  const extraKeys = new Set(extraTabs.map((t) => t.key))
  const ADDITIVE_TABS: TabKey[] = ['locations', 'albumArt', 'album']
  if (
    layout &&
    tab &&
    (project?.simple_mode
      ? !SIMPLE_MODE_TAB_KEYS.includes(tab as TabKey)
      : layout.hiddenTabs.includes(tab as TabKey) ||
        (ADDITIVE_TABS.includes(tab as TabKey) && !extraKeys.has(tab as TabKey)) ||
        (GOVERNED_TABS.includes(tab as TabKey) && !!activeModule && activeModule !== tab) ||
        (tab === 'mindmap' && !project?.show_mindmap))
  ) {
    return <Navigate to={`/app/project/${id}`} replace />
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Link
          to="/app"
          className="grid size-6 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <ChevronLeftIcon size={16} />
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
          <StateSelect
            value={project.environment}
            onChange={(environment) => void update(project.id, { environment })}
          />
        )}
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
                  {formatProjectType(t)}
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
        {tabs.map((t) => (
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
            {labelFor(t.key, t.label)}
          </button>
        ))}
      </nav>

      <div className="pt-1">
        {active === 'summary' && project && layout && (
          project.simple_mode ? (
            <SummaryDetailsMerged project={project} layout={layout} />
          ) : (
            <SummaryTab project={project} blocks={layout.summary} />
          )
        )}
        {active === 'features' && (
          <FeaturesTab projectId={id} label={layout?.tabLabels.features} />
        )}
        {active === 'details' && project && layout && (
          <DetailsTab project={project} blocks={layout.details} />
        )}
        {active === 'assets' && <AssetsTab projectId={id} />}
        {active === 'locations' && <LocationsTab projectId={id} />}
        {active === 'albumArt' && project && <AlbumArtTab project={project} />}
        {active === 'album' && <AlbumTab projectId={id} />}
        {active === 'mindmap' && <ConceptGraphTab projectId={id} />}
        {active === 'requests' && project && (
          <RequestsTab project={project} label={layout?.tabLabels.requests} />
        )}
        {active === 'todo' && <TodoTab projectId={id} label={layout?.tabLabels.todo} />}
        {active === 'pipeline' && project && <PipelineTab project={project} />}
        {active === 'planning' && <PlanningTab projectId={id} />}
        {active === 'users' && project && (
          <UsersTab project={project} label={layout?.tabLabels.users} simple={layout?.simpleUsers} />
        )}
        {active === 'git' && <GitTab projectId={id} />}
        {active === 'analysis' && project && <AnalysisTab project={project} />}
        {active === 'settings' && project && <ProjectSettingsTab project={project} />}
      </div>
    </div>
  )
}
