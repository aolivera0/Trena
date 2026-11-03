// Lógica pura de la sesión en vivo (sin Firebase): expandir la plantilla,
// sugerencias con el top set real y el cálculo al finalizar (R-3).
import { newId } from './ids'
import { setE1rm, totalLoad, type E1rmFormula } from './strength/e1rm'
import { suggestWeight, type Load, type Reps, type Suggestion } from './strength/prescription'
import { rirToRpe } from './strength/rpe'
import type {
  Day,
  ExerciseRef,
  ExerciseLog,
  ExerciseStats,
  PrType,
  SessionEntry,
  SessionPr,
  SessionSet,
  SessionSummary,
} from './types'

export type EntryWithId = SessionEntry & { id: string }

// ---------- Crear ----------

export function emptySet(kind: SessionSet['kind'], order: number, restSec = 120): SessionSet {
  return { order, kind, prescription: null, restSec, weightKg: null, reps: null, rpe: null, done: false, completedAt: null }
}

export function newEntry(exercise: ExerciseRef, order: number): SessionEntry {
  return {
    exercise,
    order,
    coachNotes: '',
    athleteNotes: '',
    sets: { [newId()]: emptySet('working', 0) },
  }
}

// Convierte un día de la plantilla en entradas de sesión: cada grupo "4×4"
// se expande en 4 series individuales que recuerdan su prescripción.
export function expandDay(day: Day): EntryWithId[] {
  return day.exercises.map((ex, order) => {
    const sets: Record<string, SessionSet> = {}
    let i = 0
    for (const g of ex.setGroups) {
      for (let n = 0; n < Math.max(1, g.count); n++) {
        sets[newId()] = {
          ...emptySet(g.kind, i++, g.restSec),
          prescription: { groupId: g.id, reps: g.reps, load: g.load },
        }
      }
    }
    return { id: newId(), exercise: ex.exercise, order, coachNotes: ex.coachNotes, athleteNotes: '', sets }
  })
}

// ---------- Mostrar ----------

export function sortedSets(entry: SessionEntry): [string, SessionSet][] {
  return Object.entries(entry.sets).sort(([, a], [, b]) => a.order - b.order)
}

export function nextOrder(entry: SessionEntry): number {
  return Math.max(-1, ...Object.values(entry.sets).map((s) => s.order)) + 1
}

// Placeholder de reps: "5", "8-10", "máx"
export function targetRepsLabel(reps: Reps | undefined): string {
  if (!reps) return ''
  switch (reps.type) {
    case 'fixed':
      return String(reps.n)
    case 'range':
      return `${reps.min}-${reps.max}`
    case 'amrap':
      return 'máx'
    case 'emom':
      return String(reps.repsPerMin * reps.minutes)
    case 'cluster':
      return String(reps.repsPerBlock * reps.blocks)
  }
}

// Reps que se registran si el atleta marca la serie sin escribir nada
export function defaultRepsFor(reps: Reps | undefined): number | null {
  if (!reps) return null
  switch (reps.type) {
    case 'fixed':
      return reps.n
    case 'range':
      return reps.max
    case 'amrap':
      return null
    case 'emom':
      return reps.repsPerMin * reps.minutes
    case 'cluster':
      return reps.repsPerBlock * reps.blocks
  }
}

export function targetRpe(load: Load | undefined): number | null {
  if (!load) return null
  if (load.type === 'rpe') return load.value
  if (load.type === 'rir') return rirToRpe(load.value)
  return null
}

export type LiveContext = {
  rmKg: number | null
  bodyweightKg: number
  addsBodyweight: boolean
}

// Carga total más alta registrada hoy en las series de un grupo (el top set real)
export function actualGroupLoad(entry: SessionEntry, groupId: string, ctx: LiveContext): number | null {
  const loads = Object.values(entry.sets)
    .filter((s) => s.done && s.prescription?.groupId === groupId && s.weightKg != null)
    .map((s) => totalLoad(s.weightKg!, ctx.addsBodyweight, ctx.bodyweightKg))
  return loads.length ? Math.max(...loads) : null
}

// Sugerencia de una serie de la sesión. "% top set" usa el top set real de hoy
// si ya se hizo; si no, la carga planificada del top set.
export function liveSuggestion(set: SessionSet, entry: SessionEntry, ctx: LiveContext, depth = 0): Suggestion | null {
  const p = set.prescription
  if (!p) return null
  let topSetLoadKg: number | null = null
  if (p.load.type === 'pctTopSet') {
    const refId = p.load.refSetGroupId
    topSetLoadKg = actualGroupLoad(entry, refId, ctx)
    if (topSetLoadKg == null) {
      const ref = Object.values(entry.sets).find((s) => s.prescription?.groupId === refId)
      const planned = ref && depth < 3 ? liveSuggestion(ref, entry, ctx, depth + 1) : null
      if (!planned || planned.kind === 'missing') return { kind: 'missing', reason: 'Haz primero el top set' }
      topSetLoadKg = planned.kg + (ctx.addsBodyweight ? ctx.bodyweightKg : 0)
    }
  }
  return suggestWeight(p.load, p.reps, { ...ctx, topSetLoadKg })
}

// ---------- Finalizar (R-3) ----------

type DoneSet = { kind: SessionSet['kind']; weightKg: number; load: number; reps: number; rpe: number | null }

function doneSets(entry: SessionEntry, bodyweightKg: number): DoneSet[] {
  return sortedSets(entry)
    .map(([, s]) => s)
    .filter((s) => s.done && s.weightKg != null && s.reps != null && s.reps > 0)
    .map((s) => ({
      kind: s.kind,
      weightKg: s.weightKg!,
      load: totalLoad(s.weightKg!, entry.exercise.addsBodyweight, bodyweightKg),
      reps: s.reps!,
      rpe: s.rpe,
    }))
}

export type FinishResult = {
  summary: SessionSummary
  stats: Map<string, ExerciseStats>
  logs: ExerciseLog[]
}

export function computeFinish(
  entries: SessionEntry[],
  prevStats: Map<string, ExerciseStats>,
  rmKgById: Map<string, number>,
  opts: {
    bodyweightKg: number
    formula: E1rmFormula
    startedAt: number
    finishedAt: number
    sessionId: string
    sessionName: string
  },
): FinishResult {
  let tonnageKg = 0
  let setsDone = 0
  const prs: SessionPr[] = []
  const rmUpdates: SessionSummary['rmUpdates'] = []
  const stats = new Map<string, ExerciseStats>()
  const logs: ExerciseLog[] = []

  // Un mismo ejercicio puede aparecer en varias entradas: se agrupan
  const byExercise = new Map<string, { exercise: ExerciseRef; sets: DoneSet[] }>()
  for (const entry of [...entries].sort((a, b) => a.order - b.order)) {
    const sets = doneSets(entry, opts.bodyweightKg)
    if (!sets.length) continue
    const group = byExercise.get(entry.exercise.id) ?? { exercise: entry.exercise, sets: [] }
    group.sets.push(...sets)
    byExercise.set(entry.exercise.id, group)
  }

  for (const [exerciseId, { exercise, sets }] of byExercise) {
    setsDone += sets.length
    const exerciseTonnage = sets.reduce((sum, s) => sum + s.load * s.reps, 0)
    tonnageKg += exerciseTonnage

    const best = (fn: (s: DoneSet) => number | null) =>
      sets.reduce<{ value: number; set: DoneSet } | null>((acc, s) => {
        const v = fn(s)
        return v != null && (!acc || v > acc.value) ? { value: v, set: s } : acc
      }, null)

    const bestWeight = best((s) => s.load)!
    const bestVolume = best((s) => s.load * s.reps)!
    const bestE1rm = best((s) => setE1rm({ load: s.load, reps: s.reps, rpe: s.rpe }, opts.formula))
    const prev = prevStats.get(exerciseId)
    const rmKg = rmKgById.get(exerciseId) ?? null
    const name = exercise.variant ? `${exercise.name} · ${exercise.variant}` : exercise.name

    // Solo hay PR si existe algo con qué comparar (historial o RM)
    const pr = (type: PrType, value: number, previous: number | null, reps: number) => {
      if (previous != null && value > previous + 1e-9) {
        prs.push({ exerciseId, exerciseName: name, type, valueKg: value, previousKg: previous, reps })
      }
    }
    pr('weight', bestWeight.value, prev?.bestWeightKg ?? null, bestWeight.set.reps)
    pr('volume', bestVolume.value, prev?.bestSetVolumeKg ?? null, bestVolume.set.reps)
    if (bestE1rm) {
      const previousE1rm = prev ? Math.max(prev.bestE1rmKg, rmKg ?? 0) : rmKg
      pr('e1rm', bestE1rm.value, previousE1rm, bestE1rm.set.reps)
      // El RM vigente sube solo con PR de e1RM (o se crea si no existía)
      if (rmKg == null || bestE1rm.value > rmKg + 1e-9) {
        rmUpdates.push({ exerciseId, exerciseName: name, e1rmKg: bestE1rm.value, previousKg: rmKg })
      }
    }

    logs.push({
      exerciseId,
      exercise,
      sessionId: opts.sessionId,
      sessionName: opts.sessionName,
      date: opts.finishedAt,
      sets: sets.map((s) => ({
        kind: s.kind,
        weightKg: s.weightKg,
        loadKg: s.load,
        reps: s.reps,
        rpe: s.rpe,
        e1rmKg: setE1rm({ load: s.load, reps: s.reps, rpe: s.rpe }, opts.formula),
      })),
      bestE1rmKg: bestE1rm?.value ?? null,
      tonnageKg: exerciseTonnage,
    })

    stats.set(exerciseId, {
      exercise,
      lastSets: sets.map((s) => ({ kind: s.kind, weightKg: s.weightKg, reps: s.reps, rpe: s.rpe })),
      lastSessionId: opts.sessionId,
      lastDate: opts.finishedAt,
      bestWeightKg: Math.max(prev?.bestWeightKg ?? 0, bestWeight.value),
      bestSetVolumeKg: Math.max(prev?.bestSetVolumeKg ?? 0, bestVolume.value),
      bestE1rmKg: Math.max(prev?.bestE1rmKg ?? 0, bestE1rm?.value ?? 0),
    })
  }

  return {
    summary: {
      tonnageKg,
      durationSec: Math.max(0, Math.round((opts.finishedAt - opts.startedAt) / 1000)),
      setsDone,
      prs,
      rmUpdates,
    },
    stats,
    logs,
  }
}
