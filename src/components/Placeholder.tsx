import type { ReactNode } from 'react'

type Props = {
  title: string
  phase: number
  children?: ReactNode
}

// Pantalla temporal mientras se construye cada sección del plan
export function Placeholder({ title, phase, children }: Props) {
  return (
    <section className="space-y-3">
      <h1 className="text-2xl font-bold">{title}</h1>
      <div className="rounded-xl border border-border bg-surface p-4 text-sm text-muted">
        {children}
        <p className="mt-2 text-xs uppercase tracking-wide text-accent">Fase {phase}</p>
      </div>
    </section>
  )
}
