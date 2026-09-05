import { useEffect, useState } from 'react'
import { motion } from 'motion/react'
import { cn } from '@/lib/utils'

const generateRandomDigits = () =>
  Array.from({ length: 6 }, () => Math.floor(Math.random() * 10).toString())

interface ClerkOTPProps {
  delay?: number
  cardTitle?: string
  cardDescription?: string
  whileHover?: boolean
  className?: string
}

export default function ClerkOTP({
  delay = 3500,
  cardTitle = 'Multifactor Authentication',
  cardDescription = "Each user's self-serve multifactor settings are enforced automatically during sign-in.",
  whileHover = false,
  className,
}: ClerkOTPProps) {
  const [animationKey, setAnimationKey] = useState(0)

  useEffect(() => {
    const interval = window.setInterval(
      () => setAnimationKey((previous) => previous + 1),
      Math.max(delay, 3500),
    )
    return () => window.clearInterval(interval)
  }, [delay])

  return (
    <OTPCard
      key={animationKey}
      cardTitle={cardTitle}
      cardDescription={cardDescription}
      whileHover={whileHover}
      className={className}
    />
  )
}

function OTPCard({ cardTitle, cardDescription, whileHover, className }: ClerkOTPProps) {
  const [activeIndex, setActiveIndex] = useState(0)
  const [fadeOut, setFadeOut] = useState(false)
  const [digits] = useState(generateRandomDigits)
  const [hovered, setHovered] = useState(false)

  useEffect(() => {
    if (activeIndex >= digits.length || (whileHover && !hovered)) return

    const interval = window.setInterval(() => setActiveIndex((previous) => previous + 1), 400)
    const timeout =
      activeIndex === digits.length - 1
        ? window.setTimeout(() => setFadeOut(true), 450)
        : undefined

    return () => {
      window.clearInterval(interval)
      if (timeout !== undefined) window.clearTimeout(timeout)
    }
  }, [activeIndex, digits.length, hovered, whileHover])

  return (
    <motion.div
      initial={{ opacity: 1 }}
      onHoverStart={() => setHovered(true)}
      onHoverEnd={() => setHovered(false)}
      className={cn(
        'relative flex h-56 w-full max-w-[350px] items-center justify-center overflow-hidden rounded-md border border-border bg-panel shadow-lg',
        className,
      )}
    >
      <div className="absolute left-1/2 top-1/4 -translate-x-1/2">
        <div className="flex items-center justify-center gap-2.5">
          {digits.map((digit, index) => {
            const shouldAnimate = !whileHover || hovered
            return (
              <div
                key={`${digit}-${index}`}
                className="relative flex h-10 w-8 cursor-default items-center justify-center rounded-md bg-gradient-to-br from-neutral-100 to-white text-primary shadow-md dark:from-neutral-800 dark:to-neutral-900"
              >
                {shouldAnimate && (
                  <motion.div
                    className="absolute inset-0 rounded-md border border-cyan-400"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: [0, 1, 0] }}
                    transition={{ duration: 0.5, ease: 'easeInOut', delay: 2.25 }}
                    style={{ boxShadow: 'inset 0 0 12px rgba(34, 211, 238, 0.5)' }}
                  />
                )}
                {activeIndex === index && shouldAnimate && (
                  <motion.div
                    className="absolute inset-0 rounded-md border border-cyan-400"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.3, ease: 'easeInOut' }}
                    style={{ boxShadow: 'inset 0 0 12px rgba(34, 211, 238, 0.6)' }}
                  >
                    <svg viewBox="0 0 20 20" className="absolute inset-0 size-full" strokeWidth="0.4">
                      <path d="M 3 19 h 14" className="stroke-cyan-400 dark:stroke-cyan-500" />
                    </svg>
                  </motion.div>
                )}
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: shouldAnimate && !fadeOut ? 1 : 0 }}
                  transition={{
                    duration: fadeOut ? 0.1 : 0.2,
                    ease: 'easeInOut',
                    delay: fadeOut ? 0 : index * 0.43,
                  }}
                  className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
                >
                  {digit}
                </motion.span>
              </div>
            )
          })}
        </div>
      </div>
      <div className="absolute bottom-4 left-0 w-full px-4">
        <h2 className="text-sm font-semibold text-foreground">{cardTitle}</h2>
        <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{cardDescription}</p>
      </div>
    </motion.div>
  )
}
