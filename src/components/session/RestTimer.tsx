import { useEffect, useRef } from 'react'
import { formatClock, useNow } from '../../hooks/useNow'
import { updateSession } from '../../lib/sessionDb'
import { beep, vibrate } from '../../lib/sound'
import type { Session } from '../../lib/types'

// Barra de descanso. El fin se guarda como hora absoluta en la sesión, así
// sobrevive a recargas, al bloqueo de pantalla y se ve igual en el dispositivo
// del entrenador. Pita en los últimos 3 segundos y al terminar.
export function RestTimer({ athleteId, sessionId, timer }: { athleteId: string; sessionId: string; timer: NonNullable<Session['restTimer']> }) {
  const now = useNow(200)
  const remainingMs = timer.endsAt - now
  const remaining = Math.ceil(remainingMs / 1000)
  const lastBeep = useRef<number | null>(null)

  useEffect(() => {
    if (remaining <= 3 && remaining >= 1 && lastBeep.current !== remaining) {
      lastBeep.current = remaining
      beep(120, 880)
    }
    if (remainingMs <= 0 && lastBeep.current !== 0) {
      lastBeep.current = 0
      // Solo suena si el descanso terminó hace poco (no al abrir una sesión vieja)
      if (remainingMs > -2000) {
        beep(450, 1320)
        vibrate([200, 100, 200])
      }
      updateSession(athleteId, sessionId, { restTimer: null })
    }
  }, [remaining, remainingMs, athleteId, sessionId])

  const adjust = (deltaSec: number) =>
    updateSession(athleteId, sessionId, {
      restTimer: { endsAt: timer.endsAt + deltaSec * 1000, durationSec: Math.max(1, timer.durationSec + deltaSec) },
    })

  const progress = Math.min(1, Math.max(0, remainingMs / (timer.durationSec * 1000)))

  return (
    <div className="sticky bottom-[calc(4rem+env(safe-area-inset-bottom))] z-20 -mx-4 border-t border-border bg-surface/95 px-4 py-2 backdrop-blur">
      <div className="mb-2 h-1.5 overflow-hidden rounded-full bg-surface-2">
        <div className="h-full rounded-full bg-accent transition-[width] duration-200" style={{ width: `${progress * 100}%` }} />
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs uppercase tracking-wide text-muted">Descanso</span>
        <span className={`flex-1 text-center text-2xl font-bold tabular ${remaining <= 3 ? 'text-warning' : ''}`}>
          {formatClock(remaining)}
        </span>
        <button type="button" onClick={() => adjust(-30)} className="h-9 rounded-lg bg-surface-2 px-3 text-sm">
          −30
        </button>
        <button type="button" onClick={() => adjust(30)} className="h-9 rounded-lg bg-surface-2 px-3 text-sm">
          +30
        </button>
        <button
          type="button"
          onClick={() => updateSession(athleteId, sessionId, { restTimer: null })}
          className="h-9 rounded-lg bg-accent px-3 text-sm font-semibold text-bg"
        >
          Saltar
        </button>
      </div>
    </div>
  )
}
