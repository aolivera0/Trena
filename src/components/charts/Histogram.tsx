import { useState } from 'react'
import { linear, niceTicks, useWidth } from './scale'

const PAD = { top: 12, right: 8, bottom: 24, left: 32 }
const MAX_BAR = 24
const GAP = 2

// Barra con el extremo de datos redondeado (4px) y la base recta
function barPath(x: number, y: number, w: number, h: number) {
  const r = Math.min(4, w / 2, h)
  return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`
}

// Distribución de cargas: cuántas series se hicieron en cada rango de peso
export function Histogram({
  values,
  binSize,
  unit,
  height = 180,
  label,
}: {
  values: number[] // en la unidad de visualización
  binSize: number
  unit: string
  height?: number
  label: string
}) {
  const [ref, width] = useWidth<HTMLDivElement>()
  const [active, setActive] = useState<number | null>(null)
  if (!values.length) return null

  const start = Math.floor(Math.min(...values) / binSize) * binSize
  const binCount = Math.floor((Math.max(...values) - start) / binSize) + 1
  const bins = Array.from({ length: binCount }, (_, i) => ({ from: start + i * binSize, count: 0 }))
  for (const v of values) bins[Math.min(binCount - 1, Math.floor((v - start) / binSize))].count++

  const yTicks = niceTicks(0, Math.max(...bins.map((b) => b.count)), 3).filter((t) => Number.isInteger(t))
  const innerW = Math.max(0, width - PAD.left - PAD.right)
  const slot = innerW / binCount
  const barW = Math.max(2, Math.min(MAX_BAR, slot - GAP))
  const sy = linear(0, yTicks.at(-1)!, height - PAD.bottom, PAD.top)
  const labelEvery = Math.ceil(binCount / Math.max(1, Math.floor(innerW / 48)))
  const fmt = (v: number) => String(Number(v.toFixed(2)))

  return (
    <div ref={ref} className="relative">
      {width > 0 && (
        <svg width={width} height={height} role="img" aria-label={label}>
          {yTicks.map((t) => (
            <g key={t}>
              <line x1={PAD.left} x2={PAD.left + innerW} y1={sy(t)} y2={sy(t)} stroke="var(--color-border)" strokeWidth="1" />
              <text x={PAD.left - 6} y={sy(t)} dy="0.32em" textAnchor="end" className="fill-muted text-[11px] tabular">
                {t}
              </text>
            </g>
          ))}
          {bins.map((b, i) => {
            const cx = PAD.left + slot * i + slot / 2
            const y = sy(b.count)
            return (
              <g key={i}>
                {b.count > 0 && (
                  <path
                    d={barPath(cx - barW / 2, y, barW, sy(0) - y)}
                    fill="var(--color-chart-1)"
                    opacity={active == null || active === i ? 1 : 0.55}
                  />
                )}
                {i % labelEvery === 0 && (
                  <text x={cx} y={height - 6} textAnchor="middle" className="fill-muted text-[11px] tabular">
                    {fmt(b.from)}
                  </text>
                )}
                {/* Zona táctil del ancho completo del rango, más grande que la barra */}
                <rect
                  x={PAD.left + slot * i}
                  y={PAD.top}
                  width={slot}
                  height={height - PAD.top - PAD.bottom}
                  fill="transparent"
                  tabIndex={0}
                  aria-label={`${fmt(b.from)}–${fmt(b.from + binSize)} ${unit}: ${b.count} series`}
                  onPointerEnter={() => setActive(i)}
                  onPointerDown={() => setActive(i)}
                  onPointerLeave={() => setActive(null)}
                  onFocus={() => setActive(i)}
                  onBlur={() => setActive(null)}
                  className="outline-none"
                />
              </g>
            )
          })}
        </svg>
      )}
      {active != null && (
        <div
          className="pointer-events-none absolute top-0 z-10 rounded-lg border border-border bg-surface-2 px-3 py-2 text-xs shadow-lg"
          style={{ left: Math.min(Math.max(0, PAD.left + slot * active - 40), Math.max(0, width - 120)) }}
        >
          <p className="font-semibold tabular">{bins[active].count} series</p>
          <p className="text-muted tabular">
            {fmt(bins[active].from)}–{fmt(bins[active].from + binSize)} {unit}
          </p>
        </div>
      )}
    </div>
  )
}
