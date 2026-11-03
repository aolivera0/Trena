import { Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useProfile } from '../../auth/AuthProvider'
import { formatRest } from '../../lib/format'
import { groupSuggestion, type AthleteContext } from '../../lib/program'
import {
  defaultLoad,
  defaultReps,
  formatPrescription,
  LOAD_LABELS,
  REPS_LABELS,
  type Load,
  type LoadType,
  type Reps,
  type RepsType,
} from '../../lib/strength/prescription'
import type { ProgramExercise, SetGroup } from '../../lib/types'
import { Button, Field, NumberInput, Segmented, Select, Sheet, WeightInput } from '../ui'
import { SuggestionText } from './SuggestionText'

const RPE_OPTIONS = [10, 9.5, 9, 8.5, 8, 7.5, 7, 6.5, 6]
const RIR_OPTIONS = [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4]
const REST_PRESETS = [0, 60, 90, 120, 180, 240, 300]

export function SetGroupSheet({
  group,
  exercise,
  ctx,
  onSave,
  onDelete,
  onClose,
}: {
  group: SetGroup
  exercise: ProgramExercise
  ctx: AthleteContext
  onSave: (group: SetGroup) => void
  onDelete: (groupId: string) => void
  onClose: () => void
}) {
  const { profile } = useProfile()
  const [draft, setDraft] = useState<SetGroup>(group)

  const refOptions = exercise.setGroups.filter((g) => g.id !== draft.id)
  const preview = { ...exercise, setGroups: exercise.setGroups.map((g) => (g.id === draft.id ? draft : g)) }
  const suggestion = groupSuggestion(draft, preview, ctx)
  const set = (patch: Partial<SetGroup>) => setDraft({ ...draft, ...patch })
  const setReps = (reps: Reps) => set({ reps, count: reps.type === 'emom' ? 1 : draft.count })
  const setLoad = (load: Load) => set({ load })

  const valid =
    draft.count >= 1 &&
    (draft.load.type !== 'pctTopSet' || refOptions.some((g) => g.id === (draft.load as { refSetGroupId: string }).refSetGroupId))

  return (
    <Sheet open onClose={onClose} title="Series">
      <div className="space-y-5">
        <Segmented
          value={draft.kind}
          options={[
            { value: 'warmup', label: 'Calentamiento' },
            { value: 'working', label: 'Efectiva' },
          ]}
          onChange={(kind) => set({ kind })}
        />

        <div className="grid grid-cols-[5rem_1fr] gap-3">
          <Field label="Series">
            <NumberInput
              value={draft.count}
              onChange={(n) => set({ count: Math.max(1, Math.round(n ?? 1)) })}
              inputMode="numeric"
              disabled={draft.reps.type === 'emom'}
            />
          </Field>
          <Field label="Repeticiones">
            <Select value={draft.reps.type} onChange={(e) => setReps(defaultReps(e.target.value as RepsType))}>
              {(Object.keys(REPS_LABELS) as RepsType[]).map((t) => (
                <option key={t} value={t}>
                  {REPS_LABELS[t]}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <RepsFields reps={draft.reps} onChange={setReps} />

        <Field label="Carga">
          <Select
            value={draft.load.type}
            onChange={(e) => setLoad(defaultLoad(e.target.value as LoadType, refOptions[0]?.id ?? ''))}
          >
            {(Object.keys(LOAD_LABELS) as LoadType[]).map((t) => (
              <option key={t} value={t} disabled={t === 'pctTopSet' && refOptions.length === 0}>
                {LOAD_LABELS[t]}
              </option>
            ))}
          </Select>
        </Field>
        <LoadFields load={draft.load} onChange={setLoad} refOptions={refOptions} unit={profile.prefs.unit} />

        <Field label={`Descanso: ${formatRest(draft.restSec)}`}>
          <div className="flex flex-wrap gap-2">
            {REST_PRESETS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => set({ restSec: s })}
                className={`h-8 rounded-lg px-3 text-sm ${draft.restSec === s ? 'bg-accent text-bg' : 'bg-surface-2 text-muted'}`}
              >
                {s === 0 ? '0' : formatRest(s)}
              </button>
            ))}
            <NumberInput
              value={draft.restSec}
              onChange={(n) => set({ restSec: Math.max(0, Math.round(n ?? 0)) })}
              className="!h-8 !w-20 text-sm"
              aria-label="Descanso en segundos"
              inputMode="numeric"
            />
          </div>
        </Field>

        <div className="rounded-lg bg-surface-2 p-3 text-sm">
          <p className="font-medium">{formatPrescription(draft.count, draft.reps, draft.load)}</p>
          <SuggestionText suggestion={suggestion} addsBodyweight={exercise.exercise.addsBodyweight} />
        </div>

        <div className="flex gap-3">
          <Button variant="danger" onClick={() => onDelete(draft.id)} aria-label="Eliminar series">
            <Trash2 size={16} />
          </Button>
          <Button variant="primary" className="flex-1" onClick={() => onSave(draft)} disabled={!valid}>
            Listo
          </Button>
        </div>
      </div>
    </Sheet>
  )
}

function int(n: number | null, min = 1) {
  return Math.max(min, Math.round(n ?? min))
}

function RepsFields({ reps, onChange }: { reps: Reps; onChange: (reps: Reps) => void }) {
  switch (reps.type) {
    case 'fixed':
      return (
        <Field label="Reps por serie">
          <NumberInput value={reps.n} onChange={(n) => onChange({ ...reps, n: int(n) })} inputMode="numeric" />
        </Field>
      )
    case 'range':
      return (
        <div className="grid grid-cols-2 gap-3">
          <Field label="Mínimo">
            <NumberInput value={reps.min} onChange={(n) => onChange({ ...reps, min: int(n) })} inputMode="numeric" />
          </Field>
          <Field label="Máximo">
            <NumberInput value={reps.max} onChange={(n) => onChange({ ...reps, max: int(n) })} inputMode="numeric" />
          </Field>
        </div>
      )
    case 'amrap':
      return <p className="text-sm text-muted">Tantas repeticiones como sea posible.</p>
    case 'emom':
      return (
        <div className="grid grid-cols-2 gap-3">
          <Field label="Minutos">
            <NumberInput value={reps.minutes} onChange={(n) => onChange({ ...reps, minutes: int(n) })} inputMode="numeric" />
          </Field>
          <Field label="Reps por minuto">
            <NumberInput value={reps.repsPerMin} onChange={(n) => onChange({ ...reps, repsPerMin: int(n) })} inputMode="numeric" />
          </Field>
        </div>
      )
    case 'cluster':
      return (
        <div className="grid grid-cols-3 gap-3">
          <Field label="Reps/bloque">
            <NumberInput value={reps.repsPerBlock} onChange={(n) => onChange({ ...reps, repsPerBlock: int(n) })} inputMode="numeric" />
          </Field>
          <Field label="Bloques">
            <NumberInput value={reps.blocks} onChange={(n) => onChange({ ...reps, blocks: int(n) })} inputMode="numeric" />
          </Field>
          <Field label="Pausa (s)">
            <NumberInput
              value={reps.intraRestSec}
              onChange={(n) => onChange({ ...reps, intraRestSec: int(n, 0) })}
              inputMode="numeric"
            />
          </Field>
        </div>
      )
  }
}

function LoadFields({
  load,
  onChange,
  refOptions,
  unit,
}: {
  load: Load
  onChange: (load: Load) => void
  refOptions: SetGroup[]
  unit: 'kg' | 'lb'
}) {
  switch (load.type) {
    case 'fixed':
      return (
        <Field label="Peso (lastre en ejercicios con peso corporal)">
          <WeightInput valueKg={load.kg} onChangeKg={(kg) => onChange({ ...load, kg: Math.max(0, kg ?? 0) })} unit={unit} />
        </Field>
      )
    case 'pct1rm':
      return (
        <Field label="% del 1RM">
          <NumberInput value={load.pct} onChange={(pct) => onChange({ ...load, pct: pct ?? 0 })} />
        </Field>
      )
    case 'pctTopSet':
      return (
        <div className="grid grid-cols-[5rem_1fr] gap-3">
          <Field label="%">
            <NumberInput value={load.pct} onChange={(pct) => onChange({ ...load, pct: pct ?? 0 })} />
          </Field>
          <Field label="Del top set">
            <Select value={load.refSetGroupId} onChange={(e) => onChange({ ...load, refSetGroupId: e.target.value })}>
              <option value="" disabled>
                Elegir…
              </option>
              {refOptions.map((g) => (
                <option key={g.id} value={g.id}>
                  {formatPrescription(g.count, g.reps, g.load)}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      )
    case 'rpe':
      return (
        <Field label="RPE objetivo">
          <Select value={load.value} onChange={(e) => onChange({ ...load, value: Number(e.target.value) })}>
            {RPE_OPTIONS.map((v) => (
              <option key={v} value={v}>
                RPE {v}
              </option>
            ))}
          </Select>
        </Field>
      )
    case 'rir':
      return (
        <Field label="Repeticiones en reserva">
          <Select value={load.value} onChange={(e) => onChange({ ...load, value: Number(e.target.value) })}>
            {RIR_OPTIONS.map((v) => (
              <option key={v} value={v}>
                RIR {v}
              </option>
            ))}
          </Select>
        </Field>
      )
  }
}
