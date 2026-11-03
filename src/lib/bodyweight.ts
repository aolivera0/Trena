// Peso corporal: media móvil de los últimos 8 días (incluido el día).
// Los días sin registro no cuentan como cero ni cortan la serie: la media de
// cada día registrado se calcula con los registros que existan en su ventana.

export type BodyweightEntry = { date: string; kg: number } // date = YYYY-MM-DD local

export type BodyweightPoint = BodyweightEntry & { time: number; avgKg: number; samples: number }

const DAY_MS = 86_400_000

// Mediodía UTC del día: evita saltos por horario de verano al restar días
export function dayToTime(date: string): number {
  const [y, m, d] = date.split('-').map(Number)
  return Date.UTC(y, m - 1, d, 12)
}

export function movingAverage(entries: BodyweightEntry[], windowDays = 8): BodyweightPoint[] {
  const sorted = [...entries].sort((a, b) => a.date.localeCompare(b.date))
  const times = sorted.map((e) => dayToTime(e.date))
  return sorted.map((entry, i) => {
    const from = times[i] - (windowDays - 1) * DAY_MS
    let sum = 0
    let samples = 0
    for (let j = i; j >= 0 && times[j] >= from; j--) {
      sum += sorted[j].kg
      samples++
    }
    return { ...entry, time: times[i], avgKg: sum / samples, samples }
  })
}
