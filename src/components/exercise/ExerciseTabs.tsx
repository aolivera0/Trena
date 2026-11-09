import { useState } from 'react'
import { useProfile } from '../../auth/AuthProvider'
import type { E1rmFormula } from '../../lib/strength/e1rm'
import type { ExerciseRef, ExerciseStats, RM } from '../../lib/types'
import { FullScreenSheet, Segmented } from '../ui'
import { ExerciseHistory } from './ExerciseHistory'
import { ExerciseTutorial } from './ExerciseTutorial'

type Tab = 'history' | 'tutorial'

export type ExerciseContext = {
  athleteId: string
  exercise: ExerciseRef
  bodyweightKg: number
  formula: E1rmFormula
  rm: RM | undefined
  stats: ExerciseStats | undefined
  athleteCoachId: string | null
  excludeSessionId?: string
}

// Historial | Tutorial de un ejercicio, para la página y el modal de la sesión
export function ExerciseTabs(ctx: ExerciseContext) {
  const { user } = useProfile()
  const [tab, setTab] = useState<Tab>('history')
  // La guía es del entrenador del atleta; si no tiene, la del propio atleta.
  // Cuando mira el entrenador, ve (y edita) la suya.
  const viewerIsCoach = ctx.athleteId !== user.uid
  const guideOwnerId = viewerIsCoach ? user.uid : (ctx.athleteCoachId ?? user.uid)

  return (
    <div className="space-y-4">
      <Segmented
        value={tab}
        onChange={setTab}
        options={[
          { value: 'history', label: 'Historial' },
          { value: 'tutorial', label: 'Tutorial' },
        ]}
      />
      {tab === 'history' ? (
        <ExerciseHistory
          athleteId={ctx.athleteId}
          exerciseId={ctx.exercise.id}
          addsBodyweight={ctx.exercise.addsBodyweight}
          bodyweightKg={ctx.bodyweightKg}
          formula={ctx.formula}
          rm={ctx.rm}
          stats={ctx.stats}
          excludeSessionId={ctx.excludeSessionId}
        />
      ) : (
        <ExerciseTutorial exercise={ctx.exercise} guideOwnerId={guideOwnerId} editable={guideOwnerId === user.uid} />
      )}
    </div>
  )
}

export function ExerciseModal({ ctx, onClose }: { ctx: ExerciseContext | null; onClose: () => void }) {
  if (!ctx) return null
  const title = ctx.exercise.variant ? `${ctx.exercise.name} · ${ctx.exercise.variant}` : ctx.exercise.name
  return (
    <FullScreenSheet open onClose={onClose} title={title}>
      <ExerciseTabs {...ctx} />
    </FullScreenSheet>
  )
}
