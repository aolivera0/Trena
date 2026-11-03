import { describe, expect, it } from 'vitest'
import { kgToUnit, roundForDisplay, roundingStep, unitToKg } from './units'

describe('conversión de unidades', () => {
  it('kg a lb y de vuelta', () => {
    expect(kgToUnit(100, 'lb')).toBeCloseTo(220.462, 3)
    expect(unitToKg(kgToUnit(82.5, 'lb'), 'lb')).toBeCloseTo(82.5, 10)
    expect(kgToUnit(100, 'kg')).toBe(100)
  })
})

describe('redondeo', () => {
  it('usa el incremento equivalente en lb', () => {
    expect(roundingStep(2.5, 'kg')).toBe(2.5)
    expect(roundingStep(1.25, 'kg')).toBe(1.25)
    expect(roundingStep(2.5, 'lb')).toBe(5)
    expect(roundingStep(1.25, 'lb')).toBe(2.5)
  })

  it('redondea al múltiplo más cercano', () => {
    expect(roundForDisplay(81.9, 'kg', 2.5)).toBe(82.5)
    expect(roundForDisplay(81.0, 'kg', 2.5)).toBe(80)
    expect(roundForDisplay(81.6, 'kg', 1.25)).toBe(81.25)
    expect(roundForDisplay(100, 'lb', 2.5)).toBe(220)
    expect(roundForDisplay(100, 'lb', 1.25)).toBe(220)
  })
})
