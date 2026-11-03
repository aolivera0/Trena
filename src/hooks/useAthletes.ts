import { query, where } from 'firebase/firestore'
import { useMemo } from 'react'
import { useProfile } from '../auth/AuthProvider'
import { usersCol } from '../lib/db'
import type { UserProfile } from '../lib/types'
import { useQuery } from './useFirestore'

// Atletas a cargo del entrenador actual
export function useAthletes() {
  const { user, profile } = useProfile()
  const q = useMemo(
    () => (profile.roles.coach ? query(usersCol(), where('coachId', '==', user.uid)) : null),
    [user.uid, profile.roles.coach],
  )
  const result = useQuery<UserProfile>(q, profile.roles.coach ? `athletes:${user.uid}` : null)
  const athletes = [...result.data].sort((a, b) => a.displayName.localeCompare(b.displayName, 'es'))
  return { ...result, data: athletes }
}
