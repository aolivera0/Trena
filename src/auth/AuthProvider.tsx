import {
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  signOut as fbSignOut,
  type User,
} from 'firebase/auth'
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useDoc } from '../hooks/useFirestore'
import { userRef } from '../lib/db'
import { auth } from '../lib/firebase'
import type { UserProfile, WithId } from '../lib/types'

type AuthState = {
  user: User | null
  // undefined = cargando, null = no tiene perfil (debe hacer onboarding)
  profile: WithId<UserProfile> | null | undefined
  loading: boolean
}

const AuthContext = createContext<AuthState>({ user: null, profile: undefined, loading: true })

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [authLoading, setAuthLoading] = useState(true)

  useEffect(
    () =>
      onAuthStateChanged(auth, (u) => {
        setUser(u)
        setAuthLoading(false)
      }),
    [],
  )

  const ref = useMemo(() => (user ? userRef(user.uid) : null), [user])
  const { data: profile, loading: profileLoading } = useDoc<UserProfile>(ref)

  const value: AuthState = {
    user,
    profile: user ? profile : null,
    loading: authLoading || profileLoading,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext)
}

// Para las pantallas que ya pasaron por RequireProfile
export function useProfile() {
  const { user, profile } = useAuth()
  if (!user || !profile) throw new Error('useProfile requiere sesión y perfil')
  return { user, profile }
}

// En una PWA instalada en iOS el popup no funciona; ahí se usa redirect.
function isStandalone() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

export async function signInWithGoogle() {
  const provider = new GoogleAuthProvider()
  provider.setCustomParameters({ prompt: 'select_account' })
  if (isStandalone()) return signInWithRedirect(auth, provider)
  return signInWithPopup(auth, provider)
}

export function signOut() {
  return fbSignOut(auth)
}
