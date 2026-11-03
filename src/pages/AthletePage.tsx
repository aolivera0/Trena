import { Navigate, useNavigate, useParams } from 'react-router'
import { useProfile } from '../auth/AuthProvider'
import { Avatar, ProgramList } from '../components/ProgramList'
import { RmList } from '../components/RmList'
import { SessionList } from '../components/session/SessionList'
import { Button, Card, FullScreenSpinner } from '../components/ui'
import { useAthlete } from '../hooks/useAthlete'
import { useAthletes } from '../hooks/useAthletes'
import { removeCoach } from '../lib/db'
import { track } from '../lib/feedback'
import { formatWeight } from '../lib/format'

// Ficha de un atleta vista por su entrenador (o por uno mismo si también es entrenador)
export function AthletePage() {
  const { athleteId = '' } = useParams()
  const { profile } = useProfile()
  const navigate = useNavigate()
  const { athlete, loading, rms, isSelf, isCoach } = useAthlete(athleteId)
  const { data: athletes } = useAthletes()

  if (loading) return <FullScreenSpinner />
  if (!athlete || (!isSelf && !isCoach)) return <Navigate to="/coach" replace />

  const copyTargets = [...(profile.roles.athlete ? [profile] : []), ...athletes]

  function unlink() {
    if (!athlete || !confirm(`¿Dejar de entrenar a ${athlete.displayName}? Perderás el acceso a sus datos.`)) return
    track(removeCoach(athlete.id), 'No se pudo desvincular')
    navigate('/coach', { replace: true })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Avatar profile={athlete} size={48} />
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-bold">{athlete.displayName}</h1>
          <p className="text-sm text-muted">
            {athlete.bodyweightKg != null
              ? `Peso corporal ${formatWeight(athlete.bodyweightKg, profile.prefs.unit)}`
              : 'Sin peso corporal'}
          </p>
        </div>
      </div>

      <SessionList athleteId={athleteId} />

      <ProgramList athleteId={athleteId} canCreate copyTargets={copyTargets} />

      <RmList athleteId={athleteId} rms={rms} bodyweightKg={athlete.bodyweightKg} editable />

      {isCoach && (
        <Card>
          <Button variant="danger" size="sm" onClick={unlink}>
            Dejar de entrenar a este atleta
          </Button>
        </Card>
      )}
    </div>
  )
}
