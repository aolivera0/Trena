import { Link } from 'react-router'

export function NotFoundPage() {
  return (
    <section className="space-y-3">
      <h1 className="text-2xl font-bold">Página no encontrada</h1>
      <Link to="/" className="text-accent">
        Volver al inicio
      </Link>
    </section>
  )
}
