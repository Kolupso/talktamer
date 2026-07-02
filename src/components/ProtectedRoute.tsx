import { Navigate, useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useAuth } from '../auth/AuthProvider'

export default function ProtectedRoute({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return <p style={{ padding: '2rem' }}>Loading…</p>
  }

  if (!session) {
    // Remember where the user was headed so we can send them back after login.
    return <Navigate to="/login" replace state={{ from: location }} />
  }

  return <>{children}</>
}
