/** A hide checkbox shown on list rows while diagnostic mode is on. */
export function HideToggle({
  hidden,
  onToggle,
  className,
}: {
  hidden?: boolean | null
  onToggle: (v: boolean) => void
  className?: string
}) {
  return (
    <label
      title="Hide from lists"
      onClick={(e) => e.stopPropagation()}
      className={'inline-flex cursor-pointer items-center ' + (className ?? '')}
    >
      <input
        type="checkbox"
        checked={!!hidden}
        onChange={(e) => onToggle(e.target.checked)}
        className="size-3.5 accent-primary"
      />
    </label>
  )
}
