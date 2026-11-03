import {
  collection,
  deleteDoc,
  deleteField,
  doc,
  getDocs,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
} from 'firebase/firestore'
import { rmHistoryCol, rmsCol } from './db'
import { track } from './feedback'
import { db } from './firebase'
import { newId } from './ids'
import { newEntry, type EntryWithId, type FinishResult } from './session'
import type { ExerciseRef, Session, SessionEntry, SessionSet } from './types'

export const sessionsCol = (athleteId: string) => collection(db, 'users', athleteId, 'sessions')
export const sessionRef = (athleteId: string, sessionId: string) => doc(db, 'users', athleteId, 'sessions', sessionId)
export const entriesCol = (athleteId: string, sessionId: string) =>
  collection(db, 'users', athleteId, 'sessions', sessionId, 'entries')
export const entryRef = (athleteId: string, sessionId: string, entryId: string) =>
  doc(db, 'users', athleteId, 'sessions', sessionId, 'entries', entryId)
export const exerciseStatsCol = (athleteId: string) => collection(db, 'users', athleteId, 'exerciseStats')

// Todas las funciones devuelven al instante: Firestore aplica el cambio en la
// caché local (funciona sin conexión) y lo sube en segundo plano.

export function startSession(
  athleteId: string,
  createdBy: string,
  data: Pick<Session, 'name' | 'source' | 'bodyweightKg'>,
  entries: EntryWithId[],
): string {
  const ref = doc(sessionsCol(athleteId))
  const batch = writeBatch(db)
  const session: Session = {
    ...data,
    status: 'IN_PROGRESS',
    startedAt: Date.now(),
    finishedAt: null,
    restTimer: null,
    summary: null,
    createdBy,
  }
  batch.set(ref, session)
  for (const { id, ...entry } of entries) batch.set(entryRef(athleteId, ref.id, id), entry)
  track(batch.commit(), 'No se pudo iniciar la sesión')
  return ref.id
}

export function updateSession(athleteId: string, sessionId: string, patch: Partial<Session>) {
  track(updateDoc(sessionRef(athleteId, sessionId), patch))
}

export function addEntry(athleteId: string, sessionId: string, exercise: ExerciseRef, order: number) {
  track(setDoc(entryRef(athleteId, sessionId, newId()), newEntry(exercise, order)))
}

// patch con field paths: { 'sets.<id>.weightKg': 100, athleteNotes: '…' }
export function updateEntry(athleteId: string, sessionId: string, entryId: string, patch: Record<string, unknown>) {
  track(updateDoc(entryRef(athleteId, sessionId, entryId), patch))
}

export function addSet(athleteId: string, sessionId: string, entryId: string, set: SessionSet) {
  updateEntry(athleteId, sessionId, entryId, { [`sets.${newId()}`]: set })
}

export function removeSet(athleteId: string, sessionId: string, entryId: string, setId: string) {
  updateEntry(athleteId, sessionId, entryId, { [`sets.${setId}`]: deleteField() })
}

export function removeEntry(athleteId: string, sessionId: string, entryId: string) {
  track(deleteDoc(entryRef(athleteId, sessionId, entryId)))
}

export async function discardSession(athleteId: string, sessionId: string) {
  const entries = await getDocs(entriesCol(athleteId, sessionId))
  const batch = writeBatch(db)
  entries.forEach((e) => batch.delete(e.ref))
  batch.delete(sessionRef(athleteId, sessionId))
  track(batch.commit(), 'No se pudo descartar la sesión')
}

// Cierra la sesión y guarda en un solo batch: resumen, estadísticas por
// ejercicio (para "Anterior" y futuros PRs) y RMs nuevos.
export function finishSession(
  athleteId: string,
  sessionId: string,
  finishedAt: number,
  result: FinishResult,
  entries: (SessionEntry & { id: string })[],
) {
  const batch = writeBatch(db)
  batch.update(sessionRef(athleteId, sessionId), {
    status: 'FINISHED',
    finishedAt,
    restTimer: null,
    summary: result.summary,
  })
  for (const [exerciseId, stats] of result.stats) {
    batch.set(doc(exerciseStatsCol(athleteId), exerciseId), stats)
  }
  for (const rm of result.summary.rmUpdates) {
    const exercise = entries.find((e) => e.exercise.id === rm.exerciseId)!.exercise
    batch.set(doc(rmsCol(athleteId), rm.exerciseId), {
      e1rmKg: rm.e1rmKg,
      exercise,
      source: 'pr',
      sessionId,
      updatedAt: serverTimestamp(),
    })
    batch.set(doc(rmHistoryCol(athleteId)), {
      exerciseId: rm.exerciseId,
      e1rmKg: rm.e1rmKg,
      source: 'pr',
      sessionId,
      date: serverTimestamp(),
    })
  }
  track(batch.commit(), 'No se pudo guardar el resumen')
}
