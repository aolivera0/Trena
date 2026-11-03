import { useMemo } from 'react'
import { useProfile } from '../auth/AuthProvider'
import { rmsCol, userRef } from '../lib/db'
import type { RM, UserProfile, WithId } from '../lib/types'
import { useDoc, useQuery } from './useFirestore'

// Perfil y RMs de un atleta (uno mismo o un atleta del entrenador)
export function useAthlete(athleteId: string) {
  const { user, profile } = useProfile()
  const isSelf = athleteId === user.uid
  const ref = useMemo(() => (isSelf ? null : userRef(athleteId)), [athleteId, isSelf])
  const other = useDoc<UserProfile>(ref)
  const athlete: WithId<UserProfile> | null | undefined = isSelf ? profile : other.data

  const rmsQuery = useMemo(() => rmsCol(athleteId), [athleteId])
  const rms = useQuery<RM>(rmsQuery, `rms:${athleteId}`)
  const rmById = useMemo(() => new Map(rms.data.map((r) => [r.id, r])), [rms.data])

  return {
    athlete,
    loading: (!isSelf && other.loading) || rms.loading,
    rms: rms.data,
    rmById,
    isSelf,
    isCoach: !isSelf && athlete?.coachId === user.uid,
  }
}
