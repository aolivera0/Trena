import { query, where } from 'firebase/firestore'
import { ArrowLeft } from 'lucide-react'
import { useMemo } from 'react'
import { Link, Navigate, useParams } from 'react-router'
import { useProfile } from '../auth/AuthProvider'
import { Histogram } from '../components/charts/Histogram'
import { TimeChart } from '../components/charts/TimeChart'
import { Card, EmptyState, FullScreenSpinner } from '../components/ui'
import { useAthlete } from '../hooks/useAthlete'
import { useQuery } from '../hooks/useFirestore'
import { exerciseImageUrl } from '../lib/exercises'
import { formatAddedWeight, formatWeight } from '../lib/format'
import { exerciseLogsCol } from '../lib/sessionDb'
import { FORMULA_LABELS } from '../lib/strength/e1rm'
import { kgToUnit, roundingStep } from '../lib/strength/units'
import type { ExerciseLog } from '../lib/types'

// Detalle de un ejercicio (R-4): historial numérico con e1RM, tendencia e histograma
export function ExercisePage() {
  const { athleteId = '', exerciseId: rawId = '' } = useParams()
  const exerciseId = decodeURIComponent(rawId)
  const { profile } = useProfile()
  const { unit, roundingKg } = profile.prefs
  const { athlete, rmById, isSelf, isCoach, loading } = useAthlete(athleteId)
  const q = useMemo(() => query(exerciseLogsCol(athleteId), where('exerciseId', '==', exerciseId)), [athleteId, exerciseId])
  const { data: rawLogs, loading: logsLoading } = useQuery<ExerciseLog>(q, `logs:${athleteId}:${exerciseId}`)

  if (loading || logsLoading) return <FullScreenSpinner />
  if (!athlete || (!isSelf && !isCoach)) return <Navigate to="/" replace />

  const logs = [...rawLogs].sort((a, b) => a.date - b.date)
  const exercise = logs[0]?.exercise ?? rmById.get(exerciseId)?.exercise
  const rm = rmById.get(exerciseId)
  const addsBw = exercise?.addsBodyweight ?? false
  const bw = athlete.bodyweightKg ?? 0
  const toUnit = (kg: number) => Number(kgToUnit(kg, unit).toFixed(1))
  const backTo = isSelf ? '/history' : `/athlete/${athleteId}/history`

  // Histograma: cargas de las series efectivas (lastre en ejercicios con peso corporal)
  const workingLoads = logs.flatMap((l) => l.sets.filter((s) => s.kind === 'working').map((s) => toUnit(s.weightKg)))
  const span = workingLoads.length ? Math.max(...workingLoads) - Math.min(...workingLoads) : 0
  const step = roundingStep(roundingKg, unit)
  const binSize = Math.max(step, Math.ceil(span / 10 / step) * step)

  // Un punto por día (el mejor e1RM si hubo varias sesiones ese día)
  const byDay = new Map<string, { x: number; y: number }>()
  for (const l of logs) {
    if (l.bestE1rmKg == null) continue
    const key = new Date(l.date).toDateString()
    const y = toUnit(l.bestE1rmKg)
    const prev = byDay.get(key)
    if (!prev || y > prev.y) byDay.set(key, { x: l.date, y })
  }
  const trend = [...byDay.values()].sort((a, b) => a.x - b.x)

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <Link to={backTo} aria-label="Volver" className="-ml-2 flex size-9 items-center justify-center rounded-lg text-muted hover:text-text">
          <ArrowLeft size={20} />
        </Link>
        <div className="min-w-0">
          <h1 className="truncate text-xl font-bold">{exercise?.name ?? 'Ejercicio'}</h1>
          {exercise?.variant && <p className="truncate text-sm text-muted">{exercise.variant}</p>}
        </div>
      </div>

      {exercise?.slug && exerciseImageUrl(exercise.slug) && (
        <div className="grid grid-cols-3 gap-2">
          {([1, 2, 3] as const).map((f) => (
            <img key={f} src={exerciseImageUrl(exercise.slug, f)!} alt="" loading="lazy" className="aspect-square w-full rounded-xl bg-surface-2 object-contain" />
          ))}
        </div>
      )}

      {rm && (
        <Card className="flex items-center justify-between">
          <span className="text-sm text-muted">RM vigente</span>
          <span className="text-right">
            <span className="block text-2xl font-semibold">
              {addsBw ? formatAddedWeight(rm.e1rmKg - bw, unit) : formatWeight(rm.e1rmKg, unit)}
            </span>
            {addsBw && <span className="text-xs text-muted">total {formatWeight(rm.e1rmKg, unit)}</span>}
          </span>
        </Card>
      )}

      {logs.length === 0 ? (
        <EmptyState>Aún no hay sesiones terminadas con este ejercicio.</EmptyState>
      ) : (
        <>
          {trend.length > 0 && (
            <Card className="space-y-2">
              <h2 className="font-semibold">1RM estimado</h2>
              <p className="text-xs text-muted">
                Mejor serie de cada sesión{addsBw ? ' (carga total con peso corporal)' : ''}. Tabla RPE si hay RPE; si no,{' '}
                {FORMULA_LABELS[athlete.prefs.e1rmFormula]}.
              </p>
              <TimeChart
                label={`Tendencia del 1RM estimado de ${exercise?.name}`}
                formatY={(v) => String(Number(v.toFixed(1)))}
                series={[{ name: 'e1RM', color: 'var(--color-chart-1)', style: 'line+dots', points: trend }]}
              />
            </Card>
          )}

          {workingLoads.length > 0 && (
            <Card className="space-y-2">
              <h2 className="font-semibold">Distribución de cargas</h2>
              <p className="text-xs text-muted">
                Series efectivas por rango de {addsBw ? 'lastre' : 'peso'} ({unit})
              </p>
              <Histogram values={workingLoads} binSize={binSize} unit={unit} label={`Distribución de cargas de ${exercise?.name}`} />
            </Card>
          )}

          <section className="space-y-3">
            <h2 className="font-semibold">Historial</h2>
            <ul className="space-y-2">
              {[...logs].reverse().map((log) => (
                <li key={log.id}>
                  <Card className="!p-3">
                    <Link to={`/session/${athleteId}/${log.sessionId}`} className="mb-2 flex items-baseline justify-between gap-3">
                      <span className="text-sm font-medium">
                        {new Date(log.date).toLocaleDateString('es', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                      {log.bestE1rmKg != null && (
                        <span className="text-xs text-muted">
                          e1RM <span className="font-semibold text-text tabular">{formatWeight(log.bestE1rmKg, unit)}</span>
                        </span>
                      )}
                    </Link>
                    <table className="w-full text-sm tabular">
                      <tbody>
                        {log.sets.map((s, i) => (
                          <tr key={i} className="text-muted">
                            <td className={`w-6 py-0.5 font-bold ${s.kind === 'warmup' ? 'text-warning' : 'text-text'}`}>
                              {s.kind === 'warmup' ? 'W' : ''}
                            </td>
                            <td className="py-0.5 text-text">
                              {addsBw ? formatAddedWeight(s.weightKg, unit) : formatWeight(s.weightKg, unit)} × {s.reps}
                              {s.rpe != null && <span className="text-muted"> @ {s.rpe}</span>}
                            </td>
                            <td className="py-0.5 text-right text-xs">{s.e1rmKg != null && `e1RM ${formatWeight(s.e1rmKg, unit)}`}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </Card>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </div>
  )
}
