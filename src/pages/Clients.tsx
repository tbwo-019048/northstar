import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronRightIcon } from '@/components/ui/chevron-right'
import { PlusIcon } from '@/components/ui/plus'
import { TrashIcon } from '@/components/ui/trash'
import { XMarkIcon } from '@/components/ui/x-mark'
import { useClients } from '@/store/useClients'
import { useProjects } from '@/store/useProjects'
import { EditableText, IconButton, Input, Textarea } from '@/components/ui-lite'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/velobits/dialog'
import { CountryPicker } from '@/components/CountryPicker'

export function Clients() {
  const { clients, loaded, load, subscribe, create, update, remove, links, linkToProject, unlinkFromProject, projectIdsForClient } =
    useClients()
  const { projects, loaded: projectsLoaded, load: loadProjects } = useProjects()
  const nav = useNavigate()
  const [open, setOpen] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')
  const [company, setCompany] = useState('')
  const [pickerFor, setPickerFor] = useState<string | null>(null)

  useEffect(() => {
    if (!loaded) load()
    return subscribe()
  }, [loaded, load, subscribe])

  useEffect(() => {
    if (!projectsLoaded) loadProjects()
  }, [projectsLoaded, loadProjects])

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    const created = await create({ name: name.trim(), company: company.trim() })
    setName('')
    setCompany('')
    setAdding(false)
    if (created) setOpen(created.id)
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <h1 className="text-sm font-semibold">Clients</h1>
        <span className="text-xs text-muted-foreground">{clients.length}</span>
        <button
          type="button"
          onClick={() => setAdding((v) => !v)}
          className="ml-auto inline-flex h-7 items-center gap-1 rounded-md bg-primary px-2 text-xs font-medium text-primary-foreground hover:bg-primary/90"
        >
          <PlusIcon size={14} /> New
        </button>
      </div>

      {adding && (
        <form onSubmit={onCreate} className="flex flex-wrap items-center gap-1.5 rounded-md border border-border bg-muted/30 p-2">
          <Input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Client name" className="max-w-[200px]" />
          <Input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Company (optional)" className="max-w-[200px]" />
          <button className="h-7 rounded-md bg-primary px-2.5 text-xs font-medium text-primary-foreground hover:bg-primary/90">
            Create
          </button>
          <button
            type="button"
            onClick={() => setAdding(false)}
            className="h-7 rounded-md px-2 text-xs text-muted-foreground hover:bg-muted"
          >
            Cancel
          </button>
        </form>
      )}

      <div className="divide-y divide-border rounded-md border border-border">
        {clients.map((c) => {
          const isOpen = open === c.id
          const linkedProjectIds = projectIdsForClient(c.id)
          const linkedProjects = projects.filter((p) => linkedProjectIds.includes(p.id))
          return (
            <div key={c.id}>
              <div className="flex items-center gap-2 px-2 py-1.5">
                <IconButton onClick={() => setOpen(isOpen ? null : c.id)}>
                  <ChevronRightIcon size={14} className={'transition-transform ' + (isOpen ? 'rotate-90' : '')} />
                </IconButton>
                <div className="min-w-0 flex-1">
                  <EditableText value={c.name} placeholder="Name" onSave={(v) => update(c.id, { name: v })} className="font-medium" />
                </div>
                <span className="w-36 shrink-0 truncate text-xs text-muted-foreground">{c.company}</span>
                <span className="w-44 shrink-0 truncate text-xs text-muted-foreground">{c.email}</span>
                <span className="w-28 shrink-0 truncate text-xs text-muted-foreground">{c.phone}</span>
                <IconButton
                  onClick={() => {
                    if (confirm(`Delete ${c.name || 'this client'}?`)) remove(c.id)
                  }}
                  className="hover:text-destructive"
                >
                  <TrashIcon size={14} />
                </IconButton>
              </div>
              {isOpen && (
                <div className="space-y-2 border-t border-border bg-muted/20 px-2 py-2">
                  <div className="grid gap-2 sm:grid-cols-3">
                    <label className="block">
                      <span className="text-[11px] font-medium uppercase text-muted-foreground">Company</span>
                      <Input value={c.company} onChange={(e) => update(c.id, { company: e.target.value })} className="mt-1" />
                    </label>
                    <label className="block">
                      <span className="text-[11px] font-medium uppercase text-muted-foreground">Email</span>
                      <Input value={c.email} onChange={(e) => update(c.id, { email: e.target.value })} className="mt-1" />
                    </label>
                    <label className="block">
                      <span className="text-[11px] font-medium uppercase text-muted-foreground">Phone</span>
                      <Input value={c.phone} onChange={(e) => update(c.id, { phone: e.target.value })} className="mt-1" />
                    </label>
                  </div>
                  <label className="block">
                    <span className="text-[11px] font-medium uppercase text-muted-foreground">Notes</span>
                    <Textarea rows={2} value={c.notes} onChange={(e) => update(c.id, { notes: e.target.value })} className="mt-1" />
                  </label>

                  <CountryPicker
                    selected={c.countries ?? []}
                    onChange={(countries) => update(c.id, { countries })}
                  />

                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-medium uppercase text-muted-foreground">Projects</span>
                      <button
                        type="button"
                        onClick={() => setPickerFor(c.id)}
                        className="inline-flex h-5 items-center gap-1 rounded px-1 text-[11px] text-muted-foreground hover:bg-muted hover:text-foreground"
                      >
                        <PlusIcon size={12} /> Link
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {linkedProjects.map((p) => (
                        <span
                          key={p.id}
                          className="group/chip inline-flex items-center gap-1 rounded bg-muted px-1.5 py-0.5 text-xs"
                        >
                          <button type="button" onClick={() => nav(`/app/project/${p.id}`)} className="hover:underline">
                            {p.name}
                          </button>
                          <button
                            type="button"
                            onClick={() => unlinkFromProject(p.id, c.id)}
                            className="opacity-0 hover:text-destructive group-hover/chip:opacity-100"
                          >
                            <XMarkIcon size={12} />
                          </button>
                        </span>
                      ))}
                      {linkedProjects.length === 0 && (
                        <span className="text-xs text-muted-foreground">Not linked to any project yet.</span>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )
        })}
        {clients.length === 0 && (
          <p className="px-2 py-6 text-center text-xs text-muted-foreground">
            No clients yet — add one to start linking them to projects.
          </p>
        )}
      </div>

      <Dialog open={!!pickerFor} onOpenChange={(v) => !v && setPickerFor(null)}>
        {pickerFor && (
          <DialogContent aria-describedby={undefined}>
            <DialogHeader>
              <DialogTitle>Link to a project</DialogTitle>
            </DialogHeader>
            <div className="max-h-80 space-y-0.5 overflow-y-auto">
              {projects.map((p) => {
                const active = links.some((l) => l.project_id === p.id && l.client_id === pickerFor)
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() =>
                      active ? unlinkFromProject(p.id, pickerFor) : linkToProject(p.id, pickerFor)
                    }
                    className={
                      'flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm ' +
                      (active ? 'bg-primary/10 text-foreground' : 'hover:bg-muted')
                    }
                  >
                    {p.name}
                    {active && <span className="text-xs text-primary">Linked</span>}
                  </button>
                )
              })}
              {projects.length === 0 && (
                <p className="px-2 py-6 text-center text-xs text-muted-foreground">No projects yet.</p>
              )}
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  )
}
