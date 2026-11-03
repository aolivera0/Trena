import type { Timestamp } from 'firebase/firestore'
import type { E1rmFormula } from './strength/e1rm'
import type { Load, Reps } from './strength/prescription'
import type { RoundingKg, Unit } from './strength/units'

export type Prefs = {
  unit: Unit
  roundingKg: RoundingKg
  e1rmFormula: E1rmFormula
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
