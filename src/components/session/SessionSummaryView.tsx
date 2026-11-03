import { Award, Clock, Dumbbell, TrendingUp } from 'lucide-react'
import type { ReactNode } from 'react'
import { useNavigate } from 'react-router'
import { useProfile } from '../../auth/AuthProvider'
import { formatClock } from '../../hooks/useNow'
import { formatWeight } from '../../lib/format'
import { exerciseLabel } from '../../lib/exercises'
import { sortedSets, type EntryWithId } from '../../lib/session'
import { formatLoad, formatReps } from '../../lib/strength/prescription'
import type { Unit } from '../../lib/strength/units'
import type { PrType, Session, SessionSummary } from '../../lib/types'
import { Button, Card } from '../ui'

const PR_LABELS: Record<PrType, string> = {
  weight: 'Carga máxima',
  volume: 'Volumen por serie',
  e1rm: '1RM estimado',
}

export function SessionSummaryView({
  session,
  summary,
  entries,
  backTo,
}: {
  session: Session
  summary: SessionSummary
  entries: EntryWithId[]
  backTo: string
}) {
  const { profile } = useProfile()
  const { unit } = profile.prefs
  const navigate = useNavigate()
  const tonnage = Math.round(summary.tonnageKg * (unit === 'lb' ? 2.2046226218 : 1))

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm text-muted">Entrenamiento terminado</p>
        <h1 className="text-2xl font-bold">{session.name}</h1>
        {session.finishedAt && (
          <p className="text-sm text-muted">
            {new Date(session.finishedAt).toLocaleString('es', { dateStyle: 'full', timeStyle: 'short' })}
          </p>
        )}
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Stat icon={<Dumbbell size={18} />} label="Tonelaje" value={`${tonnage.toLocaleString('es')} ${unit}`} />
        <Stat icon={<Clock size={18} />} label="Duración" value={formatClock(summary.durationSec)} />
        <Stat icon={<TrendingUp size={18} />} label="Series" value={String(summary.setsDone)} />
      </div>

      <Card className="space-y-3">
        <h2 className="flex items-center gap-2 font-semibold">
          <Award size={18} className="text-warning" /> Récords personales
        </h2>
        {summary.prs.length === 0 ? (
          <p className="text-sm text-muted">Sin PRs esta vez.</p>
        ) : (
          <ul className="space-y-2">
            {summary.prs.map((pr, i) => (
              <li key={i} className="flex items-center justify-between gap-3 text-sm">
                <span className="min-w-0">
                  <span className="block truncate font-medium">{pr.exerciseName}</span>
                  <span className="text-xs text-muted">{PR_LABELS[pr.type]}</span>
                </span>
                <span className="text-right tabular">
                  <span className="block font-semibold text-success">
                    {formatWeight(pr.valueKg, unit)}
                    {pr.type === 'weight' && ` × ${pr.reps}`}
                  </span>
                  {pr.previousKg != null && <span className="text-xs text-muted">antes {formatWeight(pr.previousKg, unit)}</span>}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {summary.rmUpdates.length > 0 && (
        <Card className="space-y-2">
          <h2 className="font-semibold">RMs actualizados</h2>
          <ul className="space-y-1 text-sm">
            {summary.rmUpdates.map((rm) => (
              <li key={rm.exerciseId} className="flex justify-between gap-3">
                <span className="truncate">{rm.exerciseName}</span>
                <span className="tabular text-muted">
                  {rm.previousKg != null && `${formatWeight(rm.previousKg, unit)} → `}
                  <span className="font-semibold text-text">{formatWeight(rm.e1rmKg, unit)}</span>
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {entries.length > 0 && (
        <section className="space-y-3">
          <h2 className="font-semibold">Prescrito vs hecho</h2>
          {entries.map((e) => (
            <PlannedVsDone key={e.id} entry={e} unit={unit} />
          ))}
        </section>
      )}

      <Button variant="primary" className="w-full" onClick={() => navigate(backTo)}>
        Listo
      </Button>
    </div>
  )
}

function Stat({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-3 text-center">
      <div className="mb-1 flex justify-center text-accent">{icon}</div>
      <p className="text-lg font-bold tabular">{value}</p>
      <p className="text-[11px] uppercase tracking-wide text-muted">{label}</p>
    </div>
  )
}

function PlannedVsDone({ entry, unit }: { entry: EntryWithId; unit: Unit }) {
  const addsBw = entry.exercise.addsBodyweight
  let working = 0
  return (
    <Card className="!p-3">
      <p className="mb-2 truncate text-sm font-medium text-accent">{exerciseLabel(entry.exercise)}</p>
      <table className="w-full text-sm tabular">
        <thead>
          <tr className="text-[11px] uppercase tracking-wide text-muted">
            <th className="w-8 pb-1 text-left font-semibold">Set</th>
            <th className="pb-1 text-left font-semibold">Prescrito</th>
            <th className="pb-1 text-right font-semibold">Hecho</th>
          </tr>
        </thead>
        <tbody>
          {sortedSets(entry).map(([id, s]) => (
            <tr key={id} className="border-t border-border">
              <td className={`py-1 font-bold ${s.kind === 'warmup' ? 'text-warning' : ''}`}>
                {s.kind === 'warmup' ? 'W' : ++working}
              </td>
              <td className="py-1 text-muted">
                {s.prescription ? `${formatReps(s.prescription.reps)} @ ${formatLoad(s.prescription.load)}` : 'Extra'}
              </td>
              <td className="py-1 text-right">
                {s.done && s.weightKg != null && s.reps != null ? (
                  <>
                    {addsBw ? '+' : ''}
                    {formatWeight(s.weightKg, unit)} × {s.reps}
                    {s.rpe != null && <span className="text-muted"> @ {s.rpe}</span>}
                  </>
                ) : (
                  <span className="text-muted">No hecha</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  )
}
