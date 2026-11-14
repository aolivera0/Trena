import { doc } from 'firebase/firestore'
import { useMemo } from 'react'
import { useLocation } from 'react-router'
import { useAthlete } from '../../hooks/useAthlete'
import { ATHLETE_PARAM, EXERCISE_PARAM, useExerciseModal } from '../../hooks/useExerciseModal'
import { useExerciseStats } from '../../hooks/useExerciseStats'
import { useDoc } from '../../hooks/useFirestore'
import { exercisesCol } from '../../lib/db'
import { catalogRef, customRef, getCatalogExercise } from '../../lib/exercises'
import type { CustomExercise, ExerciseRef } from '../../lib/types'
import { ExerciseModal } from './ExerciseTabs'

// Montado en el layout: muestra la ventana del ejercicio indicada en la URL
export function ExerciseModalHost() {
  const { search } = useLocation()
  const params = new URLSearchParams(search)
  const exerciseId = params.get(EXERCISE_PARAM)
  const athleteId = params.get(ATHLETE_PARAM)
  if (!exerciseId || !athleteId) return null
  return <Host key={`${athleteId}:${exerciseId}`} athleteId={athleteId} exerciseId={exerciseId} />
}

function Host({ athleteId, exerciseId }: { athleteId: string; exerciseId: string }) {
  const { pathname } = useLocation()
  const { closeExercise } = useExerciseModal()
  const { athlete, rmById, isSelf, isCoach, loading } = useAthlete(athleteId)
  const { data: stats } = useExerciseStats(athleteId)

  // Datos del ejercicio: historial → RM → catálogo → ejercicio propio
  const customId = exerciseId.startsWith('c:') ? exerciseId.slice(2) : null
  const customRefDoc = useMemo(() => (customId ? doc(exercisesCol(), customId) : null), [customId])
  const { data: custom } = useDoc<CustomExercise>(customRefDoc)

  if (loading || !athlete || (!isSelf && !isCoach)) return null

  const stat = stats.find((s) => s.id === exerciseId)
  const rm = rmById.get(exerciseId)
  const fromCatalog = exerciseId.startsWith('wg:') ? getCatalogExercise(exerciseId.slice(3)) : undefined
  const exercise: ExerciseRef | undefined =
    stat?.exercise ?? rm?.exercise ?? (fromCatalog && catalogRef(fromCatalog)) ?? (custom ? customRef(custom) : undefined)
  if (!exercise) return null

  // En una sesión, sus propias series no cuentan como "entrenamientos anteriores"
  const sessionMatch = pathname.match(/^\/session\/[^/]+\/([^/]+)/)

  return (
    <ExerciseModal
      onClose={closeExercise}
      ctx={{
        athleteId,
        exercise,
        bodyweightKg: athlete.bodyweightKg ?? 0,
        formula: athlete.prefs.e1rmFormula,
        rm,
        stats: stat,
        athleteCoachId: athlete.coachId,
        excludeSessionId: sessionMatch?.[1],
      }}
    />
  )
}
