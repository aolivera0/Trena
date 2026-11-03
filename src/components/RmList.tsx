import { Pencil, Plus } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import { useProfile } from '../auth/AuthProvider'
import { setRm } from '../lib/db'
import { exerciseLabel } from '../lib/exercises'
import { track } from '../lib/feedback'
import { formatAddedWeight, formatWeight } from '../lib/format'
import type { ExerciseRef, RM, WithId } from '../lib/types'
import { ExercisePicker, ExerciseThumb } from './ExercisePicker'
import { draftE1rm, RmInput, type RmDraft } from './RmInput'
import { Badge, Button, EmptyState, IconButton, Sheet } from './ui'

const SOURCE_LABELS: Record<RM['source'], string> = { initial: 'Inicial', manual: 'Manual', pr: 'PR' }

export function RmList({
  athleteId,
  rms,
  bodyweightKg,
  editable,
}: {
  athleteId: string
  rms: WithId<RM>[]
  bodyweightKg: number | null
  editable: boolean
}) {
  const { profile } = useProfile()
  const { unit, e1rmFormula } = profile.prefs
  const [editing, setEditing] = useState<ExerciseRef | null>(null)
  const [draft, setDraft] = useState<RmDraft>({ weightKg: null, reps: 1 })
  const [picking, setPicking] = useState(false)

  const sorted = [...rms].sort((a, b) => exerciseLabel(a.exercise).localeCompare(exerciseLabel(b.exercise), 'es'))
  const e1rm = editing ? draftE1rm(draft, editing.addsBodyweight, bodyweightKg, e1rmFormula) : null

  function open(exercise: ExerciseRef) {
    setDraft({ weightKg: null, reps: 1 })
    setEditing(exercise)
  }

  function save() {
    if (!editing || e1rm == null) return
    track(setRm(athleteId, editing, e1rm), 'No se pudo guardar el RM')
    setEditing(null)
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">RMs vigentes</h2>
        {editable && (
          <Button size="sm" variant="ghost" onClick={() => setPicking(true)}>
            <Plus size={16} /> Agregar
          </Button>
        )}
      </div>

      {sorted.length === 0 ? (
        <EmptyState>Sin RMs registrados.</EmptyState>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
          {sorted.map((rm) => (
            <li key={rm.id} className="flex items-center gap-3 px-4 py-3">
              <ExerciseThumb slug={rm.exercise.slug} size={36} />
              <Link to={`/exercise/${athleteId}/${encodeURIComponent(rm.id)}`} className="min-w-0 flex-1">
                <p className="truncate font-medium">{exerciseLabel(rm.exercise)}</p>
                <p className="text-xs text-muted">
                  {SOURCE_LABELS[rm.source]}
                  {rm.updatedAt && ` · ${rm.updatedAt.toDate().toLocaleDateString('es')}`}
                </p>
              </Link>
              <div className="text-right tabular">
                {/* Con lastre se muestra el lastre; el RM guardado (total) sigue siendo la base de cálculo */}
                {rm.exercise.addsBodyweight && bodyweightKg != null ? (
                  <>
                    <p className="font-semibold">{formatAddedWeight(rm.e1rmKg - bodyweightKg, unit)}</p>
                    <p className="text-xs text-muted">total {formatWeight(rm.e1rmKg, unit)}</p>
                  </>
                ) : (
                  <p className="font-semibold">{formatWeight(rm.e1rmKg, unit)}</p>
                )}
              </div>
              {editable && (
                <IconButton label="Actualizar RM" onClick={() => open(rm.exercise)}>
                  <Pencil size={16} />
                </IconButton>
              )}
            </li>
          ))}
        </ul>
      )}

      {editable && (
        <>
          <ExercisePicker open={picking} onClose={() => setPicking(false)} onPick={open} />
          <Sheet open={editing != null} onClose={() => setEditing(null)} title={editing ? exerciseLabel(editing) : ''}>
            {editing && (
              <div className="space-y-4">
                <RmInput
                  draft={draft}
                  onChange={setDraft}
                  addsBodyweight={editing.addsBodyweight}
                  bodyweightKg={bodyweightKg}
                  unit={unit}
                  formula={e1rmFormula}
                />
                {editing.addsBodyweight && <Badge>Ejercicio con lastre: el RM incluye el peso corporal</Badge>}
                <Button variant="primary" className="w-full" onClick={save} disabled={e1rm == null}>
                  Guardar RM
                </Button>
              </div>
            )}
          </Sheet>
        </>
      )}
    </section>
  )
}
