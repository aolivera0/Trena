import { Play, Plus } from 'lucide-react'
import { Link, Navigate, useNavigate } from 'react-router'
import { useProfile } from '../auth/AuthProvider'
import { ProgramList } from '../components/ProgramList'
import { SessionList, useRecentSessions } from '../components/session/SessionList'
import { Button, PageHeader } from '../components/ui'
import { formatClock, useNow } from '../hooks/useNow'
import { startSession } from '../lib/sessionDb'

export function HomePage() {
  const { user, profile } = useProfile()
  const navigate = useNavigate()
  const { data: recent } = useRecentSessions(user.uid)
  const active = recent.filter((s) => s.status === 'IN_PROGRESS')
  const now = useNow(1000, active.length > 0)

  if (!profile.roles.athlete) return <Navigate to="/coach" replace />

  function startEmpty() {
    const id = startSession(
      user.uid,
      user.uid,
      { name: 'Entrenamiento libre', source: null, bodyweightKg: profile.bodyweightKg ?? 0 },
      [],
    )
    navigate(`/session/${user.uid}/${id}`)
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Entrenar" subtitle={`Hola, ${profile.displayName.split(' ')[0]}`} />

      {active.map((s) => (
        <Link
          key={s.id}
          to={`/session/${user.uid}/${s.id}`}
          className="flex items-center gap-3 rounded-xl border border-accent/40 bg-accent/10 p-4"
        >
          <span className="flex size-10 items-center justify-center rounded-full bg-accent text-bg">
            <Play size={18} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-xs uppercase tracking-wide text-accent">En curso</span>
            <span className="block truncate font-semibold">{s.name}</span>
          </span>
          <span className="text-lg font-semibold tabular">{formatClock((now - s.startedAt) / 1000)}</span>
        </Link>
      ))}

      <Button className="w-full" onClick={startEmpty}>
        <Plus size={16} /> Entrenamiento vacío
      </Button>

      <ProgramList athleteId={user.uid} canCreate />

      <SessionList athleteId={user.uid} title="Últimas sesiones" max={5} />
    </div>
  )
}
