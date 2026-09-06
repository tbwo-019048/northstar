import { useEffect, useMemo, useState } from 'react'
import { AtSign } from 'lucide-react'
import { Bars3Icon } from '@/components/ui/bars-3'
import { ListBulletIcon } from '@/components/ui/list-bullet'
import { MagnifyingGlassIcon } from '@/components/ui/magnifying-glass'
import { PlusIcon } from '@/components/ui/plus'
import { Squares2X2Icon } from '@/components/ui/squares-2x2'
import { TrashIcon } from '@/components/ui/trash'
import { useEmails } from '@/store/useEmails'
import { EditableText, IconButton, Input, SecretField } from '@/components/ui-lite'
import type { EmailAccount } from '@/lib/types'

type EmailView = 'table' | 'byGroup' | 'grid'
const VIEW_KEY = 'northstar.emails.view'

export function Emails() {
  const {
    groups, accounts, loaded, load, subscribe, addGroup, removeGroup,
    addAccount, updateAccount, removeAccount,
  } = useEmails()
  const [active, setActive] = useState<string | null>(null)
  const [q, setQ] = useState('')
  const [view, setView] = useState<EmailView>(() => {
    try {
      return (localStorage.getItem(VIEW_KEY) as EmailView) || 'table'
    } catch {
      return 'table'
    }
  })

  useEffect(() => {
    if (!loaded) load()
    return subscribe()
  }, [loaded, load, subscribe])

  useEffect(() => {
    if (!active || !groups.some((group) => group.id === active)) setActive(groups[0]?.id ?? null)
  }, [groups, active])

  useEffect(() => {
    try {
      localStorage.setItem(VIEW_KEY, view)
    } catch {
      /* ignore */
    }
  }, [view])

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase()
    if (!query) return accounts
    return accounts.filter((account) =>
      [account.name, account.email, account.domain, account.notes]
        .some((value) => value.toLowerCase().includes(query)),
    )
  }, [accounts, q])

  const current = filtered
    .filter((account) => account.group_id === active)
    .sort((left, right) => left.sort - right.sort)

  const newGroup = async () => {
    const name = prompt('Group name (e.g. Personal, Business, Clients)')?.trim()
    if (!name) return
    const created = await addGroup(name)
    if (created) setActive(created.id)
  }

  const removeCurrentGroup = async () => {
    if (!active) return
    const group = groups.find((entry) => entry.id === active)
    if (!group || !confirm(`Delete "${group.name}" and every email account in it?`)) return
    await removeGroup(active)
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="text-sm font-semibold">Emails</h1>
        <span className="text-xs text-muted-foreground">{accounts.length}</span>
        <div className="flex-1" />
        <div className="relative">
          <MagnifyingGlassIcon size={14} className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(event) => setQ(event.target.value)} placeholder="Search" className="h-7 w-40 pl-7" />
        </div>
        <div className="flex items-center gap-0.5 rounded-md border border-border p-0.5">
          <IconButton title="Table" onClick={() => setView('table')} className={view === 'table' ? 'bg-muted text-foreground' : ''}>
            <ListBulletIcon size={14} />
          </IconButton>
          <IconButton title="Grouped" onClick={() => setView('byGroup')} className={view === 'byGroup' ? 'bg-muted text-foreground' : ''}>
            <Bars3Icon size={14} />
          </IconButton>
          <IconButton title="Grid" onClick={() => setView('grid')} className={view === 'grid' ? 'bg-muted text-foreground' : ''}>
            <Squares2X2Icon size={14} />
          </IconButton>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1 border-b border-border">
        {groups.map((group) => (
          <button
            key={group.id}
            type="button"
            onClick={() => setActive(group.id)}
            className={
              'relative h-8 px-2.5 text-xs font-medium transition-colors ' +
              (active === group.id
                ? 'text-foreground after:absolute after:inset-x-1 after:-bottom-px after:h-0.5 after:rounded-full after:bg-primary'
                : 'text-muted-foreground hover:text-foreground')
            }
          >
            {group.name}
          </button>
        ))}
        <button type="button" onClick={newGroup} className="inline-flex h-7 items-center gap-1 rounded-md border border-dashed border-border px-2 text-xs text-muted-foreground hover:bg-muted">
          <PlusIcon size={12} /> Group
        </button>
      </div>

      {groups.length === 0 ? (
        <p className="rounded-md border border-dashed border-border px-3 py-8 text-center text-xs text-muted-foreground">
          No groups yet — create one to start storing email accounts.
        </p>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => active && addAccount(active, { name: 'New account', sort: accounts.filter((account) => account.group_id === active).length })}
              className="inline-flex h-6 items-center gap-1 rounded-md border border-border px-1.5 text-xs hover:bg-muted"
            >
              <PlusIcon size={12} /> Add
            </button>
            <button type="button" onClick={removeCurrentGroup} className="ml-auto inline-flex h-6 items-center gap-1 rounded-md px-1.5 text-xs text-muted-foreground hover:bg-muted hover:text-destructive">
              <TrashIcon size={12} /> Delete group
            </button>
          </div>

          {view === 'table' && (
            <EmailTable accounts={current} updateAccount={updateAccount} removeAccount={removeAccount} emptyText={q ? 'No accounts match your search in this group.' : 'No accounts in this group yet.'} />
          )}

          {view === 'byGroup' && (
            <div className="space-y-4">
              {groups.map((group) => {
                const groupAccounts = filtered.filter((account) => account.group_id === group.id).sort((left, right) => left.sort - right.sort)
                return (
                  <section key={group.id} className="space-y-2">
                    <div className="flex items-center gap-2">
                      <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{group.name}</h2>
                      <span className="text-[11px] text-muted-foreground">{groupAccounts.length}</span>
                      <div className="h-px flex-1 bg-border" />
                    </div>
                    <EmailTable accounts={groupAccounts} updateAccount={updateAccount} removeAccount={removeAccount} emptyText={q ? 'No matching accounts.' : 'No accounts in this group yet.'} />
                  </section>
                )
              })}
            </div>
          )}

          {view === 'grid' && (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
              {current.map((account) => (
                <article key={account.id} className="group rounded-xl border border-border bg-panel p-4 shadow-sm">
                  <div className="flex items-start gap-3">
                    <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary"><AtSign className="size-4" /></div>
                    <div className="min-w-0 flex-1">
                      <EditableText value={account.name} onSave={(value) => updateAccount(account.id, { name: value })} className="font-semibold" />
                      <p className="truncate text-xs text-muted-foreground">{account.email || 'No email address'}</p>
                    </div>
                    <IconButton onClick={() => removeAccount(account.id)} className="opacity-0 group-hover:opacity-100 hover:text-destructive"><TrashIcon size={14} /></IconButton>
                  </div>
                  <div className="mt-4 space-y-2">
                    <label className="block">
                      <span className="text-[10px] font-medium uppercase text-muted-foreground">Domain</span>
                      <EditableText value={account.domain} placeholder="—" onSave={(value) => updateAccount(account.id, { domain: value })} />
                    </label>
                    <label className="block">
                      <span className="text-[10px] font-medium uppercase text-muted-foreground">Password</span>
                      <SecretField value={account.password} onChange={(event) => updateAccount(account.id, { password: event.target.value })} className="mt-1 h-7" />
                    </label>
                    <label className="block">
                      <span className="text-[10px] font-medium uppercase text-muted-foreground">Notes</span>
                      <EditableText value={account.notes} placeholder="—" onSave={(value) => updateAccount(account.id, { notes: value })} />
                    </label>
                  </div>
                </article>
              ))}
              {current.length === 0 && <p className="col-span-full rounded-md border border-border px-3 py-8 text-center text-xs text-muted-foreground">{q ? 'No accounts match your search in this group.' : 'No accounts in this group yet.'}</p>}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function EmailTable({
  accounts,
  updateAccount,
  removeAccount,
  emptyText,
}: {
  accounts: EmailAccount[]
  updateAccount: (id: string, patch: Partial<EmailAccount>) => Promise<{ error: string | null }>
  removeAccount: (id: string) => Promise<void>
  emptyText: string
}) {
  return (
    <div className="overflow-x-auto rounded-md border border-border">
      <table className="w-full min-w-[640px] table-fixed text-sm">
        <colgroup>
          <col className="w-40" /><col className="w-48" /><col className="w-32" />
          <col className="w-32" /><col /><col className="w-8" />
        </colgroup>
        <thead>
          <tr className="border-b border-border bg-muted/40 text-left text-[11px] uppercase text-muted-foreground">
            <th className="px-2 py-1 font-medium">Name</th><th className="px-2 py-1 font-medium">Email</th>
            <th className="px-2 py-1 font-medium">Domain</th><th className="px-2 py-1 font-medium">Password</th>
            <th className="px-2 py-1 font-medium">Notes</th><th />
          </tr>
        </thead>
        <tbody>
          {accounts.map((account) => (
            <tr key={account.id} className="group border-b border-border last:border-0">
              <td className="px-2 py-1 align-top"><EditableText value={account.name} onSave={(value) => updateAccount(account.id, { name: value })} /></td>
              <td className="px-2 py-1 align-top"><EditableText value={account.email} onSave={(value) => updateAccount(account.id, { email: value })} /></td>
              <td className="px-2 py-1 align-top"><EditableText value={account.domain} onSave={(value) => updateAccount(account.id, { domain: value })} /></td>
              <td className="px-2 py-1 align-top"><SecretField value={account.password} onChange={(event) => updateAccount(account.id, { password: event.target.value })} className="h-7" /></td>
              <td className="px-2 py-1 align-top"><EditableText value={account.notes} placeholder="—" onSave={(value) => updateAccount(account.id, { notes: value })} /></td>
              <td className="px-1 py-1 align-top">
                <IconButton onClick={() => removeAccount(account.id)} className="opacity-0 group-hover:opacity-100 hover:text-destructive"><TrashIcon size={14} /></IconButton>
              </td>
            </tr>
          ))}
          {accounts.length === 0 && <tr><td colSpan={6} className="px-2 py-6 text-center text-xs text-muted-foreground">{emptyText}</td></tr>}
        </tbody>
      </table>
    </div>
  )
}
