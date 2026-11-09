import { Check, MoreHorizontal, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useProfile } from '../../auth/AuthProvider'
import { useEntryWriter } from '../../hooks/useEntryWriter'
import { exerciseLabel } from '../../lib/exercises'
import {
  defaultRepsFor,
  emptySet,
  liveSuggestion,
  nextOrder,
  sortedSets,
  targetRepsLabel,
  targetRpe,
  type EntryWithId,
} from '../../lib/session'
import { addSet, removeEntry, removeSet } from '../../lib/sessionDb'
import { unlockAudio } from '../../lib/sound'
import { formatPrescription } from '../../lib/strength/prescription'
import { kgToUnit, roundForDisplay, unitToKg } from '../../lib/strength/units'
import type { ExerciseStats, SessionSet } from '../../lib/types'
import { ExerciseThumb } from '../ExercisePicker'
import { Button, IconButton, NumberInput, Segmented, Sheet } from '../ui'

const cellInput =
  '!h-9 !rounded-md !border-transparent !bg-surface-2 !px-1 text-center text-[15px] focus:!border-accent placeholder:!text-muted/50'

export function EntryCard({
  athleteId,
  sessionId,
  entry,
  rmKg,
  bodyweightKg,
  stats,
  onSetDone,
  onOpenExercise,
}: {
  athleteId: string
  sessionId: string
  entry: EntryWithId
  rmKg: number | null
  bodyweightKg: number
  stats: ExerciseStats | undefined
  onSetDone: (restSec: number) => void
  onOpenExercise: () => void
}) {
  const { profile } = useProfile()
  const { unit, roundingKg } = profile.prefs
  const { write, read } = useEntryWriter(athleteId, sessionId, entry.id, entry)
  const [menuSet, setMenuSet] = useState<string | null>(null)

  const addsBodyweight = entry.exercise.addsBodyweight
  const ctx = { rmKg, bodyweightKg, addsBodyweight }

  // Entrada con los cambios locales aplicados (para sugerencias en vivo)
  const sets = sortedSets(entry).map(([id, s]): [string, SessionSet] => {
    const p = `sets.${id}`
    return [
      id,
      {
        ...s,
        weightKg: read(`${p}.weightKg`, s.weightKg),
        reps: read(`${p}.reps`, s.reps),
        rpe: read(`${p}.rpe`, s.rpe),
        done: read(`${p}.done`, s.done),
        kind: read(`${p}.kind`, s.kind),
      },
    ]
  })
  const live = { ...entry, sets: Object.fromEntries(sets) }

  const prescriptions = [
    ...new Map(
      sets.filter(([, s]) => s.prescription).map(([, s]) => [s.prescription!.groupId, s]),
    ).values(),
  ].map((s) => {
    const count = sets.filter(([, x]) => x.prescription?.groupId === s.prescription!.groupId).length
    return `${s.kind === 'warmup' ? 'W ' : ''}${formatPrescription(count, s.prescription!.reps, s.prescription!.load)}`
  })

  function suggestedKg(set: SessionSet): number | null {
    const s = liveSuggestion(set, live, ctx)
    if (!s || s.kind === 'missing') return null
    return unitToKg(roundForDisplay(s.kg, unit, roundingKg), unit)
  }

  function toggleDone(id: string, set: SessionSet) {
    const p = `sets.${id}`
    if (set.done) {
      write({ [`${p}.done`]: false, [`${p}.completedAt`]: null }, true)
      return
    }
    unlockAudio()
    write(
      {
        [`${p}.done`]: true,
        [`${p}.completedAt`]: Date.now(),
        [`${p}.weightKg`]: set.weightKg ?? suggestedKg(set) ?? (addsBodyweight ? 0 : null),
        [`${p}.reps`]: set.reps ?? defaultRepsFor(set.prescription?.reps),
      },
      true,
    )
    onSetDone(set.restSec)
  }

  function add(kind: SessionSet['kind']) {
    const last = sets.at(-1)?.[1]
    const base = emptySet(kind, nextOrder(entry), last?.restSec ?? 120)
    // Una serie extra repite la prescripción de la última efectiva
    if (kind === 'working' && last?.kind === 'working') base.prescription = last.prescription
    if (kind === 'warmup') base.order = Math.min(0, ...sets.map(([, s]) => s.order)) - 1
    addSet(athleteId, sessionId, entry.id, base)
  }

  let working = 0
  const menu = menuSet ? sets.find(([id]) => id === menuSet) : undefined

  return (
    <section className="overflow-hidden rounded-xl border border-border bg-surface">
      <div className="flex items-center gap-3 p-3 pb-2">
        <button
          type="button"
          onClick={onOpenExercise}
          className="-m-1 flex min-w-0 flex-1 items-center gap-3 rounded-lg p-1 text-left hover:bg-surface-2"
          aria-label={`Historial y tutorial de ${exerciseLabel(entry.exercise)}`}
        >
          <ExerciseThumb slug={entry.exercise.slug} size={40} />
          <span className="min-w-0 flex-1">
            <span className="block truncate font-semibold text-accent">{entry.exercise.name}</span>
            {entry.exercise.variant && <span className="block truncate text-sm text-muted">{entry.exercise.variant}</span>}
          </span>
        </button>
        <IconButton
          label="Quitar ejercicio"
          onClick={() => confirm(`¿Quitar ${exerciseLabel(entry.exercise)} de la sesión?`) && removeEntry(athleteId, sessionId, entry.id)}
        >
          <Trash2 size={16} />
        </IconButton>
      </div>

      {prescriptions.length > 0 && <p className="px-3 pb-2 text-xs text-muted">{prescriptions.join(' · ')}</p>}

      <div className="space-y-2 px-3 pb-2">
        {(read('coachNotes', entry.coachNotes) || entry.coachNotes) && (
          <textarea
            value={read('coachNotes', entry.coachNotes)}
            onChange={(e) => write({ coachNotes: e.target.value })}
            rows={1}
            aria-label="Observaciones del entrenador"
            className="block w-full resize-y rounded-lg bg-warning/15 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-accent"
          />
        )}
        <textarea
          value={read('athleteNotes', entry.athleteNotes)}
          onChange={(e) => write({ athleteNotes: e.target.value })}
          rows={1}
          placeholder="Notas (cómo te sentiste, molestias…)"
          aria-label="Notas del atleta"
          className="block w-full resize-y rounded-lg bg-surface-2 px-3 py-2 text-sm placeholder:text-muted/60 focus:outline-none focus:ring-1 focus:ring-accent"
        />
      </div>

      <div className="grid grid-cols-[2rem_1fr_4.25rem_3.25rem_3rem_2.5rem] items-center gap-1.5 px-3 pb-1 text-[11px] font-semibold uppercase tracking-wide text-muted">
        <span className="text-center">Set</span>
        <span>Anterior</span>
        <span className="text-center">{addsBodyweight ? `+${unit}` : unit}</span>
        <span className="text-center">Reps</span>
        <span className="text-center">RPE</span>
        <span className="text-center">✓</span>
      </div>

      <ul>
        {sets.map(([id, set], index) => {
          const p = `sets.${id}`
          const label = set.kind === 'warmup' ? 'W' : String(++working)
          const prev = stats?.lastSets[index]
          const suggestion = liveSuggestion(set, live, ctx)
          const placeholder =
            suggestion?.kind === 'kg'
              ? String(roundForDisplay(suggestion.kg, unit, roundingKg))
              : ''
          const rpeTarget = targetRpe(set.prescription?.load)
          return (
            <li
              key={id}
              className={`grid grid-cols-[2rem_1fr_4.25rem_3.25rem_3rem_2.5rem] items-center gap-1.5 px-3 py-1 transition-colors ${
                set.done ? 'bg-success/15' : ''
              }`}
            >
              <button
                type="button"
                onClick={() => setMenuSet(id)}
                className={`h-8 rounded-md text-sm font-bold ${set.kind === 'warmup' ? 'text-warning' : 'text-text'} hover:bg-surface-2`}
                aria-label={`Opciones de la serie ${label}`}
              >
                {label}
              </button>
              {prev ? (
                // Tocar la marca anterior la copia en esta serie (sin marcarla como hecha)
                <button
                  type="button"
                  onClick={() => write({ [`${p}.weightKg`]: prev.weightKg, [`${p}.reps`]: prev.reps }, true)}
                  className="-mx-1 h-9 truncate rounded-md px-1 text-left text-xs text-muted tabular hover:bg-surface-2 hover:text-text active:bg-surface-2"
                  aria-label={`Usar la marca anterior en la serie ${label}`}
                >
                  {addsBodyweight ? '+' : ''}
                  {Number(kgToUnit(prev.weightKg, unit).toFixed(1))} × {prev.reps}
                </button>
              ) : (
                <span className="text-xs text-muted">—</span>
              )}
              <NumberInput
                value={set.weightKg == null ? null : Number(kgToUnit(set.weightKg, unit).toFixed(2))}
                onChange={(v) => write({ [`${p}.weightKg`]: v == null ? null : unitToKg(v, unit) })}
                placeholder={suggestion?.kind === 'kg' && suggestion.assisted ? 'asist.' : placeholder}
                aria-label={`Peso serie ${label}`}
                className={cellInput}
              />
              <NumberInput
                value={set.reps}
                onChange={(v) => write({ [`${p}.reps`]: v == null ? null : Math.max(0, Math.round(v)) })}
                placeholder={targetRepsLabel(set.prescription?.reps)}
                aria-label={`Repeticiones serie ${label}`}
                inputMode="numeric"
                className={cellInput}
              />
              <NumberInput
                value={set.rpe}
                onChange={(v) => write({ [`${p}.rpe`]: v })}
                placeholder={rpeTarget != null ? String(rpeTarget) : ''}
                aria-label={`RPE serie ${label}`}
                className={cellInput}
              />
              <button
                type="button"
                onClick={() => toggleDone(id, set)}
                aria-label={set.done ? `Desmarcar serie ${label}` : `Completar serie ${label}`}
                aria-pressed={set.done}
                className={`flex h-9 items-center justify-center rounded-md transition-colors ${
                  set.done ? 'bg-success text-bg' : 'bg-surface-2 text-muted hover:text-text'
                }`}
              >
                <Check size={18} strokeWidth={3} />
              </button>
            </li>
          )
        })}
      </ul>

      <div className="flex gap-2 border-t border-border p-2">
        <Button size="sm" variant="ghost" onClick={() => add('working')}>
          <Plus size={14} /> Serie
        </Button>
        <Button size="sm" variant="ghost" onClick={() => add('warmup')}>
          <Plus size={14} /> Calentamiento
        </Button>
      </div>

      {menu && (
        <Sheet open onClose={() => setMenuSet(null)} title="Serie">
          <div className="space-y-4">
            {menu[1].prescription && (
              <p className="flex items-center gap-2 text-sm text-muted">
                <MoreHorizontal size={16} />
                Prescrito: {formatPrescription(1, menu[1].prescription.reps, menu[1].prescription.load)}
              </p>
            )}
            <Segmented
              value={menu[1].kind}
              options={[
                { value: 'warmup', label: 'Calentamiento' },
                { value: 'working', label: 'Efectiva' },
              ]}
              onChange={(kind) => write({ [`sets.${menu[0]}.kind`]: kind }, true)}
            />
            <Button
              variant="danger"
              className="w-full"
              onClick={() => {
                removeSet(athleteId, sessionId, entry.id, menu[0])
                setMenuSet(null)
              }}
            >
              <Trash2 size={16} /> Eliminar serie
            </Button>
          </div>
        </Sheet>
      )}
    </section>
  )
}
