import { useState } from 'react'
import { useProfile } from '../auth/AuthProvider'
import { Card, Field, NumberInput, PageHeader, Segmented, Select, Toggle, WeightInput } from '../components/ui'
import { formatAddedWeight, formatPlateWeight, formatWeight } from '../lib/format'
import { FORMULA_LABELS, formulaE1rm, setE1rm, type E1rmFormula } from '../lib/strength/e1rm'
import { REPS_MAX, rirToRpe, rpePercent } from '../lib/strength/rpe'

const RPES = [10, 9.5, 9, 8.5, 8, 7.5, 7, 6.5, 6]
const RIRS = [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4]
const REPS = Array.from({ length: REPS_MAX }, (_, i) => i + 1)

type Effort = { kind: 'none' } | { kind: 'rpe'; value: number } | { kind: 'rir'; value: number }

// Calculadora (R-1): estimar el 1RM de una serie y convertir RPE/RIR ↔ % ↔ peso.
// Con lastre, todo se calcula sobre peso corporal + lastre.
export function CalculatorPage() {
  const { profile } = useProfile()
  const { unit, roundingKg } = profile.prefs

  const [weighted, setWeighted] = useState(false)
  const [bodyweight, setBodyweight] = useState<number | null>(profile.bodyweightKg)
  const [weight, setWeight] = useState<number | null>(100)
  const [reps, setReps] = useState<number | null>(5)
  const [effort, setEffort] = useState<Effort>({ kind: 'rpe', value: 8 })

  const [targetReps, setTargetReps] = useState(3)
  const [targetEffort, setTargetEffort] = useState<Effort>({ kind: 'rpe', value: 8 })

  const bw = weighted ? (bodyweight ?? 0) : 0
  const load = weight != null ? weight + bw : null
  const effortRpe = effort.kind === 'rpe' ? effort.value : effort.kind === 'rir' ? rirToRpe(effort.value) : null

  const tableE1rm = load && reps ? setE1rm({ load, reps, rpe: effortRpe }, 'epley') : null
  const usesTable = load != null && reps != null && effortRpe != null && rpePercent(reps, effortRpe) != null
  const e1rm = usesTable ? tableE1rm : load && reps ? formulaE1rm(load, reps, profile.prefs.e1rmFormula) : null

  const targetRpe = targetEffort.kind === 'rpe' ? targetEffort.value : targetEffort.kind === 'rir' ? rirToRpe(targetEffort.value) : 10
  const targetPct = rpePercent(targetReps, targetRpe)
  const show = (totalKg: number) => (weighted ? formatAddedWeight(totalKg - bw, unit) : formatWeight(totalKg, unit))
  const plate = (totalKg: number) =>
    weighted ? `+${formatPlateWeight(Math.max(0, totalKg - bw), unit, roundingKg)}` : formatPlateWeight(totalKg, unit, roundingKg)

  return (
    <div className="space-y-5">
      <PageHeader title="Calculadora" subtitle="RPE · RIR · % 1RM" />

      <Card className="space-y-3">
        <Toggle label="Ejercicio con lastre (dominadas, fondos, muscle-up)" checked={weighted} onChange={setWeighted} />
        {weighted && (
          <Field label="Peso corporal">
            <WeightInput valueKg={bodyweight} onChangeKg={setBodyweight} unit={unit} />
          </Field>
        )}
      </Card>

      <Card className="space-y-4">
        <h2 className="font-semibold">Estimar 1RM de una serie</h2>
        <div className="grid grid-cols-2 gap-3">
          <Field label={weighted ? 'Lastre' : 'Peso'}>
            <WeightInput valueKg={weight} onChangeKg={setWeight} unit={unit} />
          </Field>
          <Field label="Repeticiones">
            <NumberInput value={reps} onChange={(v) => setReps(v == null ? null : Math.max(1, Math.round(v)))} inputMode="numeric" />
          </Field>
        </div>
        <EffortField value={effort} onChange={setEffort} allowNone />

        {e1rm != null && (
          <div className="rounded-lg bg-surface-2 p-3">
            <p className="text-xs text-muted">{usesTable ? 'Por tabla RPE' : `Por ${FORMULA_LABELS[profile.prefs.e1rmFormula]}`}</p>
            <p className="text-3xl font-semibold">{show(e1rm)}</p>
            {weighted && <p className="text-xs text-muted">total {formatWeight(e1rm, unit)}</p>}
            {load != null && reps != null && reps > 1 && (
              <dl className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                {(Object.keys(FORMULA_LABELS) as E1rmFormula[]).map((f) => (
                  <div key={f}>
                    <dt className="text-muted">{FORMULA_LABELS[f]}</dt>
                    <dd className="font-medium tabular">{show(formulaE1rm(load, reps, f))}</dd>
                  </div>
                ))}
              </dl>
            )}
          </div>
        )}
      </Card>

      {e1rm != null && (
        <Card className="space-y-4">
          <h2 className="font-semibold">Peso para una serie</h2>
          <p className="text-xs text-muted">Con el 1RM estimado de arriba ({show(e1rm)}).</p>
          <div className="grid grid-cols-[6rem_1fr] gap-3">
            <Field label="Reps">
              <Select value={targetReps} onChange={(e) => setTargetReps(Number(e.target.value))}>
                {REPS.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </Select>
            </Field>
            <EffortField value={targetEffort} onChange={setTargetEffort} />
          </div>
          {targetPct != null && (
            <div className="rounded-lg bg-surface-2 p-3">
              <p className="text-xs text-muted">{(targetPct * 100).toFixed(1)}% del 1RM</p>
              <p className="text-3xl font-semibold">{plate(targetPct * e1rm)}</p>
            </div>
          )}

          <div className="-mx-4 overflow-x-auto px-4">
            <table className="w-full min-w-[34rem] text-center text-xs tabular">
              <thead>
                <tr className="text-muted">
                  <th className="py-1 text-left font-medium">RPE</th>
                  {REPS.map((r) => (
                    <th key={r} className="py-1 font-medium">
                      {r}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {RPES.map((rpe) => (
                  <tr key={rpe} className="border-t border-border">
                    <th className="py-1.5 text-left font-medium text-muted">{rpe}</th>
                    {REPS.map((r) => {
                      const pct = rpePercent(r, rpe)!
                      const selected = r === targetReps && rpe === targetRpe
                      return (
                        <td key={r} className={`py-1.5 ${selected ? 'rounded bg-accent font-semibold text-bg' : ''}`} title={`${(pct * 100).toFixed(1)}%`}>
                          {Number(kgToDisplay(weighted ? Math.max(0, pct * e1rm - bw) : pct * e1rm, unit).toFixed(0))}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-muted">
            {weighted ? 'Lastre' : 'Peso'} en {unit} para cada combinación de repeticiones y RPE. RIR = 10 − RPE.
          </p>
        </Card>
      )}
    </div>
  )
}

function kgToDisplay(kg: number, unit: 'kg' | 'lb') {
  return unit === 'kg' ? kg : kg * 2.2046226218
}

function EffortField({ value, onChange, allowNone }: { value: Effort; onChange: (e: Effort) => void; allowNone?: boolean }) {
  const kinds = [...(allowNone ? [{ value: 'none' as const, label: 'Al fallo' }] : []), { value: 'rpe' as const, label: 'RPE' }, { value: 'rir' as const, label: 'RIR' }]
  return (
    <div className="space-y-2">
      <Segmented
        size="sm"
        value={value.kind}
        options={kinds}
        onChange={(kind) => onChange(kind === 'none' ? { kind } : kind === 'rpe' ? { kind, value: 8 } : { kind, value: 2 })}
      />
      {value.kind !== 'none' && (
        <Select value={value.value} onChange={(e) => onChange({ ...value, value: Number(e.target.value) })} aria-label={value.kind.toUpperCase()}>
          {(value.kind === 'rpe' ? RPES : RIRS).map((v) => (
            <option key={v} value={v}>
              {value.kind.toUpperCase()} {v}
            </option>
          ))}
        </Select>
      )}
    </div>
  )
}
