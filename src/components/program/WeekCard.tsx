import { ChevronDown, Copy, Eye, EyeOff, Play, Plus, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { useDebouncedWeek } from '../../hooks/useDebouncedWeek'
import { deleteWeek, duplicateWeek, saveWeek, setWeekStatus } from '../../lib/db'
import { track } from '../../lib/feedback'
import { move, newDay, newProgramExercise } from '../../lib/program'
import type { Day, ExerciseRef, ProgramExercise, RM, Week, WithId } from '../../lib/types'
import { ExercisePicker } from '../ExercisePicker'
import { Badge, Button, EmptyState, IconButton, Input } from '../ui'
import { ExerciseBlock } from './ExerciseBlock'

export function WeekCard({
  athleteId,
  programId,
  week,
  canEdit,
  rmById,
  bodyweightKg,
  nextIndex,
  defaultOpen,
  onStartDay,
}: {
  athleteId: string
  programId: string
  week: WithId<Week>
  canEdit: boolean
  rmById: Map<string, WithId<RM>>
  bodyweightKg: number
  nextIndex: number
  defaultOpen: boolean
  // Solo para el propio atleta: inicia una sesión con este día como plantilla
  onStartDay?: (week: WithId<Week>, day: Day) => void
}) {
  const [open, setOpen] = useState(defaultOpen)
  const [days, setDays] = useDebouncedWeek(athleteId, programId, week.id, week.days)
  const [dayIndex, setDayIndex] = useState(0)
  const [picking, setPicking] = useState(false)
  const [name, setName] = useState(week.name)

  const published = week.status === 'PUBLISHED'
  const day: Day | undefined = days[Math.min(dayIndex, days.length - 1)]

  const updateDay = (patch: Partial<Day>) =>
    setDays((ds) => ds.map((d) => (d.id === day?.id ? { ...d, ...patch } : d)))
  const updateExercises = (fn: (list: ProgramExercise[]) => ProgramExercise[]) =>
    setDays((ds) => ds.map((d) => (d.id === day?.id ? { ...d, exercises: fn(d.exercises) } : d)))

  function addDay() {
    setDays((ds) => [...ds, newDay(ds.length + 1)])
    setDayIndex(days.length)
  }

  function removeDay() {
    if (!day || !confirm(`¿Eliminar ${day.name} y sus ejercicios?`)) return
    setDays((ds) => ds.filter((d) => d.id !== day.id))
    setDayIndex(Math.max(0, dayIndex - 1))
  }

  function addExercise(ref: ExerciseRef) {
    updateExercises((list) => [...list, newProgramExercise(ref)])
  }

  function togglePublish() {
    track(setWeekStatus(athleteId, programId, week.id, !published), 'No se pudo cambiar el estado')
  }

  function duplicate() {
    track(duplicateWeek(athleteId, programId, { ...week, days }, nextIndex), 'No se pudo duplicar')
  }

  function remove() {
    if (confirm(`¿Eliminar ${week.name}? No se puede deshacer.`)) {
      track(deleteWeek(athleteId, programId, week.id), 'No se pudo eliminar')
    }
  }

  return (
    <section className="overflow-hidden rounded-xl border border-border bg-bg">
      <header className="bg-surface px-3 py-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setOpen(!open)}
            className="flex min-w-0 flex-1 items-center gap-2 py-1 text-left"
            aria-expanded={open}
          >
            <ChevronDown size={18} className={`shrink-0 text-muted transition-transform ${open ? '' : '-rotate-90'}`} />
            <span className="truncate font-semibold">{week.name}</span>
            {canEdit && (published ? <Badge tone="success">Publicada</Badge> : <Badge tone="warning">Borrador</Badge>)}
          </button>
          {canEdit && (
            <Button size="sm" variant={published ? 'secondary' : 'primary'} onClick={togglePublish}>
              {published ? <EyeOff size={14} /> : <Eye size={14} />}
              {published ? 'Ocultar' : 'Publicar'}
            </Button>
          )}
        </div>
        {canEdit && open && (
          <div className="mt-2 flex items-center gap-2">
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={() => name.trim() && name !== week.name && track(saveWeek(athleteId, programId, week.id, { name: name.trim() }))}
              aria-label="Nombre de la semana"
              className="!h-9 flex-1 text-sm"
            />
            <IconButton label="Duplicar semana" onClick={duplicate}>
              <Copy size={16} />
            </IconButton>
            <IconButton label="Eliminar semana" onClick={remove}>
              <Trash2 size={16} />
            </IconButton>
          </div>
        )}
      </header>

      {open && (
        <div className="space-y-4 p-3">
          <div className="-mx-3 flex gap-2 overflow-x-auto px-3 pb-1">
            {days.map((d, i) => (
              <button
                key={d.id}
                type="button"
                onClick={() => setDayIndex(i)}
                className={`h-9 shrink-0 rounded-full px-4 text-sm font-medium ${
                  d.id === day?.id ? 'bg-accent text-bg' : 'bg-surface-2 text-muted hover:text-text'
                }`}
              >
                {d.name || `Día ${i + 1}`}
              </button>
            ))}
            {canEdit && (
              <button
                type="button"
                onClick={addDay}
                className="flex h-9 shrink-0 items-center gap-1 rounded-full border border-dashed border-border px-3 text-sm text-muted hover:text-text"
              >
                <Plus size={14} /> Día
              </button>
            )}
          </div>

          {!day ? (
            <EmptyState>Esta semana no tiene días.</EmptyState>
          ) : (
            <div className="space-y-3">
              {canEdit ? (
                <div className="flex gap-2">
                  <Input
                    value={day.name}
                    onChange={(e) => updateDay({ name: e.target.value })}
                    aria-label="Nombre del día"
                    className="!h-9 text-sm"
                  />
                  <IconButton label="Eliminar día" onClick={removeDay}>
                    <Trash2 size={16} />
                  </IconButton>
                </div>
              ) : null}
              {canEdit ? (
                <textarea
                  value={day.notes}
                  onChange={(e) => updateDay({ notes: e.target.value })}
                  placeholder="Notas del día (opcional)"
                  rows={1}
                  className="block w-full resize-y rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm placeholder:text-muted/60 focus:border-accent focus:outline-none"
                />
              ) : (
                day.notes && <p className="whitespace-pre-wrap text-sm text-muted">{day.notes}</p>
              )}

              {day.exercises.map((ex, i) => (
                <ExerciseBlock
                  key={ex.id}
                  exercise={ex}
                  ctx={{ rmKg: rmById.get(ex.exercise.id)?.e1rmKg ?? null, bodyweightKg }}
                  canEdit={canEdit}
                  onChange={(next) => updateExercises((list) => list.map((e) => (e.id === ex.id ? next : e)))}
                  onMove={(delta) => updateExercises((list) => move(list, i, i + delta))}
                  onDelete={() => updateExercises((list) => list.filter((e) => e.id !== ex.id))}
                  isFirst={i === 0}
                  isLast={i === day.exercises.length - 1}
                />
              ))}
              {day.exercises.length === 0 && !canEdit && <EmptyState>Día sin ejercicios.</EmptyState>}

              {onStartDay && day.exercises.length > 0 && (
                <Button variant="primary" className="w-full" onClick={() => onStartDay({ ...week, days }, day)}>
                  <Play size={16} /> Empezar {day.name}
                </Button>
              )}

              {canEdit && (
                <Button className="w-full" onClick={() => setPicking(true)}>
                  <Plus size={16} /> Agregar ejercicio
                </Button>
              )}
            </div>
          )}
        </div>
      )}

      {canEdit && <ExercisePicker athleteId={athleteId} open={picking} onClose={() => setPicking(false)} onPick={addExercise} />}
    </section>
  )
}
