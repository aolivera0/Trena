import { Award, Clock, Dumbbell, TrendingUp } from 'lucide-react'
import type { ReactNode } from 'react'
import { useNavigate } from 'react-router'
import { useProfile } from '../../auth/AuthProvider'
import { formatClock } from '../../hooks/useNow'
import { formatWeight } from '../../lib/format'
import type { PrType, Session, SessionSummary } from '../../lib/types'
import { Button, Card } from '../ui'

const PR_LABELS: Record<PrType, string> = {
  weight: 'Carga máxima',
  volume: 'Volumen por serie',
  e1rm: '1RM estimado',
}

export function SessionSummaryView({ session, summary, backTo }: { session: Session; summary: SessionSummary; backTo: string }) {
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
