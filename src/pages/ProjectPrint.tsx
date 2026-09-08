import { useEffect, useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
  useProjectData,
  asFeatures,
  asTodos,
  asRequests,
  asPeople,
  asPlanItems,
  asDetails,
  asPipelines,
} from '@/store/useProjectData'
import { useProjects } from '@/store/useProjects'
import { useClients } from '@/store/useClients'
import { ProjectLogo } from '@/components/ProjectLogo'
import { formatState } from '@/lib/projectState'
import { techNames } from '@/lib/techStack'
import { PLAN_STATUS_LABEL, PRIORITIES, SITE_TYPES, type Priority } from '@/lib/types'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="break-inside-avoid space-y-1.5">
      <h2 className="border-b border-neutral-300 pb-0.5 text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
        {title}
      </h2>
      {children}
    </section>
  )
}

export function ProjectPrint() {
  const { id } = useParams()
  const { projects, loaded: projectsLoaded, load: loadProjects } = useProjects()
  const rows = useProjectData((s) => s.rows)
  const loading = useProjectData((s) => s.loading)
  const dataProjectId = useProjectData((s) => s.projectId)
  const { load, reset } = useProjectData()
  const { loaded: clientsLoaded, load: loadClients, clientsForProject, companiesForClient } = useClients()

  useEffect(() => {
    if (!projectsLoaded) loadProjects()
  }, [projectsLoaded, loadProjects])

  useEffect(() => {
    if (!clientsLoaded) loadClients()
  }, [clientsLoaded, loadClients])

  useEffect(() => {
    if (!id) return
    load(id)
    return () => reset()
  }, [id, load, reset])

  const project = useMemo(() => projects.find((p) => p.id === id), [projects, id])
  const ready = !!project && !loading && dataProjectId === id

  useEffect(() => {
    if (!ready) return
    const t = setTimeout(() => window.print(), 500)
    return () => clearTimeout(t)
  }, [ready])

  const data = useMemo(() => {
    const todos = asTodos(rows.todos)
    const openTodos = todos.filter((t) => t.status === 'todo')
    const requests = asRequests(rows.requests).filter((r) => r.status === 'todo')
    const plans = asPlanItems(rows.plan_items).slice().sort((a, b) => {
      const da = a.start_date ?? a.due_date ?? ''
      const db = b.start_date ?? b.due_date ?? ''
      if (da && db && da !== db) return da < db ? -1 : 1
      if (da && !db) return -1
      if (!da && db) return 1
      return a.sort - b.sort
    })
    const details = asDetails(rows.details)
    const sections = [...new Set(details.map((d) => d.section || 'General'))]
    return {
      features: asFeatures(rows.features),
      openTodos,
      requests,
      people: asPeople(rows.project_people),
      plans,
      details,
      detailSections: sections,
      activePipelines: asPipelines(rows.pipelines).filter((p) => p.status === 'active').length,
    }
  }, [rows])

  if (!id) return null
  if (!project) {
    return (
      <div className="p-8 text-sm text-neutral-500">
        {projectsLoaded ? 'Project not found.' : 'Preparing…'}
      </div>
    )
  }

  const linkedClients = clientsForProject(project.id)

  const fmtDate = (d: string | null) =>
    d ? new Date(d).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '—'

  return (
    <div className="mx-auto max-w-3xl bg-white p-8 text-neutral-900">
      <div className="screen-only mb-6 flex items-center gap-2 rounded-md border border-neutral-300 bg-neutral-50 px-3 py-2 text-sm">
        <button
          type="button"
          onClick={() => window.print()}
          className="rounded-md bg-neutral-900 px-3 py-1 text-xs font-medium text-white hover:bg-neutral-700"
        >
          Print / Save as PDF
        </button>
        <Link to={`/app/project/${project.id}`} className="text-xs text-neutral-500 underline">
          ← Back to project
        </Link>
        {!ready && <span className="text-xs text-neutral-400">Loading project data…</span>}
      </div>

      <header className="break-inside-avoid space-y-2 border-b-2 border-neutral-900 pb-4">
        <div className="flex items-center gap-3">
          <ProjectLogo project={project} size="md" />
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-bold">{project.name}</h1>
            <p className="text-sm text-neutral-500">
              {project.type} · {formatState(project.state)} · {project.hours_worked || 0}h logged ·
              created {fmtDate(project.created_at)}
            </p>
          </div>
        </div>
        {SITE_TYPES.includes(project.type) && (project.website_url || project.test_site_url) && (
          <p className="text-xs text-neutral-500">
            {project.website_url && <>Live: {project.website_url}</>}
            {project.website_url && project.test_site_url && ' · '}
            {project.test_site_url && <>Test: {project.test_site_url}</>}
          </p>
        )}
      </header>

      <div className="mt-4 space-y-5 text-sm">
        {project.summary && (
          <Section title="Summary">
            <p className="whitespace-pre-wrap text-neutral-700">{project.summary}</p>
          </Section>
        )}

        <Section title="At a glance">
          <div className="grid grid-cols-3 gap-2 text-center sm:grid-cols-6">
            {[
              ['Features', data.features.length],
              ['Open to-dos', data.openTodos.length],
              ['Open requests', data.requests.length],
              ['Users', data.people.length],
              ['Plan items', data.plans.length],
              ['Active pipelines', data.activePipelines],
            ].map(([label, value]) => (
              <div key={label} className="rounded border border-neutral-300 px-2 py-1.5">
                <div className="text-[10px] uppercase tracking-wide text-neutral-500">{label}</div>
                <div className="text-base font-semibold tabular-nums">{value}</div>
              </div>
            ))}
          </div>
        </Section>

        {linkedClients.length > 0 && (
          <Section title="Clients">
            <p className="text-neutral-700">
              {linkedClients
                .map((c) => {
                  const cos = companiesForClient(c.id)
                    .map((x) => x.name)
                    .filter(Boolean)
                  return cos.length ? `${c.name} (${cos.join(', ')})` : c.name
                })
                .join(', ')}
            </p>
          </Section>
        )}

        {project.tech_stack.length > 0 && (
          <Section title="Tech stack">
            <p className="text-neutral-700">{techNames(project.tech_stack)}</p>
          </Section>
        )}

        {data.features.length > 0 && (
          <Section title={`Features (${data.features.length})`}>
            <ul className="list-disc space-y-0.5 pl-5">
              {data.features.map((f) => (
                <li key={f.id}>
                  <span className="font-medium">{f.title}</span>
                  {f.description && <span className="text-neutral-500"> — {f.description}</span>}
                </li>
              ))}
            </ul>
          </Section>
        )}

        {data.openTodos.length > 0 && (
          <Section title={`Open to-dos (${data.openTodos.length})`}>
            {PRIORITIES.map((p: Priority) => {
              const group = data.openTodos.filter((t) => t.priority === p)
              if (group.length === 0) return null
              return (
                <div key={p} className="mb-1">
                  <div className="text-[11px] font-semibold uppercase text-neutral-500">{p}</div>
                  <ul className="list-disc space-y-0.5 pl-5">
                    {group.map((t) => (
                      <li key={t.id}>
                        {t.title}
                        {t.subtitle && <span className="text-neutral-500"> — {t.subtitle}</span>}
                      </li>
                    ))}
                  </ul>
                </div>
              )
            })}
          </Section>
        )}

        {data.requests.length > 0 && (
          <Section title={`Open requests (${data.requests.length})`}>
            <ul className="list-disc space-y-0.5 pl-5">
              {data.requests.map((r) => (
                <li key={r.id}>
                  {r.title}
                  {r.requested_by && <span className="text-neutral-500"> — {r.requested_by}</span>}
                </li>
              ))}
            </ul>
          </Section>
        )}

        {data.plans.length > 0 && (
          <Section title={`Plan timeline (${data.plans.length})`}>
            <table className="w-full border-collapse text-xs">
              <tbody>
                {data.plans.map((p) => (
                  <tr key={p.id} className="border-b border-neutral-200">
                    <td className="w-24 py-1 pr-2 align-top text-neutral-500">
                      {fmtDate(p.start_date ?? p.due_date)}
                    </td>
                    <td className="w-24 py-1 pr-2 align-top text-neutral-500">
                      {PLAN_STATUS_LABEL[p.status]}
                    </td>
                    <td className="py-1 pr-2 align-top font-medium">{p.title || 'Untitled'}</td>
                    <td className="w-10 py-1 text-right align-top tabular-nums text-neutral-500">
                      {p.priority}/10
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Section>
        )}

        {data.people.length > 0 && (
          <Section title={`People (${data.people.length})`}>
            <table className="w-full border-collapse text-xs">
              <thead>
                <tr className="border-b border-neutral-300 text-left text-neutral-500">
                  <th className="py-1 pr-2 font-medium">Name</th>
                  <th className="py-1 pr-2 font-medium">Position</th>
                  <th className="py-1 font-medium">Username</th>
                </tr>
              </thead>
              <tbody>
                {data.people.map((person) => (
                  <tr key={person.id} className="border-b border-neutral-200">
                    <td className="py-1 pr-2">{person.name || '—'}</td>
                    <td className="py-1 pr-2">{person.position || '—'}</td>
                    <td className="py-1">{person.username || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-[10px] text-neutral-400">
              Passwords and tokens are intentionally excluded from this report.
            </p>
          </Section>
        )}

        {data.details.length > 0 && (
          <Section title="Details">
            {data.detailSections.map((sec) => (
              <div key={sec} className="mb-1.5 break-inside-avoid">
                <div className="text-[11px] font-semibold uppercase text-neutral-500">{sec}</div>
                <table className="w-full border-collapse text-xs">
                  <tbody>
                    {data.details
                      .filter((d) => (d.section || 'General') === sec)
                      .map((d) => (
                        <tr key={d.id} className="border-b border-neutral-200">
                          <td className="w-40 py-1 pr-2 align-top text-neutral-500">{d.label}</td>
                          <td className="py-1 align-top">{d.value}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            ))}
          </Section>
        )}
      </div>

      <footer className="mt-8 border-t border-neutral-300 pt-2 text-[10px] text-neutral-400">
        NorthStar · {project.name} · generated {new Date().toLocaleString()}
      </footer>
    </div>
  )
}
