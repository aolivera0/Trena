import { deleteDoc, doc } from 'firebase/firestore'
import { Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useProfile } from '../auth/AuthProvider'
import { useQuery } from '../hooks/useFirestore'
import { movingAverage } from '../lib/bodyweight'
import { bodyweightCol, localDateKey, logBodyweight } from '../lib/db'
import { track } from '../lib/feedback'
import { formatWeight } from '../lib/format'
import { kgToUnit } from '../lib/strength/units'
import { TimeChart } from './charts/TimeChart'
import { Button, Card, EmptyState, IconButton, Input, WeightInput } from './ui'

export function BodyweightPanel({ athleteId, canLog }: { athleteId: string; canLog: boolean }) {
  const { profile } = useProfile()
  const { unit } = profile.prefs
  const q = useMemo(() => bodyweightCol(athleteId), [athleteId])
  const { data } = useQuery<{ kg: number }>(q, `bodyweight:${athleteId}`)
  const [kg, setKg] = useState<number | null>(null)
  const [date, setDate] = useState(localDateKey())

  const points = movingAverage(data.map((d) => ({ date: d.id, kg: d.kg })))
  const latest = points.at(-1)
  const toUnit = (v: number) => Number(kgToUnit(v, unit).toFixed(1))

  function save() {
    if (kg == null || kg <= 0) return
    track(logBodyweight(athleteId, kg, date), 'No se pudo guardar el peso')
    setKg(null)
  }

  return (
    <div className="space-y-4">
      {canLog && (
        <Card className="space-y-3">
          <div className="grid grid-cols-[1fr_9.5rem] gap-2">
            <WeightInput valueKg={kg} onChangeKg={setKg} unit={unit} placeholder="Peso" onKeyDown={(e) => e.key === 'Enter' && save()} />
            <Input type="date" value={date} max={localDateKey()} onChange={(e) => setDate(e.target.value)} aria-label="Fecha" />
          </div>
          <Button variant="primary" className="w-full" onClick={save} disabled={kg == null || kg <= 0}>
            Registrar
          </Button>
        </Card>
      )}

      {points.length === 0 ? (
        <EmptyState>Sin registros de peso corporal.</EmptyState>
      ) : (
        <Card className="space-y-3">
          <div className="flex items-baseline justify-between gap-3">
            <div>
              <p className="text-xs text-muted">Media 8 días</p>
              <p className="text-3xl font-semibold">{formatWeight(latest!.avgKg, unit)}</p>
            </div>
            <p className="text-right text-xs text-muted">
              Último registro
              <span className="block text-sm text-text">{formatWeight(latest!.kg, unit)}</span>
            </p>
          </div>
          <TimeChart
            label="Peso corporal diario y media móvil de 8 días"
            formatY={(v) => String(Number(v.toFixed(1)))}
            series={[
              { name: 'Media 8 días', color: 'var(--color-chart-1)', style: 'line', points: points.map((p) => ({ x: p.time, y: toUnit(p.avgKg) })) },
              { name: 'Registro diario', color: 'var(--color-chart-2)', style: 'dots', points: points.map((p) => ({ x: p.time, y: toUnit(p.kg) })) },
            ]}
          />
        </Card>
      )}

      {points.length > 0 && (
        <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface text-sm">
          {[...points].reverse().slice(0, 30).map((p) => (
            <li key={p.date} className="flex items-center gap-3 px-4 py-2">
              <span className="min-w-0 flex-1 truncate whitespace-nowrap text-muted">
                {new Date(p.time).toLocaleDateString('es', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' })}
              </span>
              <span className="whitespace-nowrap text-right font-medium tabular">{formatWeight(p.kg, unit)}</span>
              <span className="whitespace-nowrap text-right text-xs text-muted tabular">media {formatWeight(p.avgKg, unit)}</span>
              {canLog && (
                <IconButton
                  label="Borrar registro"
                  onClick={() => confirm('¿Borrar este registro?') && track(deleteDoc(doc(bodyweightCol(athleteId), p.date)))}
                >
                  <Trash2 size={14} />
                </IconButton>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
