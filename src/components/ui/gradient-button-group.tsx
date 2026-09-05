import type { ReactNode } from 'react'
import { motion } from 'motion/react'
import { cn } from '@/lib/utils'

export interface GradientButtonGroupItem {
  id: string
  label: string
  icon: ReactNode
}

interface GradientButtonGroupProps {
  items: GradientButtonGroupItem[]
  activeId: string
  onSelect: (id: string) => void
  isDarkMode?: boolean
  className?: string
}

export function GradientButtonGroup({
  items,
  activeId,
  onSelect,
  isDarkMode = true,
  className,
}: GradientButtonGroupProps) {
  return (
    <div className={cn('flex w-full justify-center py-1', className)}>
      <div className="relative inline-flex items-center">
        <div
          className="absolute inset-0 rounded-[24px] transition-colors duration-300"
          style={{
            background: isDarkMode
              ? 'linear-gradient(180deg, #141416 0%, #111113 50%, #0e0e10 100%)'
              : 'linear-gradient(180deg, #d1d1d6 0%, #cacad0 50%, #c3c3c9 100%)',
            boxShadow: isDarkMode
              ? 'inset 0 2px 8px rgba(0,0,0,.6), inset 0 1px 2px rgba(0,0,0,.4), 0 1px 0 rgba(255,255,255,.04)'
              : 'inset 0 2px 6px rgba(0,0,0,.1), inset 0 0 0 1px rgba(0,0,0,.08), 0 1px 0 rgba(255,255,255,.55)',
          }}
        />
        <div className="relative z-10 flex">
          <div
            className="absolute -inset-1 rounded-[24px] border bg-muted transition-colors duration-300 dark:bg-background"
            style={{ borderColor: isDarkMode ? 'rgba(255,255,255,.05)' : 'rgba(0,0,0,.08)' }}
          />
          <nav
            aria-label="Primary navigation"
            className="relative inline-flex items-center gap-1 rounded-[20px] p-1.5 transition-colors duration-300 sm:gap-2"
            style={{
              background: isDarkMode
                ? 'linear-gradient(180deg, #1c1c1f 0%, #17171a 52%, #131316 100%)'
                : 'linear-gradient(180deg, #fff 0%, #fefeff 52%, #fcfcfe 100%)',
              borderTop: isDarkMode
                ? '1px solid rgba(255,255,255,.1)'
                : '1px solid rgba(255,255,255,1)',
              boxShadow: isDarkMode ? 'none' : '0 1px 2px rgba(0,0,0,.04), 0 1px 0 #fff',
            }}
          >
            {items.map((item) => {
              const active = item.id === activeId
              return (
                <button
                  key={item.id}
                  type="button"
                  title={item.label}
                  aria-label={item.label}
                  aria-current={active ? 'page' : undefined}
                  onClick={() => onSelect(item.id)}
                  className={cn(
                    'group relative flex size-11 items-center justify-center rounded-[14px] transition-colors sm:size-12',
                    active
                      ? isDarkMode
                        ? 'text-white'
                        : 'text-zinc-900'
                      : isDarkMode
                        ? 'text-zinc-600 hover:text-zinc-300'
                        : 'text-zinc-400 hover:text-zinc-700',
                  )}
                >
                  {active && (
                    <>
                      <motion.span
                        layoutId="northstar-gradient-dock-well"
                        className="absolute inset-0 rounded-[14px] bg-muted"
                        style={{
                          background: isDarkMode
                            ? 'linear-gradient(180deg, #0a0a0c 0%, #0e0e10 50%, #0c0c0e 100%)'
                            : '#e0e0e3',
                          boxShadow: isDarkMode
                            ? 'inset 0 2px 6px rgba(0,0,0,.9), inset 0 0 4px rgba(0,0,0,.6), 0 1px 0 rgba(255,255,255,.05)'
                            : 'inset 0 2px 6px rgba(0,0,0,.12), inset 0 0 4px rgba(0,0,0,.06), 0 1px 0 rgba(255,255,255,.9)',
                        }}
                        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                      />
                      <motion.span
                        layoutId="northstar-gradient-dock-ring"
                        className="absolute inset-[3px] overflow-hidden rounded-[12px]"
                        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                      >
                        <span
                          className="animate-gold-spin absolute inset-[-60%] origin-center will-change-transform"
                          style={{
                            background:
                              'conic-gradient(from 220deg, #6ff7cc 0%, #44ebcf 16%, #adfa1f 33%, #c8ff5a 50%, #89f5a0 66%, #37d8c5 82%, #6ff7cc 100%)',
                          }}
                        />
                      </motion.span>
                      <motion.span
                        layoutId="northstar-gradient-dock-inner"
                        className="absolute inset-[6px] rounded-[9px] bg-muted"
                        style={{
                          background: isDarkMode ? '#0a0a0d' : '#d8d8db',
                          boxShadow: isDarkMode
                            ? 'inset 0 1px 3px rgba(0,0,0,.9), inset 0 0 2px rgba(0,0,0,.6)'
                            : 'inset 0 1px 3px rgba(0,0,0,.18), inset 0 0 2px rgba(0,0,0,.1)',
                        }}
                        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                      />
                    </>
                  )}
                  <motion.span
                    initial={false}
                    animate={{ scale: active ? 1 : 0.96, opacity: active ? 1 : 0.9 }}
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    className="relative z-10 flex items-center justify-center"
                  >
                    {item.icon}
                  </motion.span>
                </button>
              )
            })}
          </nav>
        </div>
      </div>
    </div>
  )
}
