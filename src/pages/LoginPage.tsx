import { useState } from 'react'
import { Navigate, useLocation } from 'react-router'
import { signInWithGoogle, useAuth } from '../auth/AuthProvider'
import { Button, FullScreenSpinner } from '../components/ui'

export function LoginPage() {
  const { user, loading } = useAuth()
  const location = useLocation()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const from = (location.state as { from?: string } | null)?.from ?? '/'

  if (loading) return <FullScreenSpinner />
  if (user) return <Navigate to={from} replace />

  async function login() {
    setBusy(true)
    setError(null)
    try {
      await signInWithGoogle()
    } catch (err) {
      const code = (err as { code?: string }).code
      if (code !== 'auth/popup-closed-by-user' && code !== 'auth/cancelled-popup-request') {
        setError('No se pudo iniciar sesión. Intenta de nuevo.')
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-10 px-6">
      <div className="space-y-3 text-center">
        <img src="/icon.svg" alt="" className="mx-auto size-20" />
        <h1 className="text-3xl font-bold tracking-tight">Trena</h1>
        <p className="text-muted">Programa, entrena y mide tu progreso.</p>
      </div>
      <div className="space-y-3">
        <Button variant="primary" className="w-full" onClick={login} loading={busy}>
          Continuar con Google
        </Button>
        {error && <p className="text-center text-sm text-danger">{error}</p>}
      </div>
    </div>
  )
}
