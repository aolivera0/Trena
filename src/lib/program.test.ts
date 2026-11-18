import { describe, expect, it } from 'vitest'
import { newDay, newProgramExercise, newSetGroup, workingSetCount } from './program'
import type { ExerciseRef } from './types'

const ref = { id: 'wg:squat', name: 'Sentadilla' } as ExerciseRef

describe('workingSetCount', () => {
  it('suma solo las series efectivas de todos los ejercicios', () => {
    const day = newDay(1)
    const a = newProgramExercise(ref) // 3 efectivas por defecto
    a.setGroups = [newSetGroup('warmup'), { ...newSetGroup('warmup'), count: 2 }, ...a.setGroups, { ...newSetGroup('working'), count: 1 }]
    const b = newProgramExercise(ref)
    b.setGroups = [{ ...newSetGroup('working'), count: 5 }]
    day.exercises = [a, b]
    expect(workingSetCount(day)).toBe(3 + 1 + 5)
  })

  it('cuenta al menos una serie por grupo y 0 en un día vacío', () => {
    const day = newDay(1)
    expect(workingSetCount(day)).toBe(0)
    const a = newProgramExercise(ref)
    a.setGroups = [{ ...newSetGroup('working'), count: 0 }]
    day.exercises = [a]
    expect(workingSetCount(day)).toBe(1)
  })
})
