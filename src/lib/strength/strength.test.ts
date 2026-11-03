import { describe, expect, it } from 'vitest'
import { formulaE1rm, setE1rm, totalLoad } from './e1rm'
import { formatPrescription, suggestWeight } from './prescription'
import { isRpeInTable, rpePercent } from './rpe'

describe('tabla RPE', () => {
  // Celdas copiadas de docs/recursos/1RM-segun-el-RPE.webp
  const cells: [number, number, number][] = [
    [1, 10, 100],
    [12, 10, 68.0],
    [1, 9.5, 97.8],
    [5, 9.5, 85.0],
    [3, 9, 89.2],
    [1, 8, 92.2],
    [4, 8, 83.7],
    [7, 7.5, 75.1],
    [10, 7, 65.3],
    [6, 6.5, 75.1],
    [9, 6.5, 66.7],
    [1, 6, 86.3],
    [8, 6, 68.0],
    [12, 6, 57.3],
  ]

  it.each(cells)('%i reps @ RPE %d = %d%%', (reps, rpe, pct) => {
    expect(rpePercent(reps, rpe)).toBeCloseTo(pct / 100, 4)
  })

  it('rechaza valores fuera de la tabla', () => {
    expect(rpePercent(13, 8)).toBeNull()
    expect(rpePercent(5, 5.5)).toBeNull()
    expect(rpePercent(5, 8.25)).toBeNull()
    expect(isRpeInTable(0, 8)).toBe(false)
  })
})

describe('e1RM', () => {
  it('fórmulas', () => {
    expect(formulaE1rm(100, 5, 'epley')).toBeCloseTo(116.667, 2)
    expect(formulaE1rm(100, 5, 'brzycki')).toBeCloseTo(112.5, 2)
    expect(formulaE1rm(100, 5, 'lander')).toBeCloseTo(113.71, 2)
    expect(formulaE1rm(140, 1, 'epley')).toBe(140)
    expect(formulaE1rm(140, 1, 'lander')).toBe(140)
  })

  it('usa la tabla cuando hay RPE', () => {
    // 100 × 3 @ 8 → 86.3% → 115.87
    expect(setE1rm({ load: 100, reps: 3, rpe: 8 }, 'epley')).toBeCloseTo(115.87, 1)
    // RIR 2 = RPE 8
    expect(setE1rm({ load: 100, reps: 3, rir: 2 }, 'epley')).toBeCloseTo(115.87, 1)
  })

  it('cae a la fórmula fuera de la tabla', () => {
    expect(setE1rm({ load: 60, reps: 15, rpe: 9 }, 'epley')).toBeCloseTo(90, 5)
    expect(setE1rm({ load: 100, reps: 5 }, 'brzycki')).toBeCloseTo(112.5, 2)
  })

  it('ignora series vacías', () => {
    expect(setE1rm({ load: 0, reps: 5 }, 'epley')).toBeNull()
    expect(setE1rm({ load: 100, reps: 0 }, 'epley')).toBeNull()
  })

  it('carga total con lastre', () => {
    expect(totalLoad(20, true, 75)).toBe(95)
    expect(totalLoad(100, false, 75)).toBe(100)
  })
})

describe('peso sugerido', () => {
  const ctx = { rmKg: 200, addsBodyweight: false, bodyweightKg: 80 }

  it('% 1RM', () => {
    const s = suggestWeight({ type: 'pct1rm', pct: 81 }, { type: 'fixed', n: 1 }, ctx)
    expect(s).toEqual({ kind: 'kg', kg: 162, assisted: false })
  })

  it('RPE con la tabla y el mínimo del rango', () => {
    const s = suggestWeight({ type: 'rpe', value: 6 }, { type: 'range', min: 4, max: 6 }, ctx)
    expect(s.kind === 'kg' && s.kg).toBeCloseTo(200 * 0.786, 5)
  })

  it('RIR se convierte a RPE', () => {
    const s = suggestWeight({ type: 'rir', value: 2 }, { type: 'fixed', n: 3 }, ctx)
    expect(s.kind === 'kg' && s.kg).toBeCloseTo(200 * 0.863, 5)
  })

  it('% del top set', () => {
    const load = { type: 'pctTopSet', pct: 90, refSetGroupId: 'a' } as const
    expect(suggestWeight(load, { type: 'fixed', n: 4 }, { ...ctx, topSetLoadKg: 180 })).toEqual({
      kind: 'kg',
      kg: 162,
      assisted: false,
    })
    expect(suggestWeight(load, { type: 'fixed', n: 4 }, ctx).kind).toBe('missing')
  })

  it('lastre: calcula sobre la carga total y resta el peso corporal', () => {
    // RM total 130 (80 corporal + 50 lastre); 85% → 110.5 total → 30.5 de lastre
    const s = suggestWeight(
      { type: 'pct1rm', pct: 85 },
      { type: 'fixed', n: 3 },
      { rmKg: 130, addsBodyweight: true, bodyweightKg: 80 },
    )
    expect(s.kind === 'kg' && s.kg).toBeCloseTo(30.5, 5)
  })

  it('lastre negativo = necesita asistencia', () => {
    const s = suggestWeight(
      { type: 'pct1rm', pct: 50 },
      { type: 'fixed', n: 8 },
      { rmKg: 130, addsBodyweight: true, bodyweightKg: 80 },
    )
    expect(s).toEqual({ kind: 'kg', kg: 0, assisted: true })
  })

  it('sin RM no hay sugerencia', () => {
    const s = suggestWeight({ type: 'pct1rm', pct: 80 }, { type: 'fixed', n: 1 }, { ...ctx, rmKg: null })
    expect(s.kind).toBe('missing')
  })

  it('AMRAP con RPE no tiene referencia', () => {
    expect(suggestWeight({ type: 'rpe', value: 8 }, { type: 'amrap' }, ctx).kind).toBe('missing')
  })
})

describe('formato', () => {
  it('top set y back-offs', () => {
    expect(formatPrescription(1, { type: 'fixed', n: 1 }, { type: 'pct1rm', pct: 81 })).toBe('1×1 @ 81%')
    expect(formatPrescription(4, { type: 'fixed', n: 4 }, { type: 'rpe', value: 6 })).toBe('4×4 @ RPE 6')
  })

  it('rangos, EMOM y clúster', () => {
    expect(formatPrescription(3, { type: 'range', min: 8, max: 10 }, { type: 'rir', value: 2 })).toBe(
      '3×8–10 @ RIR 2',
    )
    expect(
      formatPrescription(1, { type: 'emom', minutes: 10, repsPerMin: 3 }, { type: 'fixed', kg: 70 }),
    ).toBe('EMOM 10′ × 3 @ 70 kg')
    expect(
      formatPrescription(
        2,
        { type: 'cluster', repsPerBlock: 2, blocks: 3, intraRestSec: 15 },
        { type: 'pct1rm', pct: 85 },
      ),
    ).toBe('2×2+2+2 (15s) @ 85%')
  })
})
