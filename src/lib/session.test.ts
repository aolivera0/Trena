import { describe, expect, it } from 'vitest'
import { computeFinish, expandDay, liveSuggestion, sortedSets, type EntryWithId } from './session'
import type { Day, ExerciseRef, ExerciseStats, SessionSet } from './types'

const squat: ExerciseRef = { id: 'wg:squat', name: 'Sentadilla', variant: null, slug: 'squat', addsBodyweight: false }
const pullup: ExerciseRef = {
  id: 'wg:weighted-pull-up',
  name: 'Dominadas lastradas',
  variant: null,
  slug: 'weighted-pull-up',
  addsBodyweight: true,
}

const day: Day = {
  id: 'd1',
  name: 'Día 1',
  notes: '',
  exercises: [
    {
      id: 'e1',
      exercise: squat,
      coachNotes: 'Profundidad',
      setGroups: [
        { id: 'top', kind: 'working', count: 1, reps: { type: 'fixed', n: 1 }, load: { type: 'pct1rm', pct: 81 }, restSec: 240 },
        {
          id: 'bo',
          kind: 'working',
          count: 4,
          reps: { type: 'fixed', n: 4 },
          load: { type: 'pctTopSet', pct: 90, refSetGroupId: 'top' },
          restSec: 180,
        },
      ],
    },
  ],
}

function set(over: Partial<SessionSet>): SessionSet {
  return { order: 0, kind: 'working', prescription: null, restSec: 120, weightKg: null, reps: null, rpe: null, done: false, completedAt: null, ...over }
}

function entry(exercise: ExerciseRef, sets: Partial<SessionSet>[], order = 0): EntryWithId {
  return {
    id: exercise.id,
    exercise,
    order,
    coachNotes: '',
    athleteNotes: '',
    sets: Object.fromEntries(sets.map((s, i) => [`s${i}`, set({ order: i, ...s })])),
  }
}

describe('expandir plantilla', () => {
  it('1×1 + 4×4 = 5 series con su prescripción y orden', () => {
    const [e] = expandDay(day)
    const sets = sortedSets(e).map(([, s]) => s)
    expect(sets).toHaveLength(5)
    expect(sets[0].prescription?.groupId).toBe('top')
    expect(sets.slice(1).every((s) => s.prescription?.groupId === 'bo' && s.restSec === 180)).toBe(true)
    expect(sets.map((s) => s.order)).toEqual([0, 1, 2, 3, 4])
    expect(e.coachNotes).toBe('Profundidad')
  })
})

describe('sugerencia en vivo', () => {
  const ctx = { rmKg: 200, bodyweightKg: 80, addsBodyweight: false }

  it('back-off usa el top set planificado mientras no se hace', () => {
    const [e] = expandDay(day)
    const backoff = sortedSets(e)[1][1]
    // 81% de 200 = 162 → 90% = 145.8
    const s = liveSuggestion(backoff, e, ctx)
    expect(s?.kind === 'kg' && s.kg).toBeCloseTo(145.8, 5)
  })

  it('back-off usa el top set real cuando ya se hizo', () => {
    const [e] = expandDay(day)
    const [[topId, top], [, backoff]] = sortedSets(e)
    e.sets[topId] = { ...top, done: true, weightKg: 170, reps: 1 }
    const s = liveSuggestion(backoff, e, ctx)
    expect(s?.kind === 'kg' && s.kg).toBeCloseTo(153, 5)
  })
})

describe('finalizar', () => {
  const opts = {
    bodyweightKg: 80,
    formula: 'epley' as const,
    startedAt: 0,
    finishedAt: 3_600_000,
    sessionId: 'S',
    sessionName: 'Día 1',
  }

  it('tonelaje, duración y series contando calentamientos y solo series hechas', () => {
    const e = entry(squat, [
      { kind: 'warmup', done: true, weightKg: 60, reps: 5 },
      { done: true, weightKg: 100, reps: 5 },
      { done: false, weightKg: 100, reps: 5 },
      { done: true, weightKg: null, reps: 5 },
    ])
    const { summary } = computeFinish([e], new Map(), new Map(), opts)
    expect(summary.tonnageKg).toBe(60 * 5 + 100 * 5)
    expect(summary.durationSec).toBe(3600)
    expect(summary.setsDone).toBe(2)
  })

  it('genera el historial por ejercicio con e1RM por serie', () => {
    const e = entry(squat, [
      { kind: 'warmup', done: true, weightKg: 60, reps: 5 },
      { done: true, weightKg: 150, reps: 3, rpe: 8 },
    ])
    const { logs } = computeFinish([e], new Map(), new Map(), opts)
    expect(logs).toHaveLength(1)
    expect(logs[0]).toMatchObject({ exerciseId: squat.id, sessionId: 'S', date: 3_600_000, tonnageKg: 750 })
    expect(logs[0].sets[1].e1rmKg).toBeCloseTo(173.81, 1)
    expect(logs[0].bestE1rmKg).toBeCloseTo(173.81, 1)
  })

  it('con lastre suma el peso corporal', () => {
    const e = entry(pullup, [{ done: true, weightKg: 20, reps: 5 }])
    const { summary, stats } = computeFinish([e], new Map(), new Map(), opts)
    expect(summary.tonnageKg).toBe(100 * 5)
    expect(stats.get(pullup.id)?.bestWeightKg).toBe(100)
    expect(stats.get(pullup.id)?.lastSets[0].weightKg).toBe(20)
  })

  it('detecta PRs de peso, volumen y e1RM contra el historial', () => {
    const prev: ExerciseStats = {
      exercise: squat,
      lastSets: [],
      lastSessionId: 'old',
      lastDate: 0,
      bestWeightKg: 140,
      bestSetVolumeKg: 500,
      bestE1rmKg: 160,
    }
    const e = entry(squat, [
      { done: true, weightKg: 145, reps: 1 },
      { done: true, weightKg: 120, reps: 5 },
    ])
    const { summary } = computeFinish([e], new Map([[squat.id, prev]]), new Map([[squat.id, 165]]), opts)
    const types = summary.prs.map((p) => p.type).sort()
    expect(types).toEqual(['volume', 'weight'])
    // e1RM: 120×5 Epley = 140 < 165 → sin PR ni actualización de RM
    expect(summary.rmUpdates).toEqual([])
  })

  it('PR de e1RM actualiza el RM; usa la tabla RPE si hay RPE', () => {
    const e = entry(squat, [{ done: true, weightKg: 150, reps: 3, rpe: 8 }])
    // 150 / 0.863 = 173.8 > 165
    const { summary } = computeFinish([e], new Map(), new Map([[squat.id, 165]]), opts)
    expect(summary.prs.map((p) => p.type)).toEqual(['e1rm'])
    expect(summary.rmUpdates[0].e1rmKg).toBeCloseTo(173.81, 1)
    expect(summary.rmUpdates[0].previousKg).toBe(165)
  })

  it('sin historial ni RM no hay PRs, pero se crea el RM', () => {
    const e = entry(squat, [{ done: true, weightKg: 100, reps: 5 }])
    const { summary } = computeFinish([e], new Map(), new Map(), opts)
    expect(summary.prs).toEqual([])
    expect(summary.rmUpdates).toHaveLength(1)
  })

  it('las mejores marcas acumuladas no bajan', () => {
    const prev: ExerciseStats = {
      exercise: squat,
      lastSets: [],
      lastSessionId: 'old',
      lastDate: 0,
      bestWeightKg: 200,
      bestSetVolumeKg: 900,
      bestE1rmKg: 210,
    }
    const e = entry(squat, [{ done: true, weightKg: 100, reps: 3 }])
    const { stats } = computeFinish([e], new Map([[squat.id, prev]]), new Map(), opts)
    expect(stats.get(squat.id)).toMatchObject({ bestWeightKg: 200, bestSetVolumeKg: 900, bestE1rmKg: 210 })
  })
})
