import { query, where } from 'firebase/firestore'
import { Dumbbell, GitBranch, Plus, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useProfile } from '../auth/AuthProvider'
import { useExerciseStats } from '../hooks/useExerciseStats'
import { useQuery } from '../hooks/useFirestore'
import { createCustomExercise, exercisesCol } from '../lib/db'
import {
  catalogRef,
  customRef,
  exerciseImageUrl,
  exerciseLabel,
  getCatalogExercise,
  normalize,
  searchCatalog,
  type CatalogExercise,
} from '../lib/exercises'
import type { CustomExercise, ExerciseRef } from '../lib/types'
import { Button, Field, FullScreenSheet, Input, Toggle } from './ui'

const MAX_RESULTS = 60

// Las ilustraciones de workout-guide son trazos blancos sobre fondo transparente
export function ExerciseThumb({ slug, size = 40 }: { slug: string | null; size?: number }) {
  const url = exerciseImageUrl(slug)
  return (
    <div
      className="flex shrink-0 items-center justify-center overflow-hidden rounded-lg bg-surface-2"
      style={{ width: size, height: size }}
    >
      {url ? (
        <img src={url} alt="" loading="lazy" className="size-full object-contain" />
      ) : (
        <Dumbbell size={size * 0.5} className="text-muted" aria-hidden />
      )}
    </div>
  )
}

// Ejercicios propios del usuario y de su entrenador
export function useCustomExercises() {
  const { user, profile } = useProfile()
  const coachId = profile.coachId
  const q = useMemo(
    () => query(exercisesCol(), where('ownerId', 'in', coachId ? [user.uid, coachId] : [user.uid])),
    [user.uid, coachId],
  )
  return useQuery<CustomExercise>(q, `exercises:${user.uid}:${coachId}`)
}

type Draft = { name: string; variant: string; slug: string | null; addsBodyweight: boolean }

function matches(text: string, q: string) {
  if (!q) return true
  const hay = normalize(text)
  return q.split(/\s+/).every((t) => hay.includes(t))
}

// Selector de ejercicios a pantalla completa con el buscador fijo arriba.
// Primero los que el atleta ya hizo (más veces primero), luego los propios
// y el catálogo.
export function ExercisePicker({
  athleteId,
  open,
  onClose,
  onPick,
}: {
  athleteId: string // de quién es el historial que ordena la lista
  open: boolean
  onClose: () => void
  onPick: (ref: ExerciseRef) => void
}) {
  const { user } = useProfile()
  const [search, setSearch] = useState('')
  const [draft, setDraft] = useState<Draft | null>(null)
  const { data: customs } = useCustomExercises()
  const { data: stats } = useExerciseStats(athleteId)

  const q = normalize(search)
  const done = stats
    .filter((s) => {
      const en = s.exercise.slug ? (getCatalogExercise(s.exercise.slug)?.name ?? '') : ''
      return matches(`${s.exercise.name} ${s.exercise.variant ?? ''} ${en}`, q)
    })
    .sort((a, b) => (b.timesDone ?? 0) - (a.timesDone ?? 0) || b.lastDate - a.lastDate)
  const doneIds = new Set(stats.map((s) => s.id))
  const customMatches = customs.filter(
    (c) => !doneIds.has(`c:${c.id}`) && matches(`${c.name} ${c.variant ?? ''}`, q),
  )
  const catalogMatches = searchCatalog(search).filter((e) => !doneIds.has(`wg:${e.slug}`))

  function pick(ref: ExerciseRef) {
    onPick(ref)
    close()
  }

  function close() {
    setSearch('')
    setDraft(null)
    onClose()
  }

  function startVariant(e: CatalogExercise) {
    setDraft({ name: e.nameEs ?? e.name, variant: '', slug: e.slug, addsBodyweight: e.addsBodyweight })
  }

  function saveDraft() {
    if (!draft || !draft.name.trim()) return
    const data = {
      name: draft.name.trim(),
      variant: draft.variant.trim() || null,
      slug: draft.slug,
      addsBodyweight: draft.addsBodyweight,
    }
    const id = createCustomExercise(user.uid, data)
    pick({ id: `c:${id}`, ...data })
  }

  const sectionTitle = 'px-1 pb-1 text-xs font-medium uppercase tracking-wide text-muted'
  const row = 'flex w-full min-w-0 items-center gap-3 rounded-lg p-2 text-left hover:bg-surface-2'

  if (draft) {
    return (
      <FullScreenSheet open={open} onClose={close} title="Nuevo ejercicio">
        <div className="space-y-4">
          {draft.slug && (
            <div className="flex items-center gap-3">
              <ExerciseThumb slug={draft.slug} size={56} />
              <p className="text-sm text-muted">
                Variante de <span className="text-text">{draft.name}</span>. Tendrá su propio historial y RM.
              </p>
            </div>
          )}
          <Field label="Nombre">
            <Input
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              placeholder="Ej: Front lever row"
              autoFocus={!draft.slug}
            />
          </Field>
          <Field label="Variante (opcional)">
            <Input
              value={draft.variant}
              onChange={(e) => setDraft({ ...draft, variant: e.target.value })}
              placeholder="Ej: Pausa de 2 s, Tempo 3-1-0"
              autoFocus={!!draft.slug}
            />
          </Field>
          <Toggle
            label="Se suma el peso corporal (lastre)"
            checked={draft.addsBodyweight}
            onChange={(addsBodyweight) => setDraft({ ...draft, addsBodyweight })}
          />
          <div className="flex gap-3">
            <Button variant="ghost" onClick={() => setDraft(null)}>
              Volver
            </Button>
            <Button variant="primary" className="flex-1" onClick={saveDraft} disabled={!draft.name.trim()}>
              Crear y usar
            </Button>
          </div>
        </div>
      </FullScreenSheet>
    )
  }

  return (
    <FullScreenSheet
      open={open}
      onClose={close}
      title="Elegir ejercicio"
      toolbar={
        <div className="relative">
          <Search size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar: sentadilla, chest, dumbbell…"
            className="pl-10"
            type="search"
            enterKeyHint="search"
            autoFocus
          />
        </div>
      }
    >
      <div className="space-y-4">
        <Button size="sm" variant="ghost" onClick={() => setDraft({ name: search, variant: '', slug: null, addsBodyweight: false })}>
          <Plus size={16} /> Crear ejercicio propio
        </Button>

        {done.length > 0 && (
          <ul className="space-y-1">
            <li className={sectionTitle}>Tus ejercicios</li>
            {done.map((s) => (
              <li key={s.id}>
                <button type="button" onClick={() => pick(s.exercise)} className={row}>
                  <ExerciseThumb slug={s.exercise.slug} />
                  <span className="min-w-0 flex-1 truncate">{exerciseLabel(s.exercise)}</span>
                  {s.timesDone != null && (
                    <span className="shrink-0 rounded-full bg-accent/15 px-2 py-0.5 text-xs font-semibold text-accent tabular">
                      ×{s.timesDone}
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}

        {customMatches.length > 0 && (
          <ul className="space-y-1">
            <li className={sectionTitle}>Propios</li>
            {customMatches.map((c) => (
              <li key={c.id}>
                <button type="button" onClick={() => pick(customRef(c))} className={row}>
                  <ExerciseThumb slug={c.slug} />
                  <span className="min-w-0 flex-1 truncate">{exerciseLabel(c)}</span>
                </button>
              </li>
            ))}
          </ul>
        )}

        <ul className="space-y-1">
          <li className={sectionTitle}>Catálogo</li>
          {catalogMatches.slice(0, MAX_RESULTS).map((e) => (
            <li key={e.slug} className="flex items-center gap-1">
              <button type="button" onClick={() => pick(catalogRef(e))} className={`${row} flex-1`}>
                <ExerciseThumb slug={e.slug} />
                <span className="min-w-0">
                  <span className="block truncate">{e.nameEs ?? e.name}</span>
                  <span className="block truncate text-xs text-muted">
                    {e.nameEs ? `${e.name} · ` : ''}
                    {e.equipment} · {e.muscle}
                  </span>
                </span>
              </button>
              <button
                type="button"
                onClick={() => startVariant(e)}
                className="flex size-9 shrink-0 items-center justify-center rounded-lg text-muted hover:bg-surface-2 hover:text-text"
                aria-label={`Crear variante de ${e.nameEs ?? e.name}`}
                title="Crear variante"
              >
                <GitBranch size={16} />
              </button>
            </li>
          ))}
          {catalogMatches.length > MAX_RESULTS && (
            <li className="px-2 py-1 text-xs text-muted">{catalogMatches.length - MAX_RESULTS} más: afina la búsqueda.</li>
          )}
          {catalogMatches.length === 0 && done.length === 0 && customMatches.length === 0 && (
            <li className="px-2 py-1 text-sm text-muted">Sin resultados.</li>
          )}
        </ul>
      </div>
    </FullScreenSheet>
  )
}
