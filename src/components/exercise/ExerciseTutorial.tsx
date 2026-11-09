import { CirclePlay, ExternalLink, Pencil } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useDoc } from '../../hooks/useFirestore'
import { equipmentEs, exerciseImageUrl, exerciseLabel, getCatalogExercise, muscleEs } from '../../lib/exercises'
import { guideRef, safeUrl, saveGuide, youtubeSearchUrl, type ExerciseGuide } from '../../lib/guides'
import type { ExerciseRef } from '../../lib/types'
import { Badge, Button, Card, Field, Input } from '../ui'

const FRAME_MS = 800

// Tutorial: las 3 ilustraciones animadas, equipo y músculos del catálogo, la
// guía del entrenador (texto + video) y una búsqueda en YouTube.
export function ExerciseTutorial({
  exercise,
  guideOwnerId,
  editable,
}: {
  exercise: ExerciseRef
  guideOwnerId: string // de quién es la guía que se muestra
  editable: boolean // el que mira es el autor de la guía
}) {
  const catalog = exercise.slug ? getCatalogExercise(exercise.slug) : undefined
  const hasImages = !!exerciseImageUrl(exercise.slug)

  return (
    <div className="space-y-4">
      {hasImages && <FrameAnimation slug={exercise.slug!} />}

      {catalog && (
        <Card className="space-y-2 text-sm">
          <p>
            <span className="text-muted">Equipo: </span>
            {equipmentEs(catalog.equipment)}
          </p>
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-muted">Músculos:</span>
            <Badge tone="accent">{muscleEs(catalog.muscle)}</Badge>
            {catalog.secondary.map((m) => (
              <Badge key={m}>{muscleEs(m)}</Badge>
            ))}
          </div>
        </Card>
      )}

      <CoachGuide exercise={exercise} ownerId={guideOwnerId} editable={editable} />

      <a
        href={youtubeSearchUrl(exerciseLabel(exercise))}
        target="_blank"
        rel="noreferrer"
        className="flex h-11 items-center justify-center gap-2 rounded-lg bg-surface-2 text-sm font-medium hover:bg-border"
      >
        <CirclePlay size={18} className="text-danger" /> Ver técnica en YouTube
      </a>
    </div>
  )
}

function FrameAnimation({ slug }: { slug: string }) {
  const [frame, setFrame] = useState<1 | 2 | 3>(1)
  const reduced = useMemo(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches, [])

  useEffect(() => {
    if (reduced) return
    const id = setInterval(() => setFrame((f) => ((f % 3) + 1) as 1 | 2 | 3), FRAME_MS)
    return () => clearInterval(id)
  }, [reduced])

  // Las 3 imágenes se apilan y se alterna su opacidad: no hay parpadeo al cargar
  return (
    <div className="space-y-2">
      <div className="relative mx-auto aspect-square w-full max-w-xs overflow-hidden rounded-2xl bg-surface-2">
        {([1, 2, 3] as const).map((f) => (
          <img
            key={f}
            src={exerciseImageUrl(slug, f)!}
            alt=""
            className={`absolute inset-0 size-full object-contain transition-opacity duration-200 ${f === frame ? 'opacity-100' : 'opacity-0'}`}
          />
        ))}
      </div>
      <div className="flex justify-center gap-1.5" aria-hidden>
        {([1, 2, 3] as const).map((f) => (
          <button
            key={f}
            type="button"
            tabIndex={-1}
            onClick={() => setFrame(f)}
            className={`h-1.5 w-6 rounded-full ${f === frame ? 'bg-accent' : 'bg-border'}`}
          />
        ))}
      </div>
    </div>
  )
}

function CoachGuide({ exercise, ownerId, editable }: { exercise: ExerciseRef; ownerId: string; editable: boolean }) {
  const ref = useMemo(() => guideRef(ownerId, exercise.id), [ownerId, exercise.id])
  const { data: guide, loading } = useDoc<ExerciseGuide>(ref)
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState('')
  const [video, setVideo] = useState('')

  if (loading) return null

  if (editing) {
    const videoOk = !video.trim() || safeUrl(video) != null
    return (
      <Card className="space-y-3">
        <h3 className="font-semibold">Guía del entrenador</h3>
        <Field label="Indicaciones">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={5}
            maxLength={5000}
            placeholder="Puntos clave de la técnica, errores comunes, señales…"
            className="block w-full resize-y rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm placeholder:text-muted/60 focus:border-accent focus:outline-none"
          />
        </Field>
        <Field label="Video (opcional)" hint={videoOk ? 'Link de YouTube, Instagram, Drive…' : 'Ingresa un link que empiece con https://'}>
          <Input value={video} onChange={(e) => setVideo(e.target.value)} placeholder="https://…" inputMode="url" maxLength={500} />
        </Field>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={() => setEditing(false)}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            className="flex-1"
            disabled={!videoOk}
            onClick={() => {
              saveGuide(ownerId, exercise.id, { text: text.trim(), videoUrl: video.trim() ? safeUrl(video)! : '' })
              setEditing(false)
            }}
          >
            Guardar guía
          </Button>
        </div>
      </Card>
    )
  }

  const videoUrl = guide?.videoUrl ? safeUrl(guide.videoUrl) : null
  const hasContent = !!(guide?.text || videoUrl)
  if (!hasContent && !editable) return null

  return (
    <Card className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">Guía del entrenador</h3>
        {editable && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setText(guide?.text ?? '')
              setVideo(guide?.videoUrl ?? '')
              setEditing(true)
            }}
          >
            <Pencil size={14} /> {hasContent ? 'Editar' : 'Escribir'}
          </Button>
        )}
      </div>
      {guide?.text ? (
        <p className="whitespace-pre-wrap text-sm">{guide.text}</p>
      ) : (
        !videoUrl && <p className="text-sm text-muted">Escribe indicaciones para tus atletas sobre este ejercicio.</p>
      )}
      {videoUrl && (
        <a href={videoUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-sm font-medium text-accent">
          <ExternalLink size={14} /> Ver video
        </a>
      )}
    </Card>
  )
}
