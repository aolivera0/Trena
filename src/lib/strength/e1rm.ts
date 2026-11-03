import { rirToRpe, rpePercent } from './rpe'

export type E1rmFormula = 'epley' | 'brzycki' | 'lander'

export const FORMULA_LABELS: Record<E1rmFormula, string> = {
  epley: 'Epley',
  brzycki: 'Brzycki',
  lander: 'Lander',
}

// 1RM estimado suponiendo que la serie llegó al fallo. `load` es la carga total.
export function formulaE1rm(load: number, reps: number, formula: E1rmFormula): number {
  if (reps <= 1) return load
  switch (formula) {
    case 'epley':
      return load * (1 + reps / 30)
    case 'brzycki':
      // La fórmula diverge cerca de 37 reps; a partir de ahí se usa Epley
      return reps < 37 ? (load * 36) / (37 - reps) : load * (1 + reps / 30)
    case 'lander':
      return (100 * load) / (101.3 - 2.67123 * reps)
  }
}

export type SetForE1rm = {
  load: number // carga total (incluye peso corporal si aplica)
  reps: number
  rpe?: number | null
  rir?: number | null
}

// Con RPE/RIR dentro de la tabla se usa la tabla (más precisa que suponer fallo);
// si no, la fórmula elegida por el usuario.
export function setE1rm(set: SetForE1rm, formula: E1rmFormula): number | null {
  if (!(set.load > 0) || !(set.reps >= 1)) return null
  const rpe = set.rpe ?? (set.rir != null ? rirToRpe(set.rir) : null)
  if (rpe != null) {
    const pct = rpePercent(set.reps, rpe)
    if (pct != null) return set.load / pct
  }
  return formulaE1rm(set.load, set.reps, formula)
}

// Carga total de un ejercicio: lastre + peso corporal cuando corresponde.
export function totalLoad(weightKg: number, addsBodyweight: boolean, bodyweightKg: number): number {
  return addsBodyweight ? weightKg + bodyweightKg : weightKg
}
