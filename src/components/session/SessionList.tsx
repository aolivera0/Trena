import { limit, orderBy, query } from 'firebase/firestore'
import { ChevronRight, Radio } from 'lucide-react'
import { useMemo } from 'react'
import { Link } from 'react-router'
import { useProfile } from '../../auth/AuthProvider'
import { useQuery } from '../../hooks/useFirestore'
import { formatClock } from '../../hooks/useNow'
import { sessionsCol } from '../../lib/sessionDb'
import type { Session } from '../../lib/types'
import { Badge, EmptyState, Spinner } from '../ui'

export function useRecentSessions(athleteId: string, max = 20) {
  const q = useMemo(() => query(sessionsCol(athleteId), orderBy('startedAt', 'desc'), limit(max)), [athleteId, max])
  return useQuery<Session>(q, `sessions:${athleteId}:${max}`)
}

export function SessionList({ athleteId, title = 'Sesiones', max = 10 }: { athleteId: string; title?: string; max?: number }) {
  const { profile } = useProfile()
  const { data: sessions, loading } = useRecentSessions(athleteId, max)
  const unit = profile.prefs.unit

  return (
    <section className="space-y-3">
      <h2 className="font-semibold">{title}</h2>
      {loading ? (
        <Spinner />
      ) : sessions.length === 0 ? (
        <EmptyState>Sin sesiones todavía.</EmptyState>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
          {sessions.map((s) => (
            <li key={s.id}>
              <Link to={`/session/${athleteId}/${s.id}`} className="flex items-center gap-3 p-4 hover:bg-surface-2">
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{s.name}</span>
                  <span className="block truncate text-xs text-muted">
                    {new Date(s.startedAt).toLocaleDateString('es', { weekday: 'short', day: 'numeric', month: 'short' })}
                    {s.summary &&
                      ` · ${formatClock(s.summary.durationSec)} · ${Math.round(
                        s.summary.tonnageKg * (unit === 'lb' ? 2.2046226218 : 1),
                      ).toLocaleString('es')} ${unit}`}
                  </span>
                </span>
                {s.status === 'IN_PROGRESS' ? (
                  <Badge tone="accent">
                    <Radio size={12} /> En curso
                  </Badge>
                ) : (
                  s.summary && s.summary.prs.length > 0 && <Badge tone="success">{s.summary.prs.length} PR</Badge>
                )}
                <ChevronRight size={18} className="text-muted" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
