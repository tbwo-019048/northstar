import { useEffect, useState } from 'react'
import { Crown } from 'lucide-react'
import { PlusIcon } from '@/components/ui/plus'
import { TrashIcon } from '@/components/ui/trash'
import { useAuth } from '@/store/useAuth'
import { useMembers } from '@/store/useMembers'
import { Input, Select } from '@/components/ui-lite'

const PERMISSION_KEYS: { key: string; label: string }[] = [
  { key: 'manage_projects', label: 'Manage projects' },
  { key: 'delete_data', label: 'Delete data' },
  { key: 'manage_pipeline', label: 'Manage pipelines' },
]

export function MembersSettings() {
  const isMaster = useAuth((s) => s.isMaster)
  const { members, groups, loaded, load, addMember, updateMember, removeMember, addGroup, updateGroupPermissions } =
    useMembers()
  const [email, setEmail] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [group, setGroup] = useState('User')
  const [newGroup, setNewGroup] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!loaded) load()
  }, [loaded, load])

  const onAddMember = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return
    const { error: err } = await addMember(email, displayName, group)
    if (err) setError(err)
    else {
      setEmail('')
      setDisplayName('')
    }
  }

  const onAddGroup = async (e: React.FormEvent) => {
    e.preventDefault()
    const name = newGroup.trim()
    if (!name) return
    const { error: err } = await addGroup(name)
    if (err) setError(err)
    else setNewGroup('')
  }

  return (
    <section className="space-y-3 rounded-md border border-border p-3">
      <h2 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <Crown className="size-3.5" /> Members &amp; groups
      </h2>
      <p className="text-xs text-muted-foreground">
        App-level roles, separate from Supabase logins. Adding someone here does not create their
        login — create the email/password account in the Supabase dashboard first, then add them
        here with the group that decides what they can do.
        {!isMaster && ' Only the Master can add, edit, or remove members and groups.'}
      </p>
      {error && <p className="text-xs text-destructive">{error}</p>}

      <div className="overflow-hidden rounded-md border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40 text-left text-[11px] uppercase text-muted-foreground">
              <th className="px-2 py-1 font-medium">Name</th>
              <th className="px-2 py-1 font-medium">Email</th>
              <th className="px-2 py-1 font-medium">Group</th>
              <th className="w-8" />
            </tr>
          </thead>
          <tbody>
            {members.map((m) => (
              <tr key={m.id} className="border-b border-border last:border-0">
                <td className="px-2 py-1">
                  <span className="inline-flex items-center gap-1">
                    {m.display_name || m.email.split('@')[0]}
                    {m.is_master && <Crown className="size-3 text-primary" aria-label="Master" />}
                  </span>
                </td>
                <td className="px-2 py-1 text-xs text-muted-foreground">{m.email}</td>
                <td className="px-2 py-1">
                  {m.is_master ? (
                    <span className="text-xs text-muted-foreground">Master</span>
                  ) : (
                    <Select
                      value={m.group_name}
                      disabled={!isMaster}
                      onChange={(e) => updateMember(m.id, { group_name: e.target.value })}
                      className="h-6"
                    >
                      {groups.map((g) => (
                        <option key={g.name} value={g.name}>
                          {g.name}
                        </option>
                      ))}
                    </Select>
                  )}
                </td>
                <td className="px-2 py-1">
                  {isMaster && !m.is_master && (
                    <button
                      type="button"
                      onClick={() => removeMember(m.id)}
                      className="grid size-6 place-items-center rounded text-muted-foreground hover:text-destructive"
                    >
                      <TrashIcon size={14} />
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {members.length === 0 && (
              <tr>
                <td colSpan={4} className="px-2 py-4 text-center text-xs text-muted-foreground">
                  No members yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {isMaster && (
        <form onSubmit={onAddMember} className="flex flex-wrap items-center gap-1.5">
          <Input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="email@example.com"
            type="email"
            className="max-w-[14rem]"
          />
          <Input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Display name (optional)"
            className="max-w-[10rem]"
          />
          <Select value={group} onChange={(e) => setGroup(e.target.value)}>
            {groups.map((g) => (
              <option key={g.name} value={g.name}>
                {g.name}
              </option>
            ))}
          </Select>
          <button className="inline-flex h-7 items-center gap-1 rounded-md bg-primary px-2.5 text-xs font-medium text-primary-foreground hover:bg-primary/90">
            <PlusIcon size={12} /> Add member
          </button>
        </form>
      )}

      <div className="space-y-2 border-t border-border pt-3">
        <h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Groups &amp; permissions
        </h3>
        <p className="text-[11px] text-muted-foreground">
          These toggles describe intent for now — GitHub-token and member/group edits are the only
          actions actually restricted to the Master today; the rest of the app doesn't check them
          per-feature yet.
        </p>
        <div className="space-y-2">
          {groups.map((g) => (
            <div key={g.name} className="rounded-md border border-border p-2">
              <div className="mb-1 text-xs font-medium">{g.name}</div>
              <div className="flex flex-wrap gap-3">
                {PERMISSION_KEYS.map((perm) => (
                  <label key={perm.key} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <input
                      type="checkbox"
                      disabled={!isMaster}
                      checked={Boolean(g.permissions[perm.key])}
                      onChange={(e) =>
                        updateGroupPermissions(g.name, { ...g.permissions, [perm.key]: e.target.checked })
                      }
                      className="accent-[var(--primary)]"
                    />
                    {perm.label}
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
        {isMaster && (
          <form onSubmit={onAddGroup} className="flex items-center gap-1.5">
            <Input
              value={newGroup}
              onChange={(e) => setNewGroup(e.target.value)}
              placeholder="New group name"
              className="max-w-[10rem]"
            />
            <button className="inline-flex h-7 items-center gap-1 rounded-md border border-border px-2 text-xs hover:bg-muted">
              <PlusIcon size={12} /> Add group
            </button>
          </form>
        )}
      </div>
    </section>
  )
}
