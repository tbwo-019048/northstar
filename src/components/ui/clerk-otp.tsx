import { useRef } from 'react'
import { cn } from '@/lib/utils'

interface ClerkOTPProps {
  value: string
  onChange: (value: string) => void
  length?: number
  cardTitle?: string
  cardDescription?: string
  className?: string
  disabled?: boolean
  error?: boolean
  autoFocus?: boolean
}

export default function ClerkOTP({
  value,
  onChange,
  length = 6,
  cardTitle = 'Multifactor Authentication',
  cardDescription = 'Enter the verification code to continue.',
  className,
  disabled = false,
  error = false,
  autoFocus = false,
}: ClerkOTPProps) {
  const refs = useRef<Array<HTMLInputElement | null>>([])
  const safeLength = Math.max(1, length)

  const focus = (index: number) => {
    const next = Math.max(0, Math.min(index, safeLength - 1))
    refs.current[next]?.focus()
    refs.current[next]?.select()
  }

  const insert = (index: number, input: string) => {
    const characters = input.replace(/\s/g, '').split('')
    if (!characters.length) return
    const next = Array.from({ length: safeLength }, (_, itemIndex) => value[itemIndex] ?? '')
    characters.slice(0, safeLength - index).forEach((character, offset) => {
      next[index + offset] = character
    })
    onChange(next.join('').slice(0, safeLength))
    focus(Math.min(index + characters.length, safeLength - 1))
  }

  const clearAt = (index: number) => {
    const next = Array.from({ length: safeLength }, (_, itemIndex) => value[itemIndex] ?? '')
    next[index] = ''
    onChange(next.join(''))
  }

  return (
    <div
      className={cn(
        'relative flex min-h-56 w-full flex-col justify-between overflow-hidden rounded-xl border bg-panel p-5 shadow-lg',
        error ? 'border-destructive/60' : 'border-border',
        className,
      )}
    >
      <div>
        <h2 className="text-sm font-semibold text-foreground">{cardTitle}</h2>
        <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{cardDescription}</p>
      </div>

      <div
        className="flex w-full items-center justify-center gap-1.5"
        role="group"
        aria-label={cardTitle}
        onPaste={(event) => {
          event.preventDefault()
          const activeIndex = refs.current.findIndex((input) => input === document.activeElement)
          insert(Math.max(activeIndex, 0), event.clipboardData.getData('text'))
        }}
      >
        {Array.from({ length: safeLength }, (_, index) => (
          <input
            key={index}
            ref={(element) => {
              refs.current[index] = element
            }}
            autoFocus={autoFocus && index === 0}
            autoComplete={index === 0 ? 'one-time-code' : 'off'}
            autoCapitalize="none"
            spellCheck={false}
            disabled={disabled}
            type="text"
            inputMode="text"
            maxLength={safeLength}
            value={value[index] ?? ''}
            aria-label={`Verification token character ${index + 1} of ${safeLength}`}
            className={cn(
              'h-11 min-w-0 flex-1 rounded-md border bg-background text-center font-mono text-sm font-semibold text-foreground outline-none transition',
              'focus:border-blue-400 focus:ring-2 focus:ring-blue-400/30',
              error ? 'border-destructive/60' : 'border-border',
            )}
            onFocus={(event) => event.currentTarget.select()}
            onChange={(event) => {
              const entered = event.currentTarget.value
              if (!entered) clearAt(index)
              else insert(index, entered)
            }}
            onKeyDown={(event) => {
              if (event.key === 'Backspace') {
                event.preventDefault()
                if (value[index]) clearAt(index)
                else if (index > 0) {
                  clearAt(index - 1)
                  focus(index - 1)
                }
              } else if (event.key === 'Delete') {
                event.preventDefault()
                clearAt(index)
              } else if (event.key === 'ArrowLeft') {
                event.preventDefault()
                focus(index - 1)
              } else if (event.key === 'ArrowRight') {
                event.preventDefault()
                focus(index + 1)
              } else if (event.key === 'Home') {
                event.preventDefault()
                focus(0)
              } else if (event.key === 'End') {
                event.preventDefault()
                focus(safeLength - 1)
              }
            }}
          />
        ))}
      </div>

      <p className="text-[11px] text-muted-foreground">
        Type or paste the complete token. Use the arrow keys to move between characters.
      </p>
    </div>
  )
}
