import { ChevronRight, Copy, Plus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { useProfile } from '../auth/AuthProvider'
import { useQuery } from '../hooks/useFirestore'
import { createProgram, duplicateProgram, programsCol } from '../lib/db'
import { track } from '../lib/feedback'
import type { Program, UserProfile, WithId } from '../lib/types'
import { Badge, Button, EmptyState, Field, IconButton, Input, Sheet, Spinner } from './ui'

export function ProgramList({
  athleteId,
  canCreate,
  copyTargets = [],
}: {
  athleteId: string
  canCreate: boolean
  // Atletas a los que el entrenador puede copiar un programa
  copyTargets?: WithId<UserProfile>[]
}) {
  const { user } = useProfile()
  const navigate = useNavigate()
  const q = useMemo(() => programsCol(athleteId), [athleteId])
  const { data: programs, loading } = useQuery<Program>(q, `programs:${athleteId}`)
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')
  const [copying, setCopying] = useState<WithId<Program> | null>(null)

  const sorted = [...programs].sort((a, b) => (b.createdAt?.toMillis() ?? Infinity) - (a.createdAt?.toMillis() ?? Infinity))

  function create() {
    if (!name.trim()) return
    const id = createProgram(athleteId, user.uid, name.trim())
    setCreating(false)
    setName('')
    navigate(`/program/${athleteId}/${id}`)
  }

  function copyTo(target: WithId<UserProfile>) {
    if (!copying) return
    const program = copying
    setCopying(null)
    track(
      duplicateProgram(athleteId, program.id, program, target.id, user.uid).then((id) =>
        navigate(`/program/${target.id}/${id}`),
      ),
      'No se pudo copiar el programa',
    )
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Programas</h2>
        {canCreate && (
          <Button size="sm" variant="ghost" onClick={() => setCreating(true)}>
            <Plus size={16} /> Nuevo
          </Button>
        )}
      </div>

      {loading ? (
        <Spinner />
      ) : sorted.length === 0 ? (
        <EmptyState>{canCreate ? 'Aún no hay programas. Crea el primero.' : 'Aún no tienes programas.'}</EmptyState>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
          {sorted.map((p) => (
            <li key={p.id} className="flex items-center">
              <Link to={`/program/${athleteId}/${p.id}`} className="flex min-w-0 flex-1 items-center gap-3 p-4 hover:bg-surface-2">
                <span className="min-w-0 flex-1 truncate font-medium">{p.name}</span>
                {p.ownerId === athleteId && athleteId !== user.uid && <Badge>Del atleta</Badge>}
                <ChevronRight size={18} className="text-muted" />
              </Link>
              {canCreate && copyTargets.length > 0 && (
                <IconButton label="Copiar a otro atleta" className="mr-2" onClick={() => setCopying(p)}>
                  <Copy size={16} />
                </IconButton>
              )}
            </li>
          ))}
        </ul>
      )}

      <Sheet open={creating} onClose={() => setCreating(false)} title="Nuevo programa">
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault()
            create()
          }}
        >
          <Field label="Nombre">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: Bloque de fuerza — Nov" autoFocus />
          </Field>
          <Button type="submit" variant="primary" className="w-full" disabled={!name.trim()}>
            Crear
          </Button>
        </form>
      </Sheet>

      <Sheet open={copying != null} onClose={() => setCopying(null)} title={`Copiar “${copying?.name ?? ''}”`}>
        <p className="mb-3 text-sm text-muted">Se copian todas las semanas como borrador.</p>
        <ul className="space-y-1">
          {copyTargets.map((t) => (
            <li key={t.id}>
              <button
                type="button"
                onClick={() => copyTo(t)}
                className="flex w-full items-center gap-3 rounded-lg p-3 text-left hover:bg-surface-2"
              >
                <Avatar profile={t} />
                <span className="flex-1">{t.id === athleteId ? `${t.displayName} (duplicar aquí)` : t.displayName}</span>
              </button>
            </li>
          ))}
        </ul>
      </Sheet>
    </section>
  )
}

export function Avatar({ profile, size = 36 }: { profile: Pick<UserProfile, 'photoURL' | 'displayName'>; size?: number }) {
  return profile.photoURL ? (
    <img src={profile.photoURL} alt="" referrerPolicy="no-referrer" className="shrink-0 rounded-full" style={{ width: size, height: size }} />
  ) : (
    <span
      className="flex shrink-0 items-center justify-center rounded-full bg-surface-2 text-sm font-semibold text-muted"
      style={{ width: size, height: size }}
    >
      {profile.displayName.slice(0, 1).toUpperCase()}
    </span>
  )
}
