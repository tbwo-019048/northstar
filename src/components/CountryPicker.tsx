import { useMemo, useState } from 'react'
import { COUNTRY_NAMES } from '@/lib/countries'
import { PlusIcon } from '@/components/ui/plus'
import { XMarkIcon } from '@/components/ui/x-mark'
import { Input } from '@/components/ui-lite'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/velobits/dialog'

interface CountryPickerProps {
  selected?: string[]
  onChange: (countries: string[]) => void
  label?: string
}

export function CountryPicker({ selected = [], onChange, label = 'Countries' }: CountryPickerProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const filtered = useMemo(
    () => COUNTRY_NAMES.filter((country) => country.toLowerCase().includes(query.toLowerCase())),
    [query],
  )

  const toggle = (country: string) => {
    onChange(
      selected.includes(country)
        ? selected.filter((item) => item !== country)
        : [...selected, country],
    )
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1.5">
        <span className="text-[11px] font-medium uppercase text-muted-foreground">{label}</span>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="inline-flex h-5 items-center gap-1 rounded px-1 text-[11px] text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <PlusIcon size={12} /> Add
        </button>
      </div>
      <div className="flex min-h-6 flex-wrap gap-1.5">
        {selected.map((country) => (
          <span
            key={country}
            className="inline-flex items-center gap-1 rounded-full border border-blue-400/25 bg-blue-500/10 px-2 py-0.5 text-xs text-blue-700 dark:text-blue-200"
          >
            {country}
            <button type="button" onClick={() => toggle(country)} aria-label={`Remove ${country}`}>
              <XMarkIcon size={11} />
            </button>
          </span>
        ))}
        {!selected.length && <span className="text-xs text-muted-foreground">No countries selected.</span>}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        {open && (
          <DialogContent aria-describedby={undefined}>
            <DialogHeader>
              <DialogTitle>Select countries</DialogTitle>
            </DialogHeader>
            <Input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search countries…"
            />
            <div className="max-h-80 space-y-0.5 overflow-y-auto pr-1">
              {filtered.map((country) => {
                const active = selected.includes(country)
                return (
                  <button
                    key={country}
                    type="button"
                    onClick={() => toggle(country)}
                    className={
                      'flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm ' +
                      (active ? 'bg-blue-500/10 text-blue-700 dark:text-blue-200' : 'hover:bg-muted')
                    }
                  >
                    {country}
                    {active && <span className="text-xs">Selected</span>}
                  </button>
                )
              })}
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  )
}
