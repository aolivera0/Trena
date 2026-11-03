// Tabla RPE → % 1RM (docs/recursos/1RM-segun-el-RPE.webp).
//
// La tabla completa es una sola secuencia: medio punto de RPE equivale a una
// repetición más. Con k = 2·(reps − 1) + 2·(10 − RPE), el % es PCT_SEQUENCE[k].
// Así RPE 9 @ 1 rep = RPE 10 @ 2 reps = 95.5 %.
//
// RIR estándar = 10 − RPE (RPE 9 = 1 repetición en reserva).
const PCT_SEQUENCE = [
  100, 97.8, 95.5, 93.9, 92.2, 90.7, 89.2, 87.8, 86.3, 85.0, 83.7, 82.4, 81.1, 79.9, 78.6, 77.4,
  76.2, 75.1, 73.9, 72.3, 70.7, 69.4, 68.0, 66.7, 65.3, 64.0, 62.6, 61.3, 59.9, 58.6, 57.3,
]

export const RPE_MIN = 6
export const RPE_MAX = 10
export const REPS_MAX = 12

export function rirToRpe(rir: number): number {
  return 10 - rir
}

export function rpeToRir(rpe: number): number {
  return 10 - rpe
}

export function isRpeInTable(reps: number, rpe: number): boolean {
  return (
    Number.isInteger(reps) &&
    reps >= 1 &&
    reps <= REPS_MAX &&
    rpe >= RPE_MIN &&
    rpe <= RPE_MAX &&
    Number.isInteger(rpe * 2)
  )
}

// Fracción de 1RM (0–1) para reps × RPE, o null si está fuera de la tabla.
export function rpePercent(reps: number, rpe: number): number | null {
  if (!isRpeInTable(reps, rpe)) return null
  const k = 2 * (reps - 1) + 2 * (10 - rpe)
  return PCT_SEQUENCE[k] / 100
}
