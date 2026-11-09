import { ArrowLeft } from 'lucide-react'
import { Link, Navigate, useParams } from 'react-router'
import { ExerciseTabs } from '../components/exercise/ExerciseTabs'
import { EmptyState, FullScreenSpinner } from '../components/ui'
import { useAthlete } from '../hooks/useAthlete'
import { useExerciseStats } from '../hooks/useExerciseStats'
import { catalogRef, getCatalogExercise } from '../lib/exercises'

// Detalle de un ejercicio (R-4): historial y tutorial
export function ExercisePage() {
  const { athleteId = '', exerciseId: rawId = '' } = useParams()
  const exerciseId = decodeURIComponent(rawId)
  const { athlete, rmById, isSelf, isCoach, loading } = useAthlete(athleteId)
  const { data: stats, loading: statsLoading } = useExerciseStats(athleteId)

  if (loading || statsLoading) return <FullScreenSpinner />
  if (!athlete || (!isSelf && !isCoach)) return <Navigate to="/" replace />

  const stat = stats.find((s) => s.id === exerciseId)
  const rm = rmById.get(exerciseId)
  const fromCatalog = exerciseId.startsWith('wg:') ? getCatalogExercise(exerciseId.slice(3)) : undefined
  const exercise = stat?.exercise ?? rm?.exercise ?? (fromCatalog && catalogRef(fromCatalog))
  const backTo = isSelf ? '/history' : `/athlete/${athleteId}/history`

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <Link to={backTo} aria-label="Volver" className="-ml-2 flex size-9 items-center justify-center rounded-lg text-muted hover:text-text">
          <ArrowLeft size={20} />
        </Link>
        <div className="min-w-0">
          <h1 className="truncate text-xl font-bold">{exercise?.name ?? 'Ejercicio'}</h1>
          {exercise?.variant && <p className="truncate text-sm text-muted">{exercise.variant}</p>}
        </div>
      </div>

      {exercise ? (
        <ExerciseTabs
          athleteId={athleteId}
          exercise={exercise}
          bodyweightKg={athlete.bodyweightKg ?? 0}
          formula={athlete.prefs.e1rmFormula}
          rm={rm}
          stats={stat}
          athleteCoachId={athlete.coachId}
        />
      ) : (
        <EmptyState>Ejercicio no encontrado.</EmptyState>
      )}
    </div>
  )
}
