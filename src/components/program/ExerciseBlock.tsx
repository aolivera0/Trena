import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { exerciseLabel } from '../../lib/exercises'
import { formatRest } from '../../lib/format'
import { groupSuggestion, newSetGroup, type AthleteContext } from '../../lib/program'
import { formatPrescription } from '../../lib/strength/prescription'
import type { ProgramExercise, SetGroup } from '../../lib/types'
import { ExerciseThumb } from '../ExercisePicker'
import { Button, IconButton } from '../ui'
import { SetGroupSheet } from './SetGroupSheet'
import { SuggestionText } from './SuggestionText'

export function ExerciseBlock({
  exercise,
  ctx,
  canEdit,
  onChange,
  onMove,
  onDelete,
  isFirst,
  isLast,
}: {
  exercise: ProgramExercise
  ctx: AthleteContext
  canEdit: boolean
  onChange: (exercise: ProgramExercise) => void
  onMove: (delta: -1 | 1) => void
  onDelete: () => void
  isFirst: boolean
  isLast: boolean
}) {
  const [editing, setEditing] = useState<SetGroup | null>(null)

  function addGroup(kind: SetGroup['kind']) {
    const group = newSetGroup(kind)
    // Calentamientos antes de las series efectivas
    const setGroups =
      kind === 'warmup'
        ? [...exercise.setGroups.filter((g) => g.kind === 'warmup'), group, ...exercise.setGroups.filter((g) => g.kind !== 'warmup')]
        : [...exercise.setGroups, group]
    onChange({ ...exercise, setGroups })
    setEditing(group)
  }

  function saveGroup(group: SetGroup) {
    onChange({ ...exercise, setGroups: exercise.setGroups.map((g) => (g.id === group.id ? group : g)) })
    setEditing(null)
  }

  function deleteGroup(id: string) {
    // Las series que dependían de este top set quedan sin referencia
    const setGroups = exercise.setGroups
      .filter((g) => g.id !== id)
      .map((g) => (g.load.type === 'pctTopSet' && g.load.refSetGroupId === id ? { ...g, load: { ...g.load, refSetGroupId: '' } } : g))
    onChange({ ...exercise, setGroups })
    setEditing(null)
  }

  let workingIndex = 0

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface">
      <div className="flex items-center gap-3 p-3">
        <ExerciseThumb slug={exercise.exercise.slug} size={44} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-accent">{exercise.exercise.name}</p>
          {exercise.exercise.variant && <p className="truncate text-sm text-muted">{exercise.exercise.variant}</p>}
        </div>
        {canEdit && (
          <div className="flex shrink-0">
            <IconButton label="Subir" onClick={() => onMove(-1)} disabled={isFirst}>
              <ArrowUp size={16} />
            </IconButton>
            <IconButton label="Bajar" onClick={() => onMove(1)} disabled={isLast}>
              <ArrowDown size={16} />
            </IconButton>
            <IconButton
              label="Quitar ejercicio"
              onClick={() => confirm(`¿Quitar ${exerciseLabel(exercise.exercise)}?`) && onDelete()}
            >
              <Trash2 size={16} />
            </IconButton>
          </div>
        )}
      </div>

      {canEdit ? (
        <textarea
          value={exercise.coachNotes}
          onChange={(e) => onChange({ ...exercise, coachNotes: e.target.value })}
          placeholder="Observaciones (técnica, señales, objetivos…)"
          rows={exercise.coachNotes ? 2 : 1}
          className="mx-3 mb-2 block w-[calc(100%-1.5rem)] resize-y rounded-lg border border-border bg-warning/10 px-3 py-2 text-sm placeholder:text-muted/60 focus:border-accent focus:outline-none"
        />
      ) : (
        exercise.coachNotes && (
          <p className="mx-3 mb-2 whitespace-pre-wrap rounded-lg bg-warning/10 px-3 py-2 text-sm">{exercise.coachNotes}</p>
        )
      )}

      <ul className="border-t border-border">
        {exercise.setGroups.map((g) => {
          const label = g.kind === 'warmup' ? 'W' : String(++workingIndex)
          const content = (
            <>
              <span
                className={`flex size-7 shrink-0 items-center justify-center rounded-md text-xs font-bold ${
                  g.kind === 'warmup' ? 'bg-warning/15 text-warning' : 'bg-surface-2 text-text'
                }`}
              >
                {label}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium tabular">{formatPrescription(g.count, g.reps, g.load)}</span>
                <span className="flex flex-wrap gap-x-3">
                  <SuggestionText suggestion={groupSuggestion(g, exercise, ctx)} addsBodyweight={exercise.exercise.addsBodyweight} />
                  <span className="text-xs text-muted">Descanso {formatRest(g.restSec)}</span>
                </span>
              </span>
            </>
          )
          return (
            <li key={g.id} className="border-b border-border last:border-b-0">
              {canEdit ? (
                <button type="button" onClick={() => setEditing(g)} className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-surface-2">
                  {content}
                </button>
              ) : (
                <div className="flex items-center gap-3 px-3 py-2.5">{content}</div>
              )}
            </li>
          )
        })}
        {exercise.setGroups.length === 0 && <li className="px-3 py-2.5 text-sm text-muted">Sin series.</li>}
      </ul>

      {canEdit && (
        <div className="flex gap-2 border-t border-border p-2">
          <Button size="sm" variant="ghost" onClick={() => addGroup('warmup')}>
            <Plus size={14} /> Calentamiento
          </Button>
          <Button size="sm" variant="ghost" onClick={() => addGroup('working')}>
            <Plus size={14} /> Series
          </Button>
        </div>
      )}

      {editing && (
        <SetGroupSheet
          key={editing.id}
          group={editing}
        exercise={exercise}
        ctx={ctx}
        onSave={saveGroup}
        onDelete={deleteGroup}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  )
}
