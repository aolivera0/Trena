import { useState, type KeyboardEvent, type PointerEvent } from 'react'
import { linear, niceTicks, shortDate, useWidth } from './scale'

export type TimeSeries = {
  name: string
  color: string // var(--color-chart-n)
  points: { x: number; y: number }[]
  style: 'line' | 'dots' | 'line+dots'
}

const PAD = { top: 12, right: 52, bottom: 24, left: 40 }
const SURFACE = 'var(--color-surface)'

// Gráfica temporal con eje X proporcional al tiempo: los días sin datos
// quedan como espacio, sin cortar la línea. Crosshair + tooltip al pasar el
// dedo o el mouse, y flechas del teclado con foco.
export function TimeChart({
  series,
  formatY,
  height = 200,
  label,
}: {
  series: TimeSeries[]
  formatY: (v: number) => string
  height?: number
  label: string
}) {
  const [ref, width] = useWidth<HTMLDivElement>()
  const [active, setActive] = useState<number | null>(null)

  const all = series.flatMap((s) => s.points)
  const xs = [...new Set(all.map((p) => p.x))].sort((a, b) => a - b)
  if (!xs.length) return null

  const ys = all.map((p) => p.y)
  const yTicks = niceTicks(Math.min(...ys), Math.max(...ys))
  const x0 = xs[0]
  const x1 = xs.length > 1 ? xs.at(-1)! : xs[0] + 86_400_000
  const innerW = Math.max(0, width - PAD.left - PAD.right)
  const sx = linear(x0, x1, PAD.left, PAD.left + innerW)
  const sy = linear(yTicks[0], yTicks.at(-1)!, height - PAD.bottom, PAD.top)

  // 2–4 fechas en el eje X según el ancho
  const xTickCount = Math.min(xs.length, innerW > 280 ? 4 : 2)
  const xTicks = xTickCount < 2 ? [x0] : Array.from({ length: xTickCount }, (_, i) => x0 + ((x1 - x0) * i) / (xTickCount - 1))

  const activeX = active != null ? xs[active] : null
  const first = series[0]
  const last = first.points.at(-1)

  function nearest(clientX: number, rect: DOMRect) {
    const x = clientX - rect.left
    let best = 0
    xs.forEach((v, i) => {
      if (Math.abs(sx(v) - x) < Math.abs(sx(xs[best]) - x)) best = i
    })
    setActive(best)
  }

  function onKey(e: KeyboardEvent) {
    if (e.key === 'ArrowRight') setActive((i) => Math.min(xs.length - 1, (i ?? -1) + 1))
    else if (e.key === 'ArrowLeft') setActive((i) => Math.max(0, (i ?? xs.length) - 1))
    else if (e.key === 'Escape') setActive(null)
    else return
    e.preventDefault()
  }

  return (
    <div className="space-y-2">
      {series.length > 1 && (
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
          {series.map((s) => (
            <li key={s.name} className="flex items-center gap-1.5">
              {s.style === 'dots' ? (
                <svg width="10" height="10" aria-hidden>
                  <circle cx="5" cy="5" r="4" fill={s.color} />
                </svg>
              ) : (
                <svg width="16" height="10" aria-hidden>
                  <line x1="1" y1="5" x2="15" y2="5" stroke={s.color} strokeWidth="2" strokeLinecap="round" />
                </svg>
              )}
              {s.name}
            </li>
          ))}
        </ul>
      )}

      <div ref={ref} className="relative">
        {width > 0 && (
          <svg
            width={width}
            height={height}
            role="img"
            aria-label={label}
            tabIndex={0}
            onKeyDown={onKey}
            onBlur={() => setActive(null)}
            className="touch-pan-y outline-none focus-visible:ring-2 focus-visible:ring-accent"
            onPointerMove={(e: PointerEvent<SVGSVGElement>) => nearest(e.clientX, e.currentTarget.getBoundingClientRect())}
            onPointerDown={(e: PointerEvent<SVGSVGElement>) => nearest(e.clientX, e.currentTarget.getBoundingClientRect())}
            onPointerLeave={() => setActive(null)}
          >
            {yTicks.map((t) => (
              <g key={t}>
                <line x1={PAD.left} x2={PAD.left + innerW} y1={sy(t)} y2={sy(t)} stroke="var(--color-border)" strokeWidth="1" />
                <text x={PAD.left - 6} y={sy(t)} dy="0.32em" textAnchor="end" className="fill-muted text-[11px] tabular">
                  {formatY(t)}
                </text>
              </g>
            ))}
            {xTicks.map((t, i) => (
              <text
                key={i}
                x={sx(t)}
                y={height - 6}
                textAnchor={i === 0 ? 'start' : i === xTicks.length - 1 ? 'end' : 'middle'}
                className="fill-muted text-[11px]"
              >
                {shortDate(t)}
              </text>
            ))}

            {activeX != null && (
              <line x1={sx(activeX)} x2={sx(activeX)} y1={PAD.top} y2={height - PAD.bottom} stroke="var(--color-muted)" strokeWidth="1" />
            )}

            {series.map((s) => (
              <g key={s.name}>
                {s.style !== 'dots' && s.points.length > 1 && (
                  <path
                    d={s.points.map((p, i) => `${i ? 'L' : 'M'}${sx(p.x)},${sy(p.y)}`).join('')}
                    fill="none"
                    stroke={s.color}
                    strokeWidth="2"
                    strokeLinejoin="round"
                    strokeLinecap="round"
                  />
                )}
                {(s.style !== 'line' || s.points.length === 1) &&
                  s.points.map((p, i) => (
                    <circle
                      key={i}
                      cx={sx(p.x)}
                      cy={sy(p.y)}
                      r={p.x === activeX ? 5 : 4}
                      fill={s.color}
                      stroke={SURFACE}
                      strokeWidth="2"
                    />
                  ))}
                {s.style === 'line' &&
                  activeX != null &&
                  s.points
                    .filter((p) => p.x === activeX)
                    .map((p, i) => <circle key={i} cx={sx(p.x)} cy={sy(p.y)} r="5" fill={s.color} stroke={SURFACE} strokeWidth="2" />)}
              </g>
            ))}

            {/* Etiqueta directa solo en el último valor de la serie principal */}
            {last && (
              <text x={sx(last.x) + 8} y={sy(last.y)} dy="0.32em" className="fill-text text-[12px] font-semibold tabular">
                {formatY(last.y)}
              </text>
            )}
          </svg>
        )}

        {activeX != null && (
          <div
            className="pointer-events-none absolute top-0 z-10 min-w-28 rounded-lg border border-border bg-surface-2 px-3 py-2 text-xs shadow-lg"
            style={{
              left: Math.min(Math.max(0, sx(activeX) - 56), Math.max(0, width - 130)),
            }}
          >
            <p className="mb-1 text-muted">{new Date(activeX).toLocaleDateString('es', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}</p>
            {series.map((s) => {
              const p = s.points.find((pt) => pt.x === activeX)
              return (
                p && (
                  <p key={s.name} className="flex items-center gap-2">
                    <svg width="12" height="4" aria-hidden>
                      <line x1="1" y1="2" x2="11" y2="2" stroke={s.color} strokeWidth="2" strokeLinecap="round" />
                    </svg>
                    <span className="font-semibold tabular">{formatY(p.y)}</span>
                    <span className="text-muted">{s.name}</span>
                  </p>
                )
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
