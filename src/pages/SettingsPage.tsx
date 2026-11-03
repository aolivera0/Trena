import { LogOut } from 'lucide-react'
import { useMemo, useState } from 'react'
import { signOut, useProfile } from '../auth/AuthProvider'
import { PrefsFields } from '../components/PrefsFields'
import { Avatar } from '../components/ProgramList'
import { RmList } from '../components/RmList'
import { Button, Card, PageHeader, Toggle, WeightInput } from '../components/ui'
import { useQuery } from '../hooks/useFirestore'
import { logBodyweight, removeCoach, rmsCol, updateProfile } from '../lib/db'
import { toast, track } from '../lib/feedback'
import { useEmulators } from '../lib/firebase'
import { formatWeight } from '../lib/format'
import type { RM } from '../lib/types'

export function SettingsPage() {
  const { user, profile } = useProfile()
  const [bodyweight, setBodyweight] = useState<number | null>(null)
  const rmsQuery = useMemo(() => rmsCol(user.uid), [user.uid])
  const { data: rms } = useQuery<RM>(rmsQuery, `rms:${user.uid}`)

  function setRole(role: 'athlete' | 'coach', value: boolean) {
    const roles = { ...profile.roles, [role]: value }
    if (!roles.athlete && !roles.coach) return toast('Necesitas al menos un rol', 'error')
    track(updateProfile(user.uid, { roles }))
  }

  function saveBodyweight() {
    if (bodyweight == null || bodyweight <= 0) return
    track(logBodyweight(user.uid, bodyweight), 'No se pudo guardar el peso')
    setBodyweight(null)
    toast('Peso registrado')
  }

  function leaveCoach() {
    if (confirm(`¿Dejar de entrenar con ${profile.coachName ?? 'tu entrenador'}? Ya no podrá ver tus datos.`)) {
      track(removeCoach(user.uid), 'No se pudo desvincular')
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Ajustes" />

      <Card className="flex items-center gap-3">
        <Avatar profile={profile} size={44} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{profile.displayName}</p>
          <p className="truncate text-sm text-muted">{profile.email}</p>
        </div>
        <Button size="sm" variant="ghost" onClick={() => signOut()}>
          <LogOut size={16} /> Salir
        </Button>
      </Card>

      <Card className="space-y-2">
        <h2 className="font-semibold">Roles</h2>
        <Toggle label="Atleta" checked={profile.roles.athlete} onChange={(v) => setRole('athlete', v)} />
        <Toggle label="Entrenador" checked={profile.roles.coach} onChange={(v) => setRole('coach', v)} />
      </Card>

      {profile.roles.athlete && (
        <Card className="space-y-3">
          <h2 className="font-semibold">Entrenador</h2>
          {profile.coachId ? (
            <div className="flex items-center justify-between gap-3">
              <span>{profile.coachName ?? 'Asignado'}</span>
              <Button size="sm" variant="danger" onClick={leaveCoach}>
                Desvincular
              </Button>
            </div>
          ) : (
            <p className="text-sm text-muted">Sin entrenador. Pídele a tu entrenador un link de invitación.</p>
          )}
        </Card>
      )}

      <Card className="space-y-4">
        <h2 className="font-semibold">Preferencias</h2>
        <PrefsFields prefs={profile.prefs} onChange={(prefs) => track(updateProfile(user.uid, { prefs }))} />
      </Card>

      {profile.roles.athlete && (
        <>
          <Card className="space-y-3">
            <div className="flex items-baseline justify-between">
              <h2 className="font-semibold">Peso corporal</h2>
              {profile.bodyweightKg != null && (
                <span className="text-sm text-muted">Último: {formatWeight(profile.bodyweightKg, profile.prefs.unit)}</span>
              )}
            </div>
            <div className="flex gap-2">
              <div className="flex-1">
                <WeightInput
                  valueKg={bodyweight}
                  onChangeKg={setBodyweight}
                  unit={profile.prefs.unit}
                  placeholder="Peso de hoy"
                  onKeyDown={(e) => e.key === 'Enter' && saveBodyweight()}
                />
              </div>
              <Button variant="primary" onClick={saveBodyweight} disabled={bodyweight == null || bodyweight <= 0}>
                Registrar
              </Button>
            </div>
          </Card>

          <RmList athleteId={user.uid} rms={rms} bodyweightKg={profile.bodyweightKg} editable />
        </>
      )}

      <Card className="space-y-2 text-xs text-muted">
        <h2 className="text-sm font-semibold text-text">Créditos</h2>
        <p>
          Ilustraciones de ejercicios:{' '}
          <a className="text-accent" href="https://github.com/bryllim/workout-guide" target="_blank" rel="noreferrer">
            Workout Guide
          </a>{' '}
          de Bryl Lim, basadas en{' '}
          <a className="text-accent" href="https://github.com/everkinetic/data" target="_blank" rel="noreferrer">
            Everkinetic
          </a>
          , bajo licencia{' '}
          <a className="text-accent" href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noreferrer">
            CC BY-SA 4.0
          </a>
          . Se muestran sin modificaciones.
        </p>
        <p>Firebase: {useEmulators ? 'emuladores locales' : 'proyecto real'}</p>
      </Card>
    </div>
  )
}
