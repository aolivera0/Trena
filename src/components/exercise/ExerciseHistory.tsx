import { query, where } from 'firebase/firestore'
import { useMemo, type ReactNode } from 'react'
import { Link } from 'react-router'
import { useProfile } from '../../auth/AuthProvider'
import { useQuery } from '../../hooks/useFirestore'
import { formatAddedWeight, formatWeight } from '../../lib/format'
import { exerciseLogsCol } from '../../lib/sessionDb'
import { FORMULA_LABELS, type E1rmFormula } from '../../lib/strength/e1rm'
import { kgToUnit, roundingStep } from '../../lib/strength/units'
import type { ExerciseLog, ExerciseStats, RM } from '../../lib/types'
import { Histogram } from '../charts/Histogram'
import { TimeChart } from '../charts/TimeChart'
import { Card, EmptyState, Spinner } from '../ui'

// Historial de un ejercicio (R-4): récords, tendencia de e1RM, distribución de
// cargas y ejecuciones pasadas. Se usa en la página del ejercicio y en el
// modal de la sesión.
export function ExerciseHistory({
  athleteId,
  exerciseId,
  addsBodyweight,
  bodyweightKg,
  formula,
  rm,
  stats,
  excludeSessionId,
}: {
  athleteId: string
  exerciseId: string
  addsBodyweight: boolean
  bodyweightKg: number
  formula: E1rmFormula
  rm: RM | undefined
  stats: ExerciseStats | undefined
  excludeSessionId?: string // la sesión en curso no es "historial"
}) {
  const { profile } = useProfile()
  const { unit, roundingKg } = profile.prefs
  const q = useMemo(() => query(exerciseLogsCol(athleteId), where('exerciseId', '==', exerciseId)), [athleteId, exerciseId])
  const { data: rawLogs, loading } = useQuery<ExerciseLog>(q, `logs:${athleteId}:${exerciseId}`)

  const logs = rawLogs.filter((l) => l.sessionId !== excludeSessionId).sort((a, b) => a.date - b.date)
  const toUnit = (kg: number) => Number(kgToUnit(kg, unit).toFixed(1))
  // Con lastre se muestra el lastre; el total (con peso corporal) va aparte
  const show = (totalKg: number) => (addsBodyweight ? formatAddedWeight(totalKg - bodyweightKg, unit) : formatWeight(totalKg, unit))

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
    <div className="space-y-4">
      {(rm || stats) && (
        <div className="grid grid-cols-2 gap-2">
          {rm && <Record label="RM vigente" value={show(rm.e1rmKg)} sub={addsBodyweight ? `total ${formatWeight(rm.e1rmKg, unit)}` : undefined} />}
          {stats?.timesDone != null && <Record label="Veces realizado" value={String(stats.timesDone)} />}
          {stats && (
            <>
              <Record label="Carga máxima" value={show(stats.bestWeightKg)} />
              <Record label="Mejor e1RM" value={show(stats.bestE1rmKg)} />
              <Record label="Mejor volumen por serie" value={`${Math.round(kgToUnit(stats.bestSetVolumeKg, unit)).toLocaleString('es')} ${unit}`} />
              <Record
                label="Última vez"
                value={new Date(stats.lastDate).toLocaleDateString('es', { day: 'numeric', month: 'short' })}
              />
            </>
          )}
        </div>
      )}

      {loading ? (
        <Spinner />
      ) : logs.length === 0 ? (
        <EmptyState>Aún no hay sesiones terminadas con este ejercicio.</EmptyState>
      ) : (
        <>
          {trend.length > 0 && (
            <Card className="space-y-2">
              <h3 className="font-semibold">1RM estimado</h3>
              <p className="text-xs text-muted">
                Mejor serie de cada sesión{addsBodyweight ? ' (carga total con peso corporal)' : ''}. Tabla RPE si hay RPE; si no,{' '}
                {FORMULA_LABELS[formula]}.
              </p>
              <TimeChart
                label="Tendencia del 1RM estimado"
                formatY={(v) => String(Number(v.toFixed(1)))}
                series={[{ name: 'e1RM', color: 'var(--color-chart-1)', style: 'line+dots', points: trend }]}
              />
            </Card>
          )}

          {workingLoads.length > 0 && (
            <Card className="space-y-2">
              <h3 className="font-semibold">Distribución de cargas</h3>
              <p className="text-xs text-muted">
                Series efectivas por rango de {addsBodyweight ? 'lastre' : 'peso'} ({unit})
              </p>
              <Histogram values={workingLoads} binSize={binSize} unit={unit} label="Distribución de cargas" />
            </Card>
          )}

          <section className="space-y-2">
            <h3 className="font-semibold">Entrenamientos anteriores</h3>
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
                              {addsBodyweight ? formatAddedWeight(s.weightKg, unit) : formatWeight(s.weightKg, unit)} × {s.reps}
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

function Record({ label, value, sub }: { label: string; value: ReactNode; sub?: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-3">
      <p className="text-[11px] uppercase tracking-wide text-muted">{label}</p>
      <p className="text-lg font-semibold">{value}</p>
      {sub && <p className="text-xs text-muted">{sub}</p>}
    </div>
  )
}
