import { useEffect, useState } from 'react'
import { PlusIcon } from '@/components/ui/plus'
import { TrashIcon } from '@/components/ui/trash'
import { useEmails } from '@/store/useEmails'
import { EditableText, IconButton, SecretField } from '@/components/ui-lite'

export function Emails() {
  const { groups, accounts, loaded, load, subscribe, addGroup, removeGroup, addAccount, updateAccount, removeAccount } =
    useEmails()
  const [active, setActive] = useState<string | null>(null)

  useEffect(() => {
    if (!loaded) load()
    return subscribe()
  }, [loaded, load, subscribe])

  useEffect(() => {
    if (!active || !groups.some((g) => g.id === active)) {
      setActive(groups[0]?.id ?? null)
    }
  }, [groups, active])

  const newGroup = async () => {
    const name = prompt('Group name (e.g. Personal, Business, Clients)')?.trim()
    if (!name) return
    const created = await addGroup(name)
    if (created) setActive(created.id)
  }

  const removeCurrentGroup = async () => {
    if (!active) return
    const group = groups.find((g) => g.id === active)
    if (!group) return
    if (!confirm(`Delete "${group.name}" and every email account in it?`)) return
    await removeGroup(active)
  }

  const current = accounts.filter((a) => a.group_id === active).sort((a, b) => a.sort - b.sort)

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <h1 className="text-sm font-semibold">Emails</h1>
        <span className="text-xs text-muted-foreground">{accounts.length}</span>
      </div>

      <div className="flex flex-wrap items-center gap-1 border-b border-border">
        {groups.map((g) => (
          <button
            key={g.id}
            type="button"
            onClick={() => setActive(g.id)}
            className={
              'relative h-8 px-2.5 text-xs font-medium transition-colors ' +
              (active === g.id
                ? 'text-foreground after:absolute after:inset-x-1 after:-bottom-px after:h-0.5 after:rounded-full after:bg-primary'
                : 'text-muted-foreground hover:text-foreground')
            }
          >
            {g.name}
          </button>
        ))}
        <button
          type="button"
          onClick={newGroup}
          className="inline-flex h-7 items-center gap-1 rounded-md border border-dashed border-border px-2 text-xs text-muted-foreground hover:bg-muted"
        >
          <PlusIcon size={12} /> Group
        </button>
      </div>

      {groups.length === 0 ? (
        <p className="rounded-md border border-dashed border-border px-3 py-8 text-center text-xs text-muted-foreground">
          No groups yet — create one to start storing email accounts.
        </p>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() =>
                active &&
                addAccount(active, { name: 'New account', sort: current.length })
              }
              className="inline-flex h-6 items-center gap-1 rounded-md border border-border px-1.5 text-xs hover:bg-muted"
            >
              <PlusIcon size={12} /> Add
            </button>
            <button
              type="button"
              onClick={removeCurrentGroup}
              className="ml-auto inline-flex h-6 items-center gap-1 rounded-md px-1.5 text-xs text-muted-foreground hover:bg-muted hover:text-destructive"
            >
              <TrashIcon size={12} /> Delete group
            </button>
          </div>

          <div className="overflow-x-auto rounded-md border border-border">
            <table className="w-full min-w-[640px] table-fixed text-sm">
              <colgroup>
                <col className="w-40" />
                <col className="w-48" />
                <col className="w-32" />
                <col className="w-32" />
                <col />
                <col className="w-8" />
              </colgroup>
              <thead>
                <tr className="border-b border-border bg-muted/40 text-left text-[11px] uppercase text-muted-foreground">
                  <th className="px-2 py-1 font-medium">Name</th>
                  <th className="px-2 py-1 font-medium">Email</th>
                  <th className="px-2 py-1 font-medium">Domain</th>
                  <th className="px-2 py-1 font-medium">Password</th>
                  <th className="px-2 py-1 font-medium">Notes</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {current.map((a) => (
                  <tr key={a.id} className="group border-b border-border last:border-0">
                    <td className="px-2 py-1 align-top">
                      <EditableText value={a.name} onSave={(v) => updateAccount(a.id, { name: v })} />
                    </td>
                    <td className="px-2 py-1 align-top">
                      <EditableText value={a.email} onSave={(v) => updateAccount(a.id, { email: v })} />
                    </td>
                    <td className="px-2 py-1 align-top">
                      <EditableText value={a.domain} onSave={(v) => updateAccount(a.id, { domain: v })} />
                    </td>
                    <td className="px-2 py-1 align-top">
                      <SecretField
                        value={a.password}
                        onChange={(e) => updateAccount(a.id, { password: e.target.value })}
                        className="h-7"
                      />
                    </td>
                    <td className="px-2 py-1 align-top">
                      <EditableText value={a.notes} placeholder="—" onSave={(v) => updateAccount(a.id, { notes: v })} />
                    </td>
                    <td className="px-1 py-1 align-top">
                      <IconButton
                        onClick={() => removeAccount(a.id)}
                        className="opacity-0 group-hover:opacity-100 hover:text-destructive"
                      >
                        <TrashIcon size={14} />
                      </IconButton>
                    </td>
                  </tr>
                ))}
                {current.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-2 py-6 text-center text-xs text-muted-foreground">
                      No accounts in this group yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
