import { ChevronLeft, Plus, Timer } from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router'
import { useProfile } from '../auth/AuthProvider'
import { ExercisePicker } from '../components/ExercisePicker'
import { ExerciseModal } from '../components/exercise/ExerciseTabs'
import { EntryCard } from '../components/session/EntryCard'
import { RestTimer } from '../components/session/RestTimer'
import { SessionSummaryView } from '../components/session/SessionSummaryView'
import { Button, FullScreenSpinner, Sheet, WeightInput } from '../components/ui'
import { useAthlete } from '../hooks/useAthlete'
import { useExerciseStats } from '../hooks/useExerciseStats'
import { useDoc, useQuery } from '../hooks/useFirestore'
import { formatClock, useNow } from '../hooks/useNow'
import { computeFinish, sortedSets } from '../lib/session'
import {
  addEntry,
  discardSession,
  entriesCol,
  finishSession,
  sessionRef,
  updateSession,
} from '../lib/sessionDb'
import { unlockAudio } from '../lib/sound'
import type { ExerciseRef, Session, SessionEntry } from '../lib/types'

const DEFAULT_REST_SEC = 120
const REST_PRESETS = [60, 90, 120, 180, 240, 300]
const LONG_PRESS_MS = 450

export function SessionPage() {
  const { athleteId = '', sessionId = '' } = useParams()
  const { profile } = useProfile()
  const navigate = useNavigate()
  const { athlete, rmById, isSelf, isCoach, loading: athleteLoading } = useAthlete(athleteId)

  const sRef = useMemo(() => sessionRef(athleteId, sessionId), [athleteId, sessionId])
  const { data: session, loading: sessionLoading } = useDoc<Session>(sRef)
  const eQuery = useMemo(() => entriesCol(athleteId, sessionId), [athleteId, sessionId])
  const { data: rawEntries } = useQuery<SessionEntry>(eQuery, `entries:${athleteId}/${sessionId}`)
  const { data: statsList } = useExerciseStats(athleteId)

  const [picking, setPicking] = useState(false)
  const [confirmFinish, setConfirmFinish] = useState(false)
  const [choosingRest, setChoosingRest] = useState(false)
  const [openExercise, setOpenExercise] = useState<ExerciseRef | null>(null)
  const inProgress = session?.status === 'IN_PROGRESS'
  const now = useNow(1000, inProgress)

  if (athleteLoading || sessionLoading) return <FullScreenSpinner />
  if (!session || !athlete || (!isSelf && !isCoach)) return <Navigate to="/" replace />

  const backTo = isSelf ? '/' : `/athlete/${athleteId}`
  const entries = [...rawEntries].sort((a, b) => a.order - b.order)
  if (session.status === 'FINISHED' && session.summary) {
    return <SessionSummaryView session={session} summary={session.summary} entries={entries} backTo={backTo} />
  }

  const statsById = new Map(statsList.map((s) => [s.id, s]))
  const usesBodyweight = entries.some((e) => e.exercise.addsBodyweight)
  const pendingSets = entries.reduce((n, e) => n + sortedSets(e).filter(([, s]) => !s.done).length, 0)

  // Descanso sugerido: el de la última serie completada (o 2:00)
  const lastDone = entries
    .flatMap((e) => Object.values(e.sets))
    .filter((s) => s.done && s.completedAt != null)
    .sort((a, b) => b.completedAt! - a.completedAt!)[0]
  const suggestedRest = lastDone?.restSec || DEFAULT_REST_SEC

  function startRest(restSec: number) {
    if (restSec > 0) updateSession(athleteId, sessionId, { restTimer: { endsAt: Date.now() + restSec * 1000, durationSec: restSec } })
  }

  // Por defecto el descanso se inicia a mano; en Ajustes se puede automatizar
  function onSetDone(restSec: number) {
    if (profile.prefs.autoRest) startRest(restSec)
  }

  function finish() {
    if (!athlete) return
    const finishedAt = Date.now()
    const result = computeFinish(
      entries,
      statsById,
      new Map([...rmById].map(([id, rm]) => [id, rm.e1rmKg])),
      {
        bodyweightKg: session!.bodyweightKg,
        formula: athlete.prefs.e1rmFormula,
        startedAt: session!.startedAt,
        finishedAt,
        sessionId,
        sessionName: session!.name,
      },
    )
    finishSession(athleteId, sessionId, finishedAt, result, entries)
    setConfirmFinish(false)
  }

  function discard() {
    if (!confirm('¿Descartar este entrenamiento? Se borra todo lo registrado.')) return
    void discardSession(athleteId, sessionId)
    navigate(backTo, { replace: true })
  }

  return (
    <div className="space-y-4">
      <div className="sticky top-[calc(3.25rem+env(safe-area-inset-top))] z-10 -mx-4 -mt-5 flex items-center gap-2 border-b border-border bg-bg/95 px-4 py-2 backdrop-blur">
        <Link to={backTo} aria-label="Volver" className="-ml-2 flex size-9 items-center justify-center rounded-lg text-muted hover:text-text">
          <ChevronLeft size={22} />
        </Link>
        <span className="flex-1 text-center text-lg font-semibold tabular">{formatClock((now - session.startedAt) / 1000)}</span>
        {!session.restTimer && (
          <RestButton seconds={suggestedRest} onStart={startRest} onChoose={() => setChoosingRest(true)} />
        )}
        <Button size="sm" variant="primary" onClick={() => setConfirmFinish(true)}>
          Finalizar
        </Button>
      </div>

      <div>
        <input
          defaultValue={session.name}
          onBlur={(e) => e.target.value.trim() && e.target.value !== session.name && updateSession(athleteId, sessionId, { name: e.target.value.trim() })}
          aria-label="Nombre del entrenamiento"
          className="w-full bg-transparent text-2xl font-bold focus:outline-none"
        />
        {session.source && <p className="text-sm text-muted">{session.source.label}</p>}
        {!isSelf && <p className="text-sm text-accent">Sesión de {athlete.displayName} · en vivo</p>}
      </div>

      {usesBodyweight && (
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted">Peso corporal hoy</span>
          <div className="w-32">
            <WeightInput
              valueKg={session.bodyweightKg}
              onChangeKg={(kg) => kg && kg > 0 && updateSession(athleteId, sessionId, { bodyweightKg: kg })}
              unit={profile.prefs.unit}
              className="!h-9"
            />
          </div>
        </div>
      )}

      {entries.map((entry) => (
        <EntryCard
          key={entry.id}
          athleteId={athleteId}
          sessionId={sessionId}
          entry={entry}
          rmKg={rmById.get(entry.exercise.id)?.e1rmKg ?? null}
          bodyweightKg={session.bodyweightKg}
          stats={statsById.get(entry.exercise.id)}
          onSetDone={onSetDone}
          onOpenExercise={() => setOpenExercise(entry.exercise)}
        />
      ))}

      <Button className="w-full" onClick={() => setPicking(true)}>
        <Plus size={16} /> Agregar ejercicio
      </Button>
      <Button variant="ghost" className="w-full text-danger" onClick={discard}>
        Descartar entrenamiento
      </Button>

      {session.restTimer && <RestTimer athleteId={athleteId} sessionId={sessionId} timer={session.restTimer} />}

      <ExercisePicker
        athleteId={athleteId}
        open={picking}
        onClose={() => setPicking(false)}
        onPick={(ex) => addEntry(athleteId, sessionId, ex, (entries.at(-1)?.order ?? -1) + 1)}
      />

      <ExerciseModal
        onClose={() => setOpenExercise(null)}
        ctx={
          openExercise && {
            athleteId,
            exercise: openExercise,
            bodyweightKg: session.bodyweightKg,
            formula: athlete.prefs.e1rmFormula,
            rm: rmById.get(openExercise.id),
            stats: statsById.get(openExercise.id),
            athleteCoachId: athlete.coachId,
            excludeSessionId: sessionId,
          }
        }
      />

      <Sheet open={choosingRest} onClose={() => setChoosingRest(false)} title="Iniciar descanso">
        <div className="grid grid-cols-3 gap-2">
          {REST_PRESETS.map((sec) => (
            <Button
              key={sec}
              variant={sec === suggestedRest ? 'primary' : 'secondary'}
              onClick={() => {
                unlockAudio()
                startRest(sec)
                setChoosingRest(false)
              }}
            >
              {formatClock(sec)}
            </Button>
          ))}
        </div>
      </Sheet>

      <Sheet open={confirmFinish} onClose={() => setConfirmFinish(false)} title="Finalizar entrenamiento">
        <div className="space-y-4">
          <p className="text-sm text-muted">
            {pendingSets > 0
              ? `Hay ${pendingSets} ${pendingSets === 1 ? 'serie sin marcar' : 'series sin marcar'}: no contarán en el resumen.`
              : 'Se calcularán el tonelaje, la duración y tus PRs.'}
          </p>
          <Button variant="primary" className="w-full" onClick={finish}>
            Finalizar
          </Button>
        </div>
      </Sheet>
    </div>
  )
}

// Toque: inicia el descanso sugerido. Mantener pulsado: elegir duración.
function RestButton({ seconds, onStart, onChoose }: { seconds: number; onStart: (sec: number) => void; onChoose: () => void }) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const longPressed = useRef(false)

  function down() {
    longPressed.current = false
    timer.current = setTimeout(() => {
      longPressed.current = true
      onChoose()
    }, LONG_PRESS_MS)
  }

  function up() {
    if (timer.current) clearTimeout(timer.current)
    timer.current = null
  }

  return (
    <button
      type="button"
      onPointerDown={down}
      onPointerUp={up}
      onPointerLeave={up}
      onContextMenu={(e) => e.preventDefault()}
      onClick={() => {
        if (longPressed.current) return
        unlockAudio()
        onStart(seconds)
      }}
      aria-label={`Iniciar descanso de ${formatClock(seconds)} (mantén pulsado para elegir)`}
      className="flex h-8 select-none items-center gap-1.5 rounded-lg bg-surface-2 px-2.5 text-sm text-text hover:bg-border"
    >
      <Timer size={16} className="text-accent" />
      <span className="tabular">{formatClock(seconds)}</span>
    </button>
  )
}
