import { useCallback, useEffect, useRef, useState } from 'react'
import { saveWeek } from '../lib/db'
import { track } from '../lib/feedback'
import type { Day } from '../lib/types'

const DEBOUNCE_MS = 600

// Edición local de los días de una semana con guardado diferido. Mientras hay
// cambios sin guardar se ignoran los snapshots remotos para no pisar lo que se
// está escribiendo; después, los cambios de otros (p. ej. el atleta o el
// entrenador en otro dispositivo) se reflejan solos.
export function useDebouncedWeek(athleteId: string, programId: string, weekId: string, remoteDays: Day[]) {
  const [days, setLocal] = useState(remoteDays)
  const pending = useRef<Day[] | null>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!pending.current) setLocal(remoteDays)
  }, [remoteDays])

  const flush = useCallback(() => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = null
    if (!pending.current) return
    track(saveWeek(athleteId, programId, weekId, { days: pending.current }))
    pending.current = null
  }, [athleteId, programId, weekId])

  const setDays = useCallback(
    (update: (days: Day[]) => Day[]) => {
      setLocal((prev) => {
        const next = update(prev)
        pending.current = next
        return next
      })
      if (timer.current) clearTimeout(timer.current)
      timer.current = setTimeout(flush, DEBOUNCE_MS)
    },
    [flush],
  )

  // Guarda lo pendiente al salir de la pantalla o al cerrar/ocultar la app
  useEffect(() => {
    window.addEventListener('pagehide', flush)
    return () => {
      window.removeEventListener('pagehide', flush)
      flush()
    }
  }, [flush])

  return [days, setDays] as const
}
