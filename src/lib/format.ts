import { kgToUnit, roundForDisplay, type RoundingKg, type Unit } from './strength/units'

// Peso exacto en la unidad del usuario (RMs, estadísticas): "116.7 kg"
export function formatWeight(kg: number, unit: Unit, decimals = 1): string {
  return `${Number(kgToUnit(kg, unit).toFixed(decimals))} ${unit}`
}

// Lastre con signo: "+40 kg"; negativo = asistencia ("-5 kg")
export function formatAddedWeight(kg: number, unit: Unit, decimals = 1): string {
  const text = formatWeight(kg, unit, decimals)
  return kg > 0 ? `+${text}` : text
}

// Peso a cargar, redondeado al incremento de discos: "117.5 kg"
export function formatPlateWeight(kg: number, unit: Unit, roundingKg: RoundingKg): string {
  return `${roundForDisplay(kg, unit, roundingKg)} ${unit}`
}

export function formatRest(sec: number): string {
  if (sec <= 0) return 'sin descanso'
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return m ? (s ? `${m}:${String(s).padStart(2, '0')}` : `${m} min`) : `${s} s`
}
