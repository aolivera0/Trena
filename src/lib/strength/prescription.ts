import { rirToRpe, rpePercent } from './rpe'

export type Load =
  | { type: 'fixed'; kg: number }
  | { type: 'pct1rm'; pct: number }
  | { type: 'pctTopSet'; pct: number; refSetGroupId: string }
  | { type: 'rpe'; value: number }
  | { type: 'rir'; value: number }

export type Reps =
  | { type: 'fixed'; n: number }
  | { type: 'range'; min: number; max: number }
  | { type: 'amrap' }
  | { type: 'emom'; minutes: number; repsPerMin: number }
  | { type: 'cluster'; repsPerBlock: number; blocks: number; intraRestSec: number }

export type LoadType = Load['type']
export type RepsType = Reps['type']

export const LOAD_LABELS: Record<LoadType, string> = {
  fixed: 'Kg fijos',
  pct1rm: '% 1RM',
  pctTopSet: '% top set',
  rpe: 'RPE',
  rir: 'RIR',
}

export const REPS_LABELS: Record<RepsType, string> = {
  fixed: 'Fijas',
  range: 'Rango',
  amrap: 'AMRAP',
  emom: 'EMOM',
  cluster: 'Clúster',
}

export function defaultLoad(type: LoadType, refSetGroupId = ''): Load {
  switch (type) {
    case 'fixed':
      return { type, kg: 0 }
    case 'pct1rm':
      return { type, pct: 75 }
    case 'pctTopSet':
      return { type, pct: 85, refSetGroupId }
    case 'rpe':
      return { type, value: 8 }
    case 'rir':
      return { type, value: 2 }
  }
}

export function defaultReps(type: RepsType): Reps {
  switch (type) {
    case 'fixed':
      return { type, n: 5 }
    case 'range':
      return { type, min: 8, max: 10 }
    case 'amrap':
      return { type }
    case 'emom':
      return { type, minutes: 10, repsPerMin: 3 }
    case 'cluster':
      return { type, repsPerBlock: 2, blocks: 3, intraRestSec: 15 }
  }
}

// Reps que se usan para calcular el peso con la tabla RPE.
// Rango → el mínimo; clúster → reps por bloque; AMRAP → no hay referencia.
export function referenceReps(reps: Reps): number | null {
  switch (reps.type) {
    case 'fixed':
      return reps.n
    case 'range':
      return reps.min
    case 'emom':
      return reps.repsPerMin
    case 'cluster':
      return reps.repsPerBlock
    case 'amrap':
      return null
  }
}

export type SuggestContext = {
  rmKg: number | null // RM vigente, carga total
  addsBodyweight: boolean
  bodyweightKg: number
  topSetLoadKg?: number | null // carga total real del top set de hoy
}

export type Suggestion =
  | { kind: 'kg'; kg: number; assisted: boolean } // kg = lastre/peso a cargar
  | { kind: 'missing'; reason: string }

// Peso a cargar para una serie prescrita, sin redondear. Para ejercicios con
// lastre, se calcula sobre la carga total y se resta el peso corporal.
export function suggestWeight(load: Load, reps: Reps, ctx: SuggestContext): Suggestion {
  if (load.type === 'fixed') return { kind: 'kg', kg: load.kg, assisted: false }

  let total: number
  if (load.type === 'pctTopSet') {
    if (ctx.topSetLoadKg == null) return { kind: 'missing', reason: 'Falta registrar el top set' }
    total = (load.pct / 100) * ctx.topSetLoadKg
  } else {
    if (ctx.rmKg == null) return { kind: 'missing', reason: 'Sin RM registrado' }
    if (load.type === 'pct1rm') {
      total = (load.pct / 100) * ctx.rmKg
    } else {
      const r = referenceReps(reps)
      if (r == null) return { kind: 'missing', reason: 'AMRAP sin reps de referencia' }
      const rpe = load.type === 'rpe' ? load.value : rirToRpe(load.value)
      const pct = rpePercent(r, rpe)
      if (pct == null) return { kind: 'missing', reason: 'Fuera de la tabla RPE' }
      total = pct * ctx.rmKg
    }
  }

  const kg = ctx.addsBodyweight ? total - ctx.bodyweightKg : total
  return kg < 0 ? { kind: 'kg', kg: 0, assisted: true } : { kind: 'kg', kg, assisted: false }
}

function trimNumber(n: number): string {
  return String(Number(n.toFixed(2)))
}

export function formatReps(reps: Reps): string {
  switch (reps.type) {
    case 'fixed':
      return trimNumber(reps.n)
    case 'range':
      return `${reps.min}–${reps.max}`
    case 'amrap':
      return 'AMRAP'
    case 'emom':
      return `EMOM ${reps.minutes}′ × ${reps.repsPerMin}`
    case 'cluster':
      return `${Array(reps.blocks).fill(reps.repsPerBlock).join('+')} (${reps.intraRestSec}s)`
  }
}

export function formatLoad(load: Load): string {
  switch (load.type) {
    case 'fixed':
      return `${trimNumber(load.kg)} kg`
    case 'pct1rm':
      return `${trimNumber(load.pct)}%`
    case 'pctTopSet':
      return `${trimNumber(load.pct)}% top set`
    case 'rpe':
      return `RPE ${trimNumber(load.value)}`
    case 'rir':
      return `RIR ${trimNumber(load.value)}`
  }
}

// "4×4 @ RPE 6", "1×1 @ 81%", "EMOM 10′ × 3 @ 70 kg"
export function formatPrescription(count: number, reps: Reps, load: Load): string {
  const r = formatReps(reps)
  const head = reps.type === 'emom' ? r : `${count}×${r}`
  return `${head} @ ${formatLoad(load)}`
}
