import { useEffect } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { useAuth } from '@/store/useAuth'
import { Landing } from '@/pages/Landing'
import { Login } from '@/pages/Login'
import { Overview } from '@/pages/Overview'
import { Project } from '@/pages/Project'
import { AppLayout } from '@/components/AppLayout'

function Protected({ children }: { children: React.ReactNode }) {
  const { session, ready, gateOpen } = useAuth()
  const loc = useLocation()
  if (!ready) {
    return <div className="grid min-h-svh place-items-center text-sm text-muted-foreground">Loading…</div>
  }
  if (!gateOpen || !session) {
    return <Navigate to="/login" state={{ from: loc.pathname }} replace />
  }
  return <>{children}</>
}

export default function App() {
  const init = useAuth((s) => s.init)
  useEffect(() => {
    init()
  }, [init])

  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route
        element={
          <Protected>
            <AppLayout />
          </Protected>
        }
      >
        <Route path="/app" element={<Overview />} />
        <Route path="/app/project/:id" element={<Project />} />
        <Route path="/app/project/:id/:tab" element={<Project />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
