import { useCallback, useEffect, useRef, useState } from 'react'
import { updateEntry } from '../lib/sessionDb'
import type { SessionEntry } from '../lib/types'

const DEBOUNCE_MS = 400

// Escritura por campo de una entrada de la sesión. Los cambios se muestran al
// instante (capa local `pending`) y se envían agrupados tras una pausa al
// escribir, o de inmediato (marcar una serie). Cada campo es un field path
// distinto, así que atleta y entrenador pueden editar a la vez sin pisarse.
export function useEntryWriter(athleteId: string, sessionId: string, entryId: string, remote: SessionEntry) {
  const [pending, setPending] = useState<Record<string, unknown>>({})
  const queued = useRef<Record<string, unknown>>({})
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Lo ya enviado se descarta cuando llega el siguiente snapshot (que lo incluye)
  const inFlight = useRef(new Set<string>())
  useEffect(() => {
    if (!inFlight.current.size) return
    const sent = inFlight.current
    inFlight.current = new Set()
    setPending((p) => {
      const next = { ...p }
      for (const k of sent) if (!(k in queued.current)) delete next[k]
      return next
    })
  }, [remote])

  const flush = useCallback(() => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = null
    const patch = queued.current
    if (!Object.keys(patch).length) return
    queued.current = {}
    Object.keys(patch).forEach((k) => inFlight.current.add(k))
    updateEntry(athleteId, sessionId, entryId, patch)
  }, [athleteId, sessionId, entryId])

  const write = useCallback(
    (patch: Record<string, unknown>, immediate = false) => {
      queued.current = { ...queued.current, ...patch }
      setPending((p) => ({ ...p, ...patch }))
      if (timer.current) clearTimeout(timer.current)
      if (immediate) flush()
      else timer.current = setTimeout(flush, DEBOUNCE_MS)
    },
    [flush],
  )

  useEffect(() => {
    window.addEventListener('pagehide', flush)
    return () => {
      window.removeEventListener('pagehide', flush)
      flush()
    }
  }, [flush])

  // Valor visible de un field path: lo local pendiente o lo remoto
  const read = useCallback(
    <T,>(path: string, remoteValue: T): T => (path in pending ? (pending[path] as T) : remoteValue),
    [pending],
  )

  return { write, read }
}
