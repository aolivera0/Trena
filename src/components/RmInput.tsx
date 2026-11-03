import { formulaE1rm, totalLoad, type E1rmFormula } from '../lib/strength/e1rm'
import { formatAddedWeight, formatWeight } from '../lib/format'
import type { Unit } from '../lib/strength/units'
import { NumberInput, WeightInput } from './ui'

export type RmDraft = { weightKg: number | null; reps: number | null }

// e1RM (carga total) a partir de una marca peso × reps
export function draftE1rm(
  draft: RmDraft,
  addsBodyweight: boolean,
  bodyweightKg: number | null,
  formula: E1rmFormula,
): number | null {
  if (draft.weightKg == null || !draft.reps || draft.reps < 1) return null
  if (addsBodyweight && bodyweightKg == null) return null
  const load = totalLoad(draft.weightKg, addsBodyweight, bodyweightKg ?? 0)
  return load > 0 ? formulaE1rm(load, draft.reps, formula) : null
}

// Captura una marca como peso × reps. En ejercicios con lastre el peso es el
// lastre y el RM resultante incluye el peso corporal.
export function RmInput({
  draft,
  onChange,
  addsBodyweight,
  bodyweightKg,
  unit,
  formula,
}: {
  draft: RmDraft
  onChange: (draft: RmDraft) => void
  addsBodyweight: boolean
  bodyweightKg: number | null
  unit: Unit
  formula: E1rmFormula
}) {
  const e1rm = draftE1rm(draft, addsBodyweight, bodyweightKg, formula)
  return (
    <div className="space-y-1.5">
      <div className="grid grid-cols-[1fr_auto_5rem] items-center gap-2">
        <WeightInput
          valueKg={draft.weightKg}
          onChangeKg={(weightKg) => onChange({ ...draft, weightKg })}
          unit={unit}
          placeholder={addsBodyweight ? 'Lastre' : 'Peso'}
          aria-label={addsBodyweight ? 'Lastre' : 'Peso'}
        />
        <span className="text-muted">×</span>
        <NumberInput
          value={draft.reps}
          onChange={(reps) => onChange({ ...draft, reps })}
          placeholder="Reps"
          aria-label="Repeticiones"
          inputMode="numeric"
        />
      </div>
      <p className="text-xs text-muted">
        {e1rm == null
          ? addsBodyweight && bodyweightKg == null
            ? 'Ingresa tu peso corporal para calcular'
            : 'Peso × repeticiones de tu mejor marca reciente'
          : addsBodyweight
            ? `e1RM lastre ${formatAddedWeight(e1rm - (bodyweightKg ?? 0), unit)} · total ${formatWeight(e1rm, unit)}`
            : `e1RM ${formatWeight(e1rm, unit)}`}
      </p>
    </div>
  )
}
