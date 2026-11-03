import {
  onSnapshot,
  type DocumentReference,
  type FirestoreError,
  type Query,
} from 'firebase/firestore'
import { useEffect, useState } from 'react'
import type { WithId } from '../lib/types'

type State<T> = { key: string | null; data: T; error: FirestoreError | null }

// Los datos se guardan junto con la clave que los produjo: si la clave cambió y
// el snapshot nuevo aún no llega, se reporta loading en vez de datos viejos.

// Suscripción en tiempo real a un documento (null = no suscribirse).
// data = undefined mientras carga, null si no existe.
export function useDoc<T>(ref: DocumentReference | null) {
  const key = ref?.path ?? null
  const [state, setState] = useState<State<WithId<T> | null> | null>(null)

  useEffect(() => {
    if (!ref) return
    return onSnapshot(
      ref,
      (snap) =>
        setState({
          key: ref.path,
          data: snap.exists() ? ({ ...(snap.data() as T), id: snap.id } as WithId<T>) : null,
          error: null,
        }),
      (error) => {
        console.error(ref.path, error)
        setState({ key: ref.path, data: null, error })
      },
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps -- la ruta identifica la ref
  }, [key])

  if (!ref) return { data: null, loading: false, error: null }
  if (state?.key !== key) return { data: undefined, loading: true, error: null }
  return { data: state.data, loading: false, error: state.error }
}

// Suscripción en tiempo real a una consulta. `key` la identifica (null = no suscribirse).
export function useQuery<T>(query: Query | null, key: string | null) {
  const [state, setState] = useState<State<WithId<T>[]> | null>(null)

  useEffect(() => {
    if (!query || !key) return
    return onSnapshot(
      query,
      (snap) =>
        setState({
          key,
          data: snap.docs.map((d) => ({ ...(d.data() as T), id: d.id }) as WithId<T>),
          error: null,
        }),
      (error) => {
        console.error(key, error)
        setState({ key, data: [], error })
      },
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps -- la clave identifica la consulta
  }, [key])

  if (!query || !key) return { data: [] as WithId<T>[], loading: false, error: null }
  if (state?.key !== key) return { data: [] as WithId<T>[], loading: true, error: null }
  return { data: state.data, loading: false, error: state.error }
}
