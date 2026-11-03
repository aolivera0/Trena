import { Navigate, Outlet, useLocation } from 'react-router'
import { FullScreenSpinner } from '../components/ui'
import { useAuth } from './AuthProvider'

// Requiere sesión iniciada; si no, manda al login recordando a dónde iba.
export function RequireAuth() {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading) return <FullScreenSpinner />
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  return <Outlet />
}

// Requiere perfil creado; si no, manda al onboarding.
export function RequireProfile() {
  const { profile } = useAuth()
  const location = useLocation()
  if (!profile) return <Navigate to="/onboarding" replace state={{ from: location.pathname }} />
  return <Outlet />
}

export function RequireCoach() {
  const { profile } = useAuth()
  if (!profile?.roles.coach) return <Navigate to="/" replace />
  return <Outlet />
}
