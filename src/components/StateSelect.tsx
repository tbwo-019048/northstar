import { Select } from '@/components/ui-lite'
import {
  WORKSPACE_STATES,
  WORKSPACE_STATE_LABEL,
  type WorkspaceState,
} from '@/lib/workspaceState'
import { cn } from '@/lib/utils'

export function StateSelect({
  value,
  onChange,
  className,
  labelled = true,
  disabled = false,
}: {
  value: WorkspaceState
  onChange: (value: WorkspaceState) => void
  className?: string
  labelled?: boolean
  disabled?: boolean
}) {
  const select = (
    <Select
      value={value}
      disabled={disabled}
      aria-label="State"
      onChange={(event) => onChange(event.target.value as WorkspaceState)}
      className={cn(
        'min-w-[7.25rem] capitalize',
        value === 'production'
          ? 'border-emerald-500/40 text-emerald-700 dark:text-emerald-300'
          : 'border-amber-500/40 text-amber-700 dark:text-amber-300',
        className,
      )}
    >
      {WORKSPACE_STATES.map((state) => (
        <option key={state} value={state}>
          {WORKSPACE_STATE_LABEL[state]}
        </option>
      ))}
    </Select>
  )

  if (!labelled) return select
  return (
    <label className="inline-flex items-center gap-2 text-xs text-muted-foreground">
      <span>State</span>
      {select}
    </label>
  )
}
