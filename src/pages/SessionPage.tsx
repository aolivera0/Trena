import { ChevronLeft, Plus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router'
import { useProfile } from '../auth/AuthProvider'
import { ExercisePicker } from '../components/ExercisePicker'
import { EntryCard } from '../components/session/EntryCard'
import { RestTimer } from '../components/session/RestTimer'
import { SessionSummaryView } from '../components/session/SessionSummaryView'
import { Button, FullScreenSpinner, Sheet, WeightInput } from '../components/ui'
import { useAthlete } from '../hooks/useAthlete'
import { useDoc, useQuery } from '../hooks/useFirestore'
import { formatClock, useNow } from '../hooks/useNow'
import { computeFinish, sortedSets } from '../lib/session'
import {
  addEntry,
  discardSession,
  entriesCol,
  exerciseStatsCol,
  finishSession,
  sessionRef,
  updateSession,
} from '../lib/sessionDb'
import type { ExerciseStats, Session, SessionEntry } from '../lib/types'

export function SessionPage() {
  const { athleteId = '', sessionId = '' } = useParams()
  const { profile } = useProfile()
  const navigate = useNavigate()
  const { athlete, rmById, isSelf, isCoach, loading: athleteLoading } = useAthlete(athleteId)

  const sRef = useMemo(() => sessionRef(athleteId, sessionId), [athleteId, sessionId])
  const { data: session, loading: sessionLoading } = useDoc<Session>(sRef)
  const eQuery = useMemo(() => entriesCol(athleteId, sessionId), [athleteId, sessionId])
  const { data: rawEntries } = useQuery<SessionEntry>(eQuery, `entries:${athleteId}/${sessionId}`)
  const statsQuery = useMemo(() => exerciseStatsCol(athleteId), [athleteId])
  const { data: statsList } = useQuery<ExerciseStats>(statsQuery, `stats:${athleteId}`)

  const [picking, setPicking] = useState(false)
  const [confirmFinish, setConfirmFinish] = useState(false)
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

  function startRest(restSec: number) {
    if (restSec > 0) updateSession(athleteId, sessionId, { restTimer: { endsAt: Date.now() + restSec * 1000, durationSec: restSec } })
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
          onSetDone={startRest}
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
        open={picking}
        onClose={() => setPicking(false)}
        onPick={(ex) => addEntry(athleteId, sessionId, ex, (entries.at(-1)?.order ?? -1) + 1)}
      />

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
