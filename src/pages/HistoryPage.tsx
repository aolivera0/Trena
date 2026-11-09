import { ChevronRight } from 'lucide-react'
import { useState } from 'react'
import { Link, Navigate, useParams } from 'react-router'
import { useProfile } from '../auth/AuthProvider'
import { BodyweightPanel } from '../components/BodyweightPanel'
import { ExerciseThumb } from '../components/ExercisePicker'
import { SessionList } from '../components/session/SessionList'
import { EmptyState, FullScreenSpinner, PageHeader, Segmented, Spinner } from '../components/ui'
import { useAthlete } from '../hooks/useAthlete'
import { useExerciseStats } from '../hooks/useExerciseStats'
import { exerciseLabel } from '../lib/exercises'
import { formatWeight } from '../lib/format'

type Tab = 'sessions' | 'exercises' | 'bodyweight'

// Historial propio (/history) o de un atleta para su entrenador (/athlete/:id/history)
export function HistoryPage() {
  const { user } = useProfile()
  const { athleteId = user.uid } = useParams()
  const { athlete, isSelf, isCoach, loading } = useAthlete(athleteId)
  const [tab, setTab] = useState<Tab>('sessions')

  if (loading) return <FullScreenSpinner />
  if (!athlete || (!isSelf && !isCoach)) return <Navigate to="/" replace />

  return (
    <div className="space-y-5">
      <PageHeader title="Historial" subtitle={isSelf ? undefined : athlete.displayName} />
      <Segmented
        value={tab}
        onChange={setTab}
        options={[
          { value: 'sessions', label: 'Sesiones' },
          { value: 'exercises', label: 'Ejercicios' },
          { value: 'bodyweight', label: 'Peso' },
        ]}
      />
      {tab === 'sessions' && <SessionList athleteId={athleteId} title="Todas las sesiones" max={100} />}
      {tab === 'exercises' && <ExerciseList athleteId={athleteId} />}
      {tab === 'bodyweight' && <BodyweightPanel athleteId={athleteId} canLog={isSelf} />}
    </div>
  )
}

function ExerciseList({ athleteId }: { athleteId: string }) {
  const { profile } = useProfile()
  const { data: stats, loading } = useExerciseStats(athleteId)
  const sorted = [...stats].sort((a, b) => b.lastDate - a.lastDate)

  if (loading) return <Spinner />
  if (!sorted.length) return <EmptyState>Aún no hay ejercicios registrados. Termina una sesión para verlos aquí.</EmptyState>

  return (
    <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
      {sorted.map((s) => (
        <li key={s.id}>
          <Link to={`/exercise/${athleteId}/${encodeURIComponent(s.id)}`} className="flex items-center gap-3 p-3 hover:bg-surface-2">
            <ExerciseThumb slug={s.exercise.slug} size={40} />
            <span className="min-w-0 flex-1">
              <span className="block truncate font-medium">{exerciseLabel(s.exercise)}</span>
              <span className="block text-xs text-muted">
                {s.timesDone != null && `${s.timesDone} ${s.timesDone === 1 ? 'vez' : 'veces'} · `}
                Último: {new Date(s.lastDate).toLocaleDateString('es', { day: 'numeric', month: 'short' })}
              </span>
            </span>
            <span className="text-right">
              <span className="block text-sm font-semibold tabular">{formatWeight(s.bestE1rmKg, profile.prefs.unit)}</span>
              <span className="block text-[11px] text-muted">mejor e1RM</span>
            </span>
            <ChevronRight size={18} className="text-muted" />
          </Link>
        </li>
      ))}
    </ul>
  )
}
