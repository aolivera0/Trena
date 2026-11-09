import { FORMULA_LABELS, type E1rmFormula } from '../lib/strength/e1rm'
import type { Prefs } from '../lib/types'
import { Field, Segmented, Toggle } from './ui'

export function PrefsFields({ prefs, onChange }: { prefs: Prefs; onChange: (prefs: Prefs) => void }) {
  const lb = prefs.unit === 'lb'
  return (
    <div className="space-y-4">
      <Field label="Unidades">
        <Segmented
          value={prefs.unit}
          options={[
            { value: 'kg', label: 'Kilogramos' },
            { value: 'lb', label: 'Libras' },
          ]}
          onChange={(unit) => onChange({ ...prefs, unit })}
        />
      </Field>
      <Field label="Redondeo de pesos sugeridos" hint="El incremento más pequeño que puedes cargar.">
        <Segmented
          value={String(prefs.roundingKg) as '2.5' | '1.25'}
          options={[
            { value: '2.5', label: lb ? '5 lb' : '2.5 kg' },
            { value: '1.25', label: lb ? '2.5 lb' : '1.25 kg' },
          ]}
          onChange={(v) => onChange({ ...prefs, roundingKg: v === '2.5' ? 2.5 : 1.25 })}
        />
      </Field>
      <Field
        label="Fórmula de 1RM estimado"
        hint="Se usa cuando una serie no tiene RPE/RIR. Con RPE se usa la tabla RPE."
      >
        <Segmented
          value={prefs.e1rmFormula}
          options={(Object.keys(FORMULA_LABELS) as E1rmFormula[]).map((f) => ({
            value: f,
            label: FORMULA_LABELS[f],
          }))}
          onChange={(e1rmFormula) => onChange({ ...prefs, e1rmFormula })}
        />
      </Field>
      <Toggle
        label="Iniciar el descanso al completar una serie"
        checked={prefs.autoRest ?? false}
        onChange={(autoRest) => onChange({ ...prefs, autoRest })}
      />
    </div>
  )
}
