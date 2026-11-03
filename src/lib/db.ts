import type { User } from 'firebase/auth'
import {
  Timestamp,
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  serverTimestamp,
  setDoc,
  updateDoc,
  writeBatch,
} from 'firebase/firestore'
import { track } from './feedback'
import { db } from './firebase'
import type { CustomExercise, Day, Invite, ExerciseRef, Prefs, Program, UserProfile, Week } from './types'

// ---------- Rutas ----------

export const userRef = (uid: string) => doc(db, 'users', uid)
export const usersCol = () => collection(db, 'users')
export const invitesCol = () => collection(db, 'invites')
export const inviteRef = (token: string) => doc(db, 'invites', token)
export const exercisesCol = () => collection(db, 'exercises')
export const rmsCol = (uid: string) => collection(db, 'users', uid, 'rms')
export const rmHistoryCol = (uid: string) => collection(db, 'users', uid, 'rmHistory')
export const bodyweightCol = (uid: string) => collection(db, 'users', uid, 'bodyweight')
export const programsCol = (athleteId: string) => collection(db, 'users', athleteId, 'programs')
export const programRef = (athleteId: string, programId: string) =>
  doc(db, 'users', athleteId, 'programs', programId)
export const weeksCol = (athleteId: string, programId: string) =>
  collection(db, 'users', athleteId, 'programs', programId, 'weeks')
export const weekRef = (athleteId: string, programId: string, weekId: string) =>
  doc(db, 'users', athleteId, 'programs', programId, 'weeks', weekId)

export const newId = () => crypto.randomUUID()

// Fecha local YYYY-MM-DD (id de los registros de peso corporal)
export function localDateKey(date = new Date()): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

// ---------- Perfil ----------

export type OnboardingData = {
  roles: UserProfile['roles']
  prefs: Prefs
  bodyweightKg: number | null
  rms: { exercise: ExerciseRef; e1rmKg: number }[]
}

export async function createProfile(user: User, data: OnboardingData) {
  const batch = writeBatch(db)
  const profile: Omit<UserProfile, 'createdAt'> & { createdAt: unknown } = {
    displayName: user.displayName ?? user.email ?? 'Sin nombre',
    email: user.email ?? '',
    photoURL: user.photoURL,
    roles: data.roles,
    coachId: null,
    coachName: null,
    inviteToken: null,
    prefs: data.prefs,
    bodyweightKg: data.bodyweightKg,
    createdAt: serverTimestamp(),
  }
  batch.set(userRef(user.uid), profile)
  if (data.bodyweightKg != null) {
    batch.set(doc(bodyweightCol(user.uid), localDateKey()), { kg: data.bodyweightKg })
  }
  for (const rm of data.rms) {
    batch.set(doc(rmsCol(user.uid), rm.exercise.id), {
      e1rmKg: rm.e1rmKg,
      exercise: rm.exercise,
      source: 'initial',
      sessionId: null,
      updatedAt: serverTimestamp(),
    })
    batch.set(doc(rmHistoryCol(user.uid)), {
      exerciseId: rm.exercise.id,
      e1rmKg: rm.e1rmKg,
      source: 'initial',
      sessionId: null,
      date: serverTimestamp(),
    })
  }
  await batch.commit()
}

export function updateProfile(uid: string, data: Partial<Pick<UserProfile, 'roles' | 'prefs'>>) {
  return updateDoc(userRef(uid), data)
}

export async function setRm(uid: string, exercise: ExerciseRef, e1rmKg: number) {
  const batch = writeBatch(db)
  batch.set(doc(rmsCol(uid), exercise.id), {
    e1rmKg,
    exercise,
    source: 'manual',
    sessionId: null,
    updatedAt: serverTimestamp(),
  })
  batch.set(doc(rmHistoryCol(uid)), {
    exerciseId: exercise.id,
    e1rmKg,
    source: 'manual',
    sessionId: null,
    date: serverTimestamp(),
  })
  await batch.commit()
}

export async function logBodyweight(uid: string, kg: number, dateKey = localDateKey()) {
  const batch = writeBatch(db)
  batch.set(doc(bodyweightCol(uid), dateKey), { kg })
  batch.update(userRef(uid), { bodyweightKg: kg })
  await batch.commit()
}

// ---------- Invitaciones ----------

const INVITE_DAYS = 7

export async function createInvite(coachId: string, coachName: string): Promise<string> {
  const token = newId().replaceAll('-', '')
  await setDoc(inviteRef(token), {
    coachId,
    coachName,
    createdAt: serverTimestamp(),
    expiresAt: Timestamp.fromMillis(Date.now() + INVITE_DAYS * 24 * 3600 * 1000),
    usedBy: null,
    usedAt: null,
  })
  return token
}

export async function acceptInvite(uid: string, token: string, invite: Invite, roles: UserProfile['roles']) {
  const batch = writeBatch(db)
  batch.update(userRef(uid), {
    coachId: invite.coachId,
    coachName: invite.coachName,
    inviteToken: token,
    roles: { ...roles, athlete: true },
  })
  batch.update(inviteRef(token), { usedBy: uid, usedAt: serverTimestamp() })
  await batch.commit()
}

export function removeCoach(athleteId: string) {
  return updateDoc(userRef(athleteId), { coachId: null, coachName: null, inviteToken: null })
}

// ---------- Ejercicios propios ----------

// Devuelve el id al instante; la escritura se confirma en segundo plano.
export function createCustomExercise(
  ownerId: string,
  data: Pick<CustomExercise, 'name' | 'variant' | 'slug' | 'addsBodyweight'>,
): string {
  const ref = doc(exercisesCol())
  track(setDoc(ref, { ...data, ownerId, createdAt: serverTimestamp() }))
  return ref.id
}

// ---------- Programas ----------

export function createProgram(athleteId: string, ownerId: string, name: string): string {
  const ref = doc(programsCol(athleteId))
  const batch = writeBatch(db)
  batch.set(ref, { name, ownerId, createdAt: serverTimestamp() })
  batch.set(doc(weeksCol(athleteId, ref.id)), emptyWeek(1))
  track(batch.commit())
  return ref.id
}

export function renameProgram(athleteId: string, programId: string, name: string) {
  return updateDoc(programRef(athleteId, programId), { name })
}

export async function deleteProgram(athleteId: string, programId: string) {
  const weeks = await getDocs(weeksCol(athleteId, programId))
  const batch = writeBatch(db)
  weeks.forEach((w) => batch.delete(w.ref))
  batch.delete(programRef(athleteId, programId))
  await batch.commit()
}

function emptyWeek(index: number) {
  return {
    index,
    name: `Semana ${index}`,
    status: 'DRAFT',
    publishedAt: null,
    days: [{ id: newId(), name: 'Día 1', notes: '', exercises: [] }],
    updatedAt: serverTimestamp(),
  }
}

export function addWeek(athleteId: string, programId: string, index: number) {
  return addDoc(weeksCol(athleteId, programId), emptyWeek(index))
}

export function saveWeek(
  athleteId: string,
  programId: string,
  weekId: string,
  data: Partial<Pick<Week, 'name' | 'days'>>,
) {
  return updateDoc(weekRef(athleteId, programId, weekId), { ...data, updatedAt: serverTimestamp() })
}

export function setWeekStatus(athleteId: string, programId: string, weekId: string, published: boolean) {
  return updateDoc(weekRef(athleteId, programId, weekId), {
    status: published ? 'PUBLISHED' : 'DRAFT',
    publishedAt: published ? serverTimestamp() : null,
    updatedAt: serverTimestamp(),
  })
}

export function deleteWeek(athleteId: string, programId: string, weekId: string) {
  return deleteDoc(weekRef(athleteId, programId, weekId))
}

// Copia profunda con ids nuevos para que días/ejercicios/series no compartan ids.
// Las referencias de % top set se remapean al nuevo id del grupo.
export function cloneDays(days: Day[]): Day[] {
  return days.map((day) => ({
    ...day,
    id: newId(),
    exercises: day.exercises.map((ex) => {
      const idMap = new Map(ex.setGroups.map((g) => [g.id, newId()]))
      return {
        ...ex,
        id: newId(),
        setGroups: ex.setGroups.map((g) => ({
          ...g,
          id: idMap.get(g.id)!,
          load:
            g.load.type === 'pctTopSet'
              ? { ...g.load, refSetGroupId: idMap.get(g.load.refSetGroupId) ?? '' }
              : g.load,
        })),
      }
    }),
  }))
}

export function duplicateWeek(athleteId: string, programId: string, week: Week, index: number) {
  return addDoc(weeksCol(athleteId, programId), {
    index,
    name: `Semana ${index}`,
    status: 'DRAFT',
    publishedAt: null,
    days: cloneDays(week.days),
    updatedAt: serverTimestamp(),
  })
}

// Copia un programa (todas sus semanas en borrador) a otro atleta o al mismo.
export async function duplicateProgram(
  fromAthleteId: string,
  programId: string,
  program: Program,
  toAthleteId: string,
  ownerId: string,
): Promise<string> {
  const weeks = await getDocs(weeksCol(fromAthleteId, programId))
  const ref = doc(programsCol(toAthleteId))
  const batch = writeBatch(db)
  const name = fromAthleteId === toAthleteId ? `${program.name} (copia)` : program.name
  batch.set(ref, { name, ownerId, createdAt: serverTimestamp() })
  weeks.forEach((w) => {
    const week = w.data() as Week
    batch.set(doc(weeksCol(toAthleteId, ref.id)), {
      index: week.index,
      name: week.name,
      status: 'DRAFT',
      publishedAt: null,
      days: cloneDays(week.days),
      updatedAt: serverTimestamp(),
    })
  })
  track(batch.commit())
  return ref.id
}
