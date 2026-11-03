import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router'
import { useAuth } from '../auth/AuthProvider'
import { Button, Card, FullScreenSpinner } from '../components/ui'
import { useDoc } from '../hooks/useFirestore'
import { acceptInvite, inviteRef } from '../lib/db'
import { setPendingInvite } from '../lib/pendingInvite'
import type { Invite } from '../lib/types'

export function InvitePage() {
  const { token = '' } = useParams()
  const { user, profile, loading } = useAuth()
  const navigate = useNavigate()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => setPendingInvite(token), [token])

  const ref = useMemo(() => (user && profile ? inviteRef(token) : null), [user, profile, token])
  const { data: invite, loading: inviteLoading } = useDoc<Invite>(ref)

  if (loading) return <FullScreenSpinner />
  if (!user) return <Navigate to="/login" replace state={{ from: `/invite/${token}` }} />
  if (!profile) return <Navigate to="/onboarding" replace />
  if (inviteLoading) return <FullScreenSpinner />

  const done = () => {
    setPendingInvite(null)
    navigate('/', { replace: true })
  }

  let problem: string | null = null
  if (!invite) problem = 'Esta invitación no existe.'
  else if (invite.coachId === user.uid) problem = 'Este es tu propio link de invitación: compártelo con tu atleta.'
  else if (invite.usedBy && invite.usedBy !== user.uid) problem = 'Esta invitación ya fue usada por otra persona.'
  else if (invite.usedBy === user.uid || profile.coachId === invite.coachId)
    problem = `Ya estás vinculado con ${invite.coachName}.`
  else if (invite.expiresAt.toMillis() < Date.now()) problem = 'Esta invitación venció. Pide un link nuevo.'

  async function accept() {
    if (!invite) return
    setBusy(true)
    setError(null)
    try {
      await acceptInvite(user!.uid, token, invite, profile!.roles)
      done()
    } catch (err) {
      console.error(err)
      setError('No se pudo aceptar la invitación. Revisa tu conexión.')
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center px-6">
      <Card className="space-y-4 text-center">
        {problem ? (
          <>
            <p>{problem}</p>
            <Button variant="primary" className="w-full" onClick={done}>
              Ir al inicio
            </Button>
          </>
        ) : (
          <>
            <p className="text-sm text-muted">Invitación de entrenador</p>
            <p className="text-xl font-semibold">{invite!.coachName}</p>
            <p className="text-sm text-muted">
              Podrá programar tus semanas, ver tus RMs y seguir tus sesiones en tiempo real.
              {profile.coachId && ' Reemplazará a tu entrenador actual.'}
            </p>
            {error && <p className="text-sm text-danger">{error}</p>}
            <Button variant="primary" className="w-full" onClick={accept} loading={busy}>
              Aceptar
            </Button>
            <Link to="/" onClick={() => setPendingInvite(null)} className="block text-sm text-muted">
              Ahora no
            </Link>
          </>
        )}
      </Card>
    </div>
  )
}
