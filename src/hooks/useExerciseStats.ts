import { useEffect, useMemo } from 'react'
import { backfillTimesDone, exerciseStatsCol } from '../lib/sessionDb'
import type { ExerciseStats } from '../lib/types'
import { useQuery } from './useFirestore'

const backfilled = new Set<string>()

// Estadísticas por ejercicio de un atleta. Si alguna no tiene contador de
// veces (datos anteriores), lo calcula una vez en segundo plano.
export function useExerciseStats(athleteId: string) {
  const q = useMemo(() => exerciseStatsCol(athleteId), [athleteId])
  const result = useQuery<ExerciseStats>(q, `stats:${athleteId}`)

  const missing = result.data.filter((s) => s.timesDone == null).map((s) => s.id)
  const missingKey = missing.join(',')
  useEffect(() => {
    if (!missingKey || backfilled.has(athleteId)) return
    backfilled.add(athleteId)
    void backfillTimesDone(athleteId, missingKey.split(',')).catch((err) => console.error(err))
  }, [athleteId, missingKey])

  return result
}
