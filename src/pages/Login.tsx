import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { KeyRound, Lock } from 'lucide-react'
import { useAuth } from '@/store/useAuth'
import { APP_ACCESS_TOKEN } from '@/lib/supabase'
import { ThemeToggle } from '@/components/ThemeToggle'
import { NorthStarIcon } from '@/components/NorthStarIcon'

export function Login() {
  const nav = useNavigate()
  const { gateOpen, unlockGate, signIn } = useAuth()
  const [token, setToken] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const needGate = !!APP_ACCESS_TOKEN && !gateOpen

  const onGate = (e: React.FormEvent) => {
    e.preventDefault()
    setErr(null)
    if (!unlockGate(token)) setErr('Invalid access token.')
  }

  const onLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setErr(null)
    setBusy(true)
    const { error } = await signIn(email.trim(), password)
    setBusy(false)
    if (error) setErr(error)
    else nav('/app', { replace: true })
  }

  const field =
    'h-8 w-full rounded-md border border-border bg-background px-2.5 text-sm outline-none focus:border-ring focus:ring-2 focus:ring-ring/40'

  return (
    <div className="grid min-h-svh place-items-center bg-background px-4 text-foreground">
      <div className="fixed right-4 top-4">
        <ThemeToggle />
      </div>
      <div className="w-full max-w-xs">
        <div className="mb-6">
          <div className="flex items-center gap-2 font-semibold">
            <NorthStarIcon className="size-4 text-primary" />
            NorthStar
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">Leading The Way</p>
        </div>

        {needGate ? (
          <form onSubmit={onGate} className="space-y-2.5">
            <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <KeyRound className="size-3.5" /> Access token
            </label>
            <input
              autoFocus
              type="password"
              className={field}
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="Environment access token"
            />
            {err && <p className="text-xs text-destructive">{err}</p>}
            <button className="h-8 w-full rounded-md bg-primary text-sm font-medium text-primary-foreground hover:bg-primary/90">
              Continue
            </button>
          </form>
        ) : (
          <form onSubmit={onLogin} className="space-y-2.5">
            <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Lock className="size-3.5" /> Sign in
            </label>
            <input
              autoFocus
              type="email"
              autoComplete="username"
              className={field}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email"
            />
            <input
              type="password"
              autoComplete="current-password"
              className={field}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
            />
            {err && <p className="text-xs text-destructive">{err}</p>}
            <button
              disabled={busy}
              className="h-8 w-full rounded-md bg-primary text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
            >
              {busy ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
