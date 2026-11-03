// Todos los pesos se guardan en kg; las libras solo existen en la interfaz.

export type Unit = 'kg' | 'lb'

const LB_PER_KG = 2.2046226218

export function kgToUnit(kg: number, unit: Unit): number {
  return unit === 'kg' ? kg : kg * LB_PER_KG
}

export function unitToKg(value: number, unit: Unit): number {
  return unit === 'kg' ? value : value / LB_PER_KG
}

// Incremento mínimo de discos: 2.5 o 1.25 kg, y su equivalente en lb (5 o 2.5).
export type RoundingKg = 2.5 | 1.25

export function roundingStep(roundingKg: RoundingKg, unit: Unit): number {
  if (unit === 'kg') return roundingKg
  return roundingKg === 2.5 ? 5 : 2.5
}

// Redondea un peso en kg al incremento elegido, en la unidad de visualización,
// y lo devuelve ya convertido a esa unidad.
export function roundForDisplay(kg: number, unit: Unit, roundingKg: RoundingKg): number {
  const step = roundingStep(roundingKg, unit)
  const rounded = Math.round(kgToUnit(kg, unit) / step) * step
  // Evita artefactos de coma flotante como 82.50000000001
  return Number(rounded.toFixed(2))
}
