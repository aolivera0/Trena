import { newId } from './ids'
import { defaultLoad, defaultReps, suggestWeight, type Suggestion } from './strength/prescription'
import type { Day, ExerciseRef, ProgramExercise, SetGroup } from './types'

export function newSetGroup(kind: SetGroup['kind']): SetGroup {
  return kind === 'warmup'
    ? { id: newId(), kind, count: 1, reps: { type: 'fixed', n: 5 }, load: defaultLoad('pct1rm'), restSec: 60 }
    : { id: newId(), kind, count: 3, reps: defaultReps('fixed'), load: defaultLoad('rpe'), restSec: 180 }
}

export function newProgramExercise(exercise: ExerciseRef): ProgramExercise {
  return { id: newId(), exercise, coachNotes: '', setGroups: [newSetGroup('working')] }
}

export function newDay(index: number): Day {
  return { id: newId(), name: `Día ${index}`, notes: '', exercises: [] }
}

export function move<T>(list: T[], from: number, to: number): T[] {
  if (to < 0 || to >= list.length) return list
  const next = [...list]
  const [item] = next.splice(from, 1)
  next.splice(to, 0, item)
  return next
}

export type AthleteContext = {
  rmKg: number | null
  bodyweightKg: number
}

// Sugerencia para un grupo de series de la plantilla. Para "% top set" se usa
// la carga planificada del grupo de referencia (en la sesión será la real).
export function groupSuggestion(
  group: SetGroup,
  exercise: ProgramExercise,
  ctx: AthleteContext,
  depth = 0,
): Suggestion {
  const addsBodyweight = exercise.exercise.addsBodyweight
  let topSetLoadKg: number | null = null
  if (group.load.type === 'pctTopSet') {
    const refId = group.load.refSetGroupId
    const ref = exercise.setGroups.find((g) => g.id === refId)
    if (!ref || depth > 3) return { kind: 'missing', reason: 'Elige el top set de referencia' }
    const refSuggestion = groupSuggestion(ref, exercise, ctx, depth + 1)
    if (refSuggestion.kind === 'missing') return refSuggestion
    topSetLoadKg = refSuggestion.kg + (addsBodyweight ? ctx.bodyweightKg : 0)
  }
  return suggestWeight(group.load, group.reps, {
    rmKg: ctx.rmKg,
    addsBodyweight,
    bodyweightKg: ctx.bodyweightKg,
    topSetLoadKg,
  })
}
