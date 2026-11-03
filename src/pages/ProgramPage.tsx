import { query, where } from 'firebase/firestore'
import { ArrowLeft, Pencil, Plus, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router'
import { useProfile } from '../auth/AuthProvider'
import { WeekCard } from '../components/program/WeekCard'
import { Button, EmptyState, FullScreenSpinner, IconButton, Input } from '../components/ui'
import { useAthlete } from '../hooks/useAthlete'
import { useDoc, useQuery } from '../hooks/useFirestore'
import { addWeek, deleteProgram, programRef, renameProgram, weeksCol } from '../lib/db'
import { track } from '../lib/feedback'
import type { Program, Week } from '../lib/types'

export function ProgramPage() {
  const { athleteId = '', programId = '' } = useParams()
  const { user } = useProfile()
  const navigate = useNavigate()
  const { athlete, rmById, isSelf, isCoach, loading: athleteLoading } = useAthlete(athleteId)

  const pRef = useMemo(() => programRef(athleteId, programId), [athleteId, programId])
  const { data: program, loading: programLoading } = useDoc<Program>(pRef)

  // El atleta solo ve semanas publicadas de programas que no son suyos (R-2).
  // La consulta tiene que pedirlo explícitamente o las reglas la rechazan.
  const canEdit = isCoach || (isSelf && program?.ownerId === user.uid)
  const hasProgram = program != null
  const weeksQuery = useMemo(() => {
    if (!hasProgram) return null
    const col = weeksCol(athleteId, programId)
    return canEdit ? col : query(col, where('status', '==', 'PUBLISHED'))
  }, [hasProgram, canEdit, athleteId, programId])
  const { data: weeks, loading: weeksLoading } = useQuery<Week>(
    weeksQuery,
    hasProgram ? `weeks:${athleteId}/${programId}:${canEdit ? 'all' : 'published'}` : null,
  )

  const [renaming, setRenaming] = useState(false)
  const [name, setName] = useState('')

  if (athleteLoading || programLoading) return <FullScreenSpinner />
  if (!program || !athlete) return <Navigate to="/" replace />

  const sorted = [...weeks].sort((a, b) => a.index - b.index)
  const nextIndex = (sorted.at(-1)?.index ?? 0) + 1
  const back = isSelf ? '/' : `/athlete/${athleteId}`

  function saveName() {
    if (name.trim()) track(renameProgram(athleteId, programId, name.trim()))
    setRenaming(false)
  }

  function remove() {
    if (!confirm(`¿Eliminar el programa “${program!.name}” con todas sus semanas?`)) return
    track(deleteProgram(athleteId, programId), 'No se pudo eliminar el programa')
    navigate(back, { replace: true })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Link to={back} aria-label="Volver" className="-ml-2 flex size-9 items-center justify-center rounded-lg text-muted hover:text-text">
          <ArrowLeft size={20} />
        </Link>
        {renaming ? (
          <form
            className="flex flex-1 gap-2"
            onSubmit={(e) => {
              e.preventDefault()
              saveName()
            }}
          >
            <Input value={name} onChange={(e) => setName(e.target.value)} autoFocus onBlur={saveName} />
          </form>
        ) : (
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-xl font-bold">{program.name}</h1>
            {!isSelf && <p className="truncate text-sm text-muted">{athlete.displayName}</p>}
          </div>
        )}
        {canEdit && !renaming && (
          <>
            <IconButton
              label="Renombrar"
              onClick={() => {
                setName(program.name)
                setRenaming(true)
              }}
            >
              <Pencil size={16} />
            </IconButton>
            <IconButton label="Eliminar programa" onClick={remove}>
              <Trash2 size={16} />
            </IconButton>
          </>
        )}
      </div>

      {weeksLoading ? null : sorted.length === 0 ? (
        <EmptyState>{canEdit ? 'Sin semanas.' : 'Tu entrenador aún no ha publicado semanas de este programa.'}</EmptyState>
      ) : (
        sorted.map((w, i) => (
          <WeekCard
            key={w.id}
            athleteId={athleteId}
            programId={programId}
            week={w}
            canEdit={canEdit}
            rmById={rmById}
            bodyweightKg={athlete.bodyweightKg ?? 0}
            nextIndex={nextIndex}
            defaultOpen={i === sorted.length - 1}
          />
        ))
      )}

      {canEdit && (
        <Button className="w-full" onClick={() => track(addWeek(athleteId, programId, nextIndex))}>
          <Plus size={16} /> Semana {nextIndex}
        </Button>
      )}
    </div>
  )
}
