import type { Timestamp } from 'firebase/firestore'
import type { E1rmFormula } from './strength/e1rm'
import type { Load, Reps } from './strength/prescription'
import type { RoundingKg, Unit } from './strength/units'

export type Prefs = {
  unit: Unit
  roundingKg: RoundingKg
  e1rmFormula: E1rmFormula
  autoRest?: boolean // iniciar el descanso al marcar una serie (por defecto no)
}

export type UserProfile = {
  displayName: string
  email: string
  photoURL: string | null
  roles: { coach: boolean; athlete: boolean }
  coachId: string | null
  coachName: string | null
  inviteToken: string | null
  prefs: Prefs
  bodyweightKg: number | null // último registro, para ejercicios con lastre
  createdAt: Timestamp
}

export type WithId<T> = T & { id: string }

export type Invite = {
  coachId: string
  coachName: string
  createdAt: Timestamp
  expiresAt: Timestamp
  usedBy: string | null
  usedAt: Timestamp | null
}

// Ejercicio creado por un usuario (los del catálogo viven en src/data/catalog.json)
export type CustomExercise = {
  name: string
  variant: string | null
  slug: string | null // imagen de workout-guide, si se basa en uno del catálogo
  addsBodyweight: boolean
  ownerId: string
  createdAt: Timestamp
}

// Copia de los datos del ejercicio guardada donde se usa, para no tener que
// buscarlo al mostrar programas y sesiones (también sin conexión).
export type ExerciseRef = {
  id: string // 'wg:<slug>' para el catálogo, 'c:<docId>' para propios
  name: string
  variant: string | null
  slug: string | null
  addsBodyweight: boolean
}

export type RM = {
  e1rmKg: number // carga total (incluye peso corporal si addsBodyweight)
  exercise: ExerciseRef
  source: 'initial' | 'manual' | 'pr'
  sessionId: string | null
  updatedAt: Timestamp
}

export type Program = {
  name: string
  ownerId: string
  createdAt: Timestamp
}

export type WeekStatus = 'DRAFT' | 'PUBLISHED'

export type SetGroup = {
  id: string
  kind: 'warmup' | 'working'
  count: number
  reps: Reps
  load: Load
  restSec: number
}

export type ProgramExercise = {
  id: string
  exercise: ExerciseRef
  coachNotes: string
  setGroups: SetGroup[]
}

export type Day = {
  id: string
  name: string
  notes: string
  exercises: ProgramExercise[]
}

export type Week = {
  index: number
  name: string
  status: WeekStatus
  publishedAt: Timestamp | null
  days: Day[]
  updatedAt: Timestamp
}

// ---------- Sesiones ----------
// Los tiempos de sesión son milisegundos del reloj del cliente (no serverTimestamp)
// para que el cronómetro y el descanso funcionen al instante sin conexión.

export type SetPrescription = {
  groupId: string
  reps: Reps
  load: Load
}

export type SessionSet = {
  order: number
  kind: 'warmup' | 'working'
  prescription: SetPrescription | null
  restSec: number
  weightKg: number | null // lastre en ejercicios con peso corporal
  reps: number | null
  rpe: number | null
  done: boolean
  completedAt: number | null
}

export type SessionEntry = {
  exercise: ExerciseRef
  order: number
  coachNotes: string
  athleteNotes: string
  sets: Record<string, SessionSet>
}

export type PrType = 'weight' | 'volume' | 'e1rm'

export type SessionPr = {
  exerciseId: string
  exerciseName: string
  type: PrType
  valueKg: number
  previousKg: number | null
  reps: number
}

export type SessionSummary = {
  tonnageKg: number
  durationSec: number
  setsDone: number
  prs: SessionPr[]
  rmUpdates: { exerciseId: string; exerciseName: string; e1rmKg: number; previousKg: number | null }[]
}

export type Session = {
  name: string
  status: 'IN_PROGRESS' | 'FINISHED'
  source: {
    programId: string
    weekId: string
    dayId: string
    label: string // "Bloque fuerza · Semana 1 · Día 1"
  } | null
  startedAt: number
  finishedAt: number | null
  bodyweightKg: number
  restTimer: { endsAt: number; durationSec: number } | null
  summary: SessionSummary | null
  createdBy: string
}

export type ExerciseStats = {
  exercise: ExerciseRef
  lastSets: { kind: SessionSet['kind']; weightKg: number; reps: number; rpe: number | null }[]
  lastSessionId: string
  lastDate: number
  bestWeightKg: number // carga total
  bestSetVolumeKg: number
  bestE1rmKg: number
  timesDone?: number // sesiones en las que se hizo; falta en datos previos al contador
}

// Una ejecución de un ejercicio en una sesión terminada (historial por ejercicio, R-4)
export type ExerciseLog = {
  exerciseId: string
  exercise: ExerciseRef
  sessionId: string
  sessionName: string
  date: number
  sets: { kind: SessionSet['kind']; weightKg: number; loadKg: number; reps: number; rpe: number | null; e1rmKg: number | null }[]
  bestE1rmKg: number | null
  tonnageKg: number
}
