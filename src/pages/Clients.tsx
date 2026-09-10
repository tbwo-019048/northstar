import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { GripVertical, Lock, LockOpen } from 'lucide-react'
import {
  DndContext,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext,
  arrayMove,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Bars3Icon } from '@/components/ui/bars-3'
import { ChevronRightIcon } from '@/components/ui/chevron-right'
import { ListBulletIcon } from '@/components/ui/list-bullet'
import { MagnifyingGlassIcon } from '@/components/ui/magnifying-glass'
import { PlusIcon } from '@/components/ui/plus'
import { Squares2X2Icon } from '@/components/ui/squares-2x2'
import { TrashIcon } from '@/components/ui/trash'
import { XMarkIcon } from '@/components/ui/x-mark'
import { ClientImage } from '@/components/ClientImage'
import { CountryPicker } from '@/components/CountryPicker'
import { CountryGlobe, type CountryGlobeEntry } from '@/components/CountryGlobe'
import { WorldMap } from '@/components/WorldMap'
import { SegmentedControl } from '@/components/ui/velobits/segmented-control'
import { useClients } from '@/store/useClients'
import { useProjects } from '@/store/useProjects'
import { useTheme } from '@/store/useTheme'
import { useDiagnostic } from '@/store/useDiagnostic'
import { visibleRows } from '@/lib/hidden'
import { HideToggle } from '@/components/HideToggle'
import { useReorderLock } from '@/hooks/useReorderLock'
import { useGridCols } from '@/store/useGridCols'
import type { Client } from '@/lib/types'
import { EditableText, IconButton, Input, Textarea } from '@/components/ui-lite'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/velobits/dialog'
import { useConfirm } from '@/store/useConfirm'

type ClientView = 'table' | 'byCompany' | 'grid'
const VIEW_KEY = 'northstar.clients.view'

export function Clients() {
  const {
    clients, loaded, load, subscribe, create, update, remove, reorder, links,
    linkToProject, unlinkFromProject, projectIdsForClient,
    addCompany, updateCompany, removeCompany,
  } = useClients()
  const [unlocked, setUnlocked] = useReorderLock('clients')
  const confirm = useConfirm()
  const gridCols = useGridCols((s) => s.cols)
  const [globePaused, setGlobePaused] = useState(() => {
    try {
      return localStorage.getItem('northstar.clients.globePaused') === '1'
    } catch {
      return false
    }
  })
  const toggleGlobe = (v: boolean) => {
    setGlobePaused(v)
    try {
      localStorage.setItem('northstar.clients.globePaused', v ? '1' : '0')
    } catch {
      /* ignore */
    }
  }
  const [mapMode, setMapMode] = useState<'globe' | 'flat'>(() => {
    try {
      return localStorage.getItem('northstar.clients.mapMode') === 'flat' ? 'flat' : 'globe'
    } catch {
      return 'globe'
    }
  })
  const chooseMapMode = (v: string) => {
    const mode = v === 'flat' ? 'flat' : 'globe'
    setMapMode(mode)
    try {
      localStorage.setItem('northstar.clients.mapMode', mode)
    } catch {
      /* ignore */
    }
  }
  const companies = useClients((s) => s.companies)
  const companiesByClient = useMemo(() => {
    const map = new Map<string, typeof companies>()
    for (const co of [...companies].sort((a, b) => a.sort - b.sort)) {
      if (!map.has(co.client_id)) map.set(co.client_id, [])
      map.get(co.client_id)!.push(co)
    }
    return map
  }, [companies])
  const companiesOf = (clientId: string) => companiesByClient.get(clientId) ?? []
  const { projects, loaded: projectsLoaded, load: loadProjects } = useProjects()
  const diagnostic = useDiagnostic((s) => s.on)
  const theme = useTheme((s) => s.theme)
  const nav = useNavigate()

  const globeEntries = useMemo<CountryGlobeEntry[]>(
    () => [
      ...clients.flatMap((client) =>
        (client.countries ?? []).map((country) => ({
          id: client.id,
          country,
          kind: 'client' as const,
          label: client.name || companiesByClient.get(client.id)?.[0]?.name || 'Client',
        })),
      ),
      ...projects.flatMap((project) =>
        (project.countries ?? []).map((country) => ({
          id: project.id,
          country,
          kind: 'project' as const,
          label: project.name,
        })),
      ),
    ],
    [clients, companiesByClient, projects],
  )
  const highlightCountries = useMemo(
    () => [...new Set(globeEntries.map((e) => e.country))],
    [globeEntries],
  )
  const [open, setOpen] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')
  const [company, setCompany] = useState('')
  const [q, setQ] = useState('')
  const [pickerFor, setPickerFor] = useState<string | null>(null)
  const [view, setView] = useState<ClientView>(() => {
    try {
      return (localStorage.getItem(VIEW_KEY) as ClientView) || 'table'
    } catch {
      return 'table'
    }
  })

  useEffect(() => {
    if (!loaded) load()
    return subscribe()
  }, [loaded, load, subscribe])

  useEffect(() => {
    if (!projectsLoaded) loadProjects()
  }, [projectsLoaded, loadProjects])

  useEffect(() => {
    try {
      localStorage.setItem(VIEW_KEY, view)
    } catch {
      /* ignore */
    }
  }, [view])

  const rows = useMemo(() => {
    const query = q.trim().toLowerCase()
    const matched = !query
      ? clients
      : clients.filter((client) => {
          const cos = companiesByClient.get(client.id) ?? []
          return [
            client.name,
            client.email,
            client.phone,
            ...cos.map((co) => co.name),
            ...cos.map((co) => co.email_domain),
          ].some((value) => (value ?? '').toLowerCase().includes(query))
        })
    return visibleRows(matched, diagnostic)
  }, [clients, q, companiesByClient, diagnostic])

  const companySummary = (clientId: string) => {
    const cos = companiesOf(clientId)
    if (cos.length === 0) return '—'
    return cos[0].name + (cos.length > 1 ? ` +${cos.length - 1}` : '')
  }

  // Each company row becomes a directory entry; a client with two companies
  // appears under both group headings.
  const byCompany = useMemo(() => {
    const groups = new Map<string, { client: (typeof clients)[number]; company: (typeof companies)[number] | null }[]>()
    for (const client of rows) {
      const cos = companiesByClient.get(client.id) ?? []
      const entries = cos.length
        ? cos.map((company) => ({ client, company }))
        : [{ client, company: null }]
      for (const entry of entries) {
        const group = entry.company?.name.trim() || 'Independent'
        if (!groups.has(group)) groups.set(group, [])
        groups.get(group)!.push(entry)
      }
    }
    return [...groups.entries()].sort((a, b) => a[0].localeCompare(b[0]))
  }, [rows, companiesByClient])

  const onCreate = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!name.trim()) return
    const created = await create({ name: name.trim() })
    if (created && company.trim()) await addCompany(created.id, { name: company.trim() })
    setName('')
    setCompany('')
    setAdding(false)
    if (created) {
      setView('table')
      setOpen(created.id)
    }
  }

  const editClient = (id: string) => {
    setView('table')
    setOpen(id)
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-sm font-semibold">Clients</h1>
        <span className="text-xs text-muted-foreground">{clients.length}</span>
        <div className="flex-1" />
        <div className="relative">
          <MagnifyingGlassIcon size={14} className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(event) => setQ(event.target.value)} placeholder="Search" className="h-7 w-40 pl-7" />
        </div>
        <div className="flex items-center gap-0.5 rounded-md border border-border p-0.5">
          <IconButton title="Table" onClick={() => setView('table')} className={view === 'table' ? 'bg-muted text-foreground' : ''}>
            <ListBulletIcon size={14} />
          </IconButton>
          <IconButton title="Grouped" onClick={() => setView('byCompany')} className={view === 'byCompany' ? 'bg-muted text-foreground' : ''}>
            <Bars3Icon size={14} />
          </IconButton>
          <IconButton title="Grid" onClick={() => setView('grid')} className={view === 'grid' ? 'bg-muted text-foreground' : ''}>
            <Squares2X2Icon size={14} />
          </IconButton>
        </div>
        <IconButton
          title={unlocked ? 'Lock order' : 'Unlock to reorder (table view)'}
          onClick={() => {
            if (!unlocked) setView('table')
            setUnlocked(!unlocked)
          }}
          className={'border border-border ' + (unlocked ? 'bg-primary/10 text-primary' : '')}
        >
          {unlocked ? <LockOpen className="size-3.5" /> : <Lock className="size-3.5" />}
        </IconButton>
        <button
          type="button"
          onClick={() => setAdding((value) => !value)}
          className="inline-flex h-7 items-center gap-1 rounded-md bg-primary px-2 text-xs font-medium text-primary-foreground hover:bg-primary/90"
        >
          <PlusIcon size={14} /> New
        </button>
      </div>

      {globeEntries.length > 0 && (
        <div className="flex flex-col items-center gap-1 py-1">
          {mapMode === 'globe' ? (
            <div className="aspect-[420/570] w-[min(380px,74vw)]">
              <CountryGlobe entries={globeEntries} theme={theme} paused={globePaused} />
            </div>
          ) : (
            <div className="w-full max-w-3xl text-muted-foreground">
              <WorldMap highlight={highlightCountries} className="w-full" />
            </div>
          )}
          <div className="flex flex-wrap items-center justify-center gap-2 text-[11px] text-muted-foreground">
            <span>Where your clients and their projects are</span>
            <SegmentedControl
              aria-label="Map style"
              value={mapMode}
              onValueChange={chooseMapMode}
              options={[
                { value: 'globe', label: 'Globe' },
                { value: 'flat', label: 'Flat' },
              ]}
            />
            {mapMode === 'globe' && (
              <button
                type="button"
                onClick={() => toggleGlobe(!globePaused)}
                className="rounded border border-border px-1.5 py-0.5 hover:bg-muted hover:text-foreground"
              >
                {globePaused ? 'Play' : 'Pause'}
              </button>
            )}
          </div>
        </div>
      )}

      {adding && (
        <form onSubmit={onCreate} className="flex flex-wrap items-center gap-1.5 rounded-md border border-border bg-muted/30 p-2">
          <Input autoFocus value={name} onChange={(event) => setName(event.target.value)} placeholder="Client name" className="max-w-[200px]" />
          <Input value={company} onChange={(event) => setCompany(event.target.value)} placeholder="Company (optional)" className="max-w-[200px]" />
          <button className="h-7 rounded-md bg-primary px-2.5 text-xs font-medium text-primary-foreground hover:bg-primary/90">Create</button>
          <button type="button" onClick={() => setAdding(false)} className="h-7 rounded-md px-2 text-xs text-muted-foreground hover:bg-muted">Cancel</button>
        </form>
      )}

      {view === 'table' && unlocked && (
        <ClientReorderList
          clients={clients}
          companiesOf={companiesOf}
          onReorder={(ids) => reorder(ids)}
        />
      )}

      {view === 'table' && !unlocked && (
        <div className="divide-y divide-border rounded-md border border-border">
          {rows.map((client) => {
            const isOpen = open === client.id
            const linkedProjectIds = projectIdsForClient(client.id)
            const linkedProjects = projects.filter((project) => linkedProjectIds.includes(project.id))
            return (
              <div key={client.id} className={client.hidden ? 'opacity-50' : undefined}>
                <div className="flex items-center gap-2 px-2 py-1.5">
                  {diagnostic && (
                    <HideToggle hidden={client.hidden} onToggle={(v) => update(client.id, { hidden: v })} />
                  )}
                  <IconButton onClick={() => setOpen(isOpen ? null : client.id)}>
                    <ChevronRightIcon size={14} className={'transition-transform ' + (isOpen ? 'rotate-90' : '')} />
                  </IconButton>
                  <ClientImage clientId={client.id} name={client.name} url={client.photo_url ?? null} kind="photo" size="sm" />
                  <div className="min-w-0 flex-1">
                    <EditableText value={client.name} placeholder="Name" onSave={(value) => update(client.id, { name: value })} className="font-medium" />
                  </div>
                  <span className="hidden w-36 shrink-0 truncate text-xs text-muted-foreground sm:block">{companySummary(client.id)}</span>
                  <span className="hidden w-44 shrink-0 truncate text-xs text-muted-foreground md:block">{client.email}</span>
                  <span className="hidden w-28 shrink-0 truncate text-xs text-muted-foreground lg:block">{client.phone}</span>
                  <IconButton
                    onClick={async () => {
                      if (await confirm({ title: `Delete ${client.name || 'this client'}?` }))
                        remove(client.id)
                    }}
                    className="hover:text-destructive"
                  >
                    <TrashIcon size={14} />
                  </IconButton>
                </div>
                {isOpen && (
                  <div className="space-y-4 border-t border-border bg-muted/20 px-3 py-3">
                    <div className="flex flex-wrap items-start gap-5 rounded-lg border border-border bg-background/60 p-3">
                      <div className="space-y-1.5 text-center">
                        <ClientImage
                          clientId={client.id} name={client.name} url={client.photo_url ?? null}
                          kind="photo" size="lg" editable onChange={(url) => update(client.id, { photo_url: url })}
                        />
                        <p className="text-[10px] uppercase text-muted-foreground">Client photo</p>
                      </div>
                      <div className="min-w-52 flex-1 pt-1">
                        <p className="font-medium">{client.name || 'Unnamed client'}</p>
                        <p className="text-xs text-muted-foreground">Click the photo to upload or replace it. Manage brands under Companies below.</p>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-medium uppercase text-muted-foreground">Companies</span>
                        <button
                          type="button"
                          onClick={() => addCompany(client.id)}
                          className="inline-flex h-5 items-center gap-1 rounded px-1 text-[11px] text-muted-foreground hover:bg-muted hover:text-foreground"
                        >
                          <PlusIcon size={12} /> Add company
                        </button>
                      </div>
                      <div className="space-y-1.5">
                        {companiesOf(client.id).map((co) => (
                          <div key={co.id} className="flex items-center gap-2 rounded-md border border-border bg-background/60 p-2">
                            <ClientImage
                              clientId={client.id} name={co.name} url={co.logo_url ?? null}
                              kind="company-logo" slot={co.id} size="sm" editable
                              onChange={(url) => updateCompany(co.id, { logo_url: url })}
                            />
                            <Input
                              value={co.name}
                              onChange={(event) => updateCompany(co.id, { name: event.target.value })}
                              placeholder="Company name"
                              className="max-w-[220px]"
                            />
                            <Input
                              value={co.email_domain}
                              onChange={(event) => updateCompany(co.id, { email_domain: event.target.value })}
                              placeholder="company.com"
                              className="max-w-[180px]"
                            />
                            <IconButton
                              onClick={async () => {
                                if (await confirm({ title: `Remove ${co.name || 'this company'}?` }))
                                  removeCompany(co.id)
                              }}
                              className="ml-auto hover:text-destructive"
                            >
                              <TrashIcon size={14} />
                            </IconButton>
                          </div>
                        ))}
                        {companiesOf(client.id).length === 0 && (
                          <p className="text-xs text-muted-foreground">No companies yet.</p>
                        )}
                      </div>
                    </div>

                    <div className="grid gap-2 sm:grid-cols-2">
                      <label className="block">
                        <span className="text-[11px] font-medium uppercase text-muted-foreground">Email</span>
                        <Input value={client.email} onChange={(event) => update(client.id, { email: event.target.value })} className="mt-1" />
                      </label>
                      <label className="block">
                        <span className="text-[11px] font-medium uppercase text-muted-foreground">Phone</span>
                        <Input value={client.phone} onChange={(event) => update(client.id, { phone: event.target.value })} className="mt-1" />
                      </label>
                    </div>
                    <label className="block">
                      <span className="text-[11px] font-medium uppercase text-muted-foreground">Notes</span>
                      <Textarea rows={2} value={client.notes} onChange={(event) => update(client.id, { notes: event.target.value })} className="mt-1" />
                    </label>

                    <CountryPicker selected={client.countries ?? []} onChange={(countries) => update(client.id, { countries })} />

                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-medium uppercase text-muted-foreground">Projects</span>
                        <button type="button" onClick={() => setPickerFor(client.id)} className="inline-flex h-5 items-center gap-1 rounded px-1 text-[11px] text-muted-foreground hover:bg-muted hover:text-foreground">
                          <PlusIcon size={12} /> Link
                        </button>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {linkedProjects.map((project) => (
                          <span key={project.id} className="group/chip inline-flex items-center gap-1 rounded bg-muted px-1.5 py-0.5 text-xs">
                            <button type="button" onClick={() => nav(`/app/project/${project.id}`)} className="hover:underline">{project.name}</button>
                            <button type="button" onClick={() => unlinkFromProject(project.id, client.id)} className="opacity-0 hover:text-destructive group-hover/chip:opacity-100">
                              <XMarkIcon size={12} />
                            </button>
                          </span>
                        ))}
                        {linkedProjects.length === 0 && <span className="text-xs text-muted-foreground">Not linked to any project yet.</span>}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
          {rows.length === 0 && <EmptyClients hasClients={clients.length > 0} />}
        </div>
      )}

      {view === 'byCompany' && (
        <div className="space-y-4">
          {byCompany.map(([group, entries]) => (
            <section key={group} className="space-y-2">
              <div className="flex items-center gap-2">
                <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{group}</h2>
                <span className="text-[11px] text-muted-foreground">{entries.length}</span>
                <div className="h-px flex-1 bg-border" />
              </div>
              <div className="divide-y divide-border overflow-hidden rounded-md border border-border">
                {entries.map(({ client, company }) => (
                  <button key={client.id + (company?.id ?? '')} type="button" onClick={() => editClient(client.id)} className="flex w-full items-center gap-3 px-3 py-2 text-left hover:bg-muted/40">
                    <ClientImage clientId={client.id} name={client.name} url={client.photo_url ?? null} kind="photo" size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{client.name}</p>
                      <p className="truncate text-xs text-muted-foreground">{client.email || company?.email_domain || 'No email details'}</p>
                    </div>
                    {company?.logo_url && <ClientImage clientId={client.id} name={company.name} url={company.logo_url} kind="company-logo" slot={company.id} size="sm" />}
                    <ChevronRightIcon size={14} className="text-muted-foreground" />
                  </button>
                ))}
              </div>
            </section>
          ))}
          {rows.length === 0 && <div className="rounded-md border border-border"><EmptyClients hasClients={clients.length > 0} /></div>}
        </div>
      )}

      {view === 'grid' && (
        <div
          className="grid gap-3"
          style={{ gridTemplateColumns: `repeat(${gridCols}, minmax(0, 1fr))` }}
        >
          {rows.map((client) => (
            <button key={client.id} type="button" onClick={() => editClient(client.id)} className="rounded-xl border border-border bg-panel p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md">
              <div className="flex items-start gap-3">
                <ClientImage clientId={client.id} name={client.name} url={client.photo_url ?? null} kind="photo" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{client.name || 'Unnamed client'}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {companiesOf(client.id).map((co) => co.name).join(', ') || 'Independent'}
                  </p>
                </div>
                {companiesOf(client.id)[0] && (
                  <ClientImage
                    clientId={client.id}
                    name={companiesOf(client.id)[0].name}
                    url={companiesOf(client.id)[0].logo_url ?? null}
                    kind="company-logo"
                    slot={companiesOf(client.id)[0].id}
                    size="sm"
                  />
                )}
              </div>
              <div className="mt-4 space-y-1 text-xs text-muted-foreground">
                <p className="truncate">{client.email || 'No email address'}</p>
                <p className="truncate">
                  {companiesOf(client.id).map((co) => co.email_domain).filter(Boolean).join(', ') || 'No email domain'}
                </p>
              </div>
              {client.countries?.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1">
                  {client.countries.slice(0, 3).map((country) => <span key={country} className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] text-primary">{country}</span>)}
                  {client.countries.length > 3 && <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">+{client.countries.length - 3}</span>}
                </div>
              )}
            </button>
          ))}
          {rows.length === 0 && <div className="col-span-full rounded-md border border-border"><EmptyClients hasClients={clients.length > 0} /></div>}
        </div>
      )}

      <Dialog open={!!pickerFor} onOpenChange={(value) => !value && setPickerFor(null)}>
        {pickerFor && (
          <DialogContent aria-describedby={undefined}>
            <DialogHeader><DialogTitle>Link to a project</DialogTitle></DialogHeader>
            <div className="max-h-80 space-y-0.5 overflow-y-auto">
              {projects.map((project) => {
                const active = links.some((link) => link.project_id === project.id && link.client_id === pickerFor)
                return (
                  <button
                    key={project.id}
                    type="button"
                    onClick={() => active ? unlinkFromProject(project.id, pickerFor) : linkToProject(project.id, pickerFor)}
                    className={'flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm ' + (active ? 'bg-primary/10 text-foreground' : 'hover:bg-muted')}
                  >
                    {project.name}
                    {active && <span className="text-xs text-primary">Linked</span>}
                  </button>
                )
              })}
              {projects.length === 0 && <p className="px-2 py-6 text-center text-xs text-muted-foreground">No projects yet.</p>}
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  )
}

function ClientReorderList({
  clients,
  companiesOf,
  onReorder,
}: {
  clients: Client[]
  companiesOf: (id: string) => { name: string }[]
  onReorder: (ids: string[]) => void
}) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }))
  const ids = clients.map((c) => c.id)
  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e
    if (!over || active.id === over.id) return
    const from = ids.indexOf(String(active.id))
    const to = ids.indexOf(String(over.id))
    if (from < 0 || to < 0) return
    onReorder(arrayMove(ids, from, to))
  }
  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <div className="divide-y divide-border rounded-md border border-border">
          {clients.map((c) => (
            <ClientReorderRow
              key={c.id}
              client={c}
              company={companiesOf(c.id)[0]?.name}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  )
}

function ClientReorderRow({ client, company }: { client: Client; company?: string }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: client.id,
  })
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }
  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-2 px-2 py-1.5 text-sm">
      <button
        type="button"
        className="cursor-grab text-muted-foreground/50 hover:text-foreground active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-3.5" />
      </button>
      <ClientImage clientId={client.id} name={client.name} url={client.photo_url ?? null} kind="photo" size="sm" />
      <span className="min-w-0 flex-1 truncate font-medium">{client.name || 'Unnamed client'}</span>
      <span className="hidden shrink-0 truncate text-xs text-muted-foreground sm:block">{company}</span>
    </div>
  )
}

function EmptyClients({ hasClients }: { hasClients: boolean }) {
  return (
    <p className="px-2 py-8 text-center text-xs text-muted-foreground">
      {hasClients ? 'No clients match your search.' : 'No clients yet — add one to start linking them to projects.'}
    </p>
  )
}
