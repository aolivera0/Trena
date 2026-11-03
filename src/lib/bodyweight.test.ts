import { describe, expect, it } from 'vitest'
import { movingAverage } from './bodyweight'

describe('media móvil de 8 días', () => {
  it('con un registro por día promedia los últimos 8', () => {
    const entries = Array.from({ length: 10 }, (_, i) => ({ date: `2026-11-${String(i + 1).padStart(2, '0')}`, kg: 80 + i }))
    const points = movingAverage(entries)
    // Día 10: días 3..10 → 82..89 → 85.5
    expect(points[9].avgKg).toBeCloseTo(85.5, 10)
    expect(points[9].samples).toBe(8)
    // Día 1: solo él mismo
    expect(points[0].avgKg).toBe(80)
  })

  it('ignora los días sin registro (no cuentan como cero)', () => {
    const points = movingAverage([
      { date: '2026-11-01', kg: 80 },
      { date: '2026-11-04', kg: 82 },
      { date: '2026-11-08', kg: 84 },
    ])
    // Día 8: ventana 1..8 contiene los tres → 82
    expect(points[2].avgKg).toBeCloseTo(82, 10)
    expect(points[2].samples).toBe(3)
  })

  it('excluye lo que queda fuera de la ventana', () => {
    const points = movingAverage([
      { date: '2026-11-01', kg: 70 },
      { date: '2026-11-09', kg: 80 },
      { date: '2026-11-10', kg: 82 },
    ])
    // Día 9: ventana 2..9 ya no incluye el día 1
    expect(points[1].avgKg).toBe(80)
    expect(points[2].avgKg).toBe(81)
  })

  it('no rompe la línea: hay media en cada día registrado aunque haya huecos largos', () => {
    const points = movingAverage([
      { date: '2026-10-01', kg: 80 },
      { date: '2026-11-15', kg: 78 },
    ])
    expect(points.map((p) => p.avgKg)).toEqual([80, 78])
    expect(points[1].time).toBeGreaterThan(points[0].time)
  })

  it('ordena por fecha y cruza meses', () => {
    const points = movingAverage([
      { date: '2026-11-02', kg: 81 },
      { date: '2026-10-28', kg: 79 },
    ])
    expect(points.map((p) => p.date)).toEqual(['2026-10-28', '2026-11-02'])
    expect(points[1].avgKg).toBe(80)
  })
})
