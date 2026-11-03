import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router'
import { signOut, useAuth } from '../auth/AuthProvider'
import { PrefsFields } from '../components/PrefsFields'
import { draftE1rm, RmInput, type RmDraft } from '../components/RmInput'
import { Button, Card, Field, FullScreenSpinner, Toggle, WeightInput } from '../components/ui'
import { createProfile } from '../lib/db'
import { catalogRef, getCatalogExercise, INITIAL_RM_SLUGS } from '../lib/exercises'
import { getPendingInvite } from '../lib/pendingInvite'
import type { Prefs, UserProfile } from '../lib/types'

const DEFAULT_PREFS: Prefs = { unit: 'kg', roundingKg: 2.5, e1rmFormula: 'epley' }

export function OnboardingPage() {
  const { user, profile, loading } = useAuth()
  const navigate = useNavigate()
  const pendingInvite = getPendingInvite()

  const [roles, setRoles] = useState<UserProfile['roles']>({ athlete: true, coach: false })
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS)
  const [bodyweightKg, setBodyweightKg] = useState<number | null>(null)
  const [rms, setRms] = useState<Record<string, RmDraft & { skip: boolean }>>(() =>
    Object.fromEntries(INITIAL_RM_SLUGS.map((s) => [s, { weightKg: null, reps: 1, skip: false }])),
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (loading) return <FullScreenSpinner />
  if (!user) return <Navigate to="/login" replace />
  if (profile) return <Navigate to="/" replace />

  const exercises = INITIAL_RM_SLUGS.map((slug) => getCatalogExercise(slug)!)
  const e1rms = Object.fromEntries(
    exercises.map((e) => [e.slug, draftE1rm(rms[e.slug], e.addsBodyweight, bodyweightKg, prefs.e1rmFormula)]),
  )

  function validate(): string | null {
    if (!roles.athlete && !roles.coach) return 'Elige al menos un rol.'
    if (!roles.athlete) return null
    if (bodyweightKg == null || bodyweightKg <= 0) return 'Ingresa tu peso corporal.'
    const missing = exercises.filter((e) => !rms[e.slug].skip && e1rms[e.slug] == null)
    if (missing.length) return `Falta el RM de: ${missing.map((e) => e.nameEs ?? e.name).join(', ')}.`
    return null
  }

  async function submit() {
    const problem = validate()
    setError(problem)
    if (problem || !user) return
    setSaving(true)
    try {
      await createProfile(user, {
        roles,
        prefs,
        bodyweightKg: roles.athlete ? bodyweightKg : null,
        rms: roles.athlete
          ? exercises
              .filter((e) => !rms[e.slug].skip)
              .map((e) => ({ exercise: catalogRef(e), e1rmKg: e1rms[e.slug]! }))
          : [],
      })
      navigate(pendingInvite ? `/invite/${pendingInvite}` : '/', { replace: true })
    } catch (err) {
      console.error(err)
      setError('No se pudo guardar tu perfil. Revisa tu conexión.')
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-xl space-y-6 px-4 pb-12 pt-[max(1.5rem,env(safe-area-inset-top))]">
      <div>
        <h1 className="text-2xl font-bold">Bienvenido{user.displayName ? `, ${user.displayName.split(' ')[0]}` : ''}</h1>
        <p className="mt-1 text-sm text-muted">Configura tu perfil para empezar.</p>
      </div>

      <Card className="space-y-2">
        <h2 className="font-semibold">¿Cómo vas a usar Trena?</h2>
        <Toggle
          label="Soy atleta: registro mis entrenamientos"
          checked={roles.athlete}
          onChange={(athlete) => setRoles({ ...roles, athlete })}
        />
        <Toggle
          label="Soy entrenador: programo a otros atletas"
          checked={roles.coach}
          onChange={(coach) => setRoles({ ...roles, coach })}
        />
        {pendingInvite && !roles.athlete && (
          <p className="text-xs text-warning">Tienes una invitación de entrenador: necesitas el rol de atleta.</p>
        )}
      </Card>

      <Card className="space-y-4">
        <h2 className="font-semibold">Preferencias</h2>
        <PrefsFields prefs={prefs} onChange={setPrefs} />
      </Card>

      {roles.athlete && (
        <Card className="space-y-5">
          <div>
            <h2 className="font-semibold">Tu fuerza actual</h2>
            <p className="mt-1 text-sm text-muted">
              Con esto se calculan los pesos sugeridos. Puedes usar una marca de varias reps: se estima el
              1RM con la fórmula elegida.
            </p>
          </div>

          <Field label="Peso corporal">
            <WeightInput valueKg={bodyweightKg} onChangeKg={setBodyweightKg} unit={prefs.unit} placeholder="Ej: 80" />
          </Field>

          {exercises.map((e) => (
            <div key={e.slug} className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-medium">
                  {e.nameEs ?? e.name}
                  {e.addsBodyweight && <span className="ml-1.5 text-xs text-muted">(lastre)</span>}
                </span>
                <label className="flex items-center gap-1.5 text-xs text-muted">
                  <input
                    type="checkbox"
                    checked={rms[e.slug].skip}
                    onChange={(ev) => setRms({ ...rms, [e.slug]: { ...rms[e.slug], skip: ev.target.checked } })}
                  />
                  No lo entreno
                </label>
              </div>
              {!rms[e.slug].skip && (
                <RmInput
                  draft={rms[e.slug]}
                  onChange={(d) => setRms({ ...rms, [e.slug]: { ...rms[e.slug], ...d } })}
                  addsBodyweight={e.addsBodyweight}
                  bodyweightKg={bodyweightKg}
                  unit={prefs.unit}
                  formula={prefs.e1rmFormula}
                />
              )}
            </div>
          ))}
        </Card>
      )}

      {error && <p className="text-sm text-danger">{error}</p>}

      <div className="flex gap-3">
        <Button variant="ghost" onClick={() => signOut()}>
          Salir
        </Button>
        <Button variant="primary" className="flex-1" onClick={submit} loading={saving}>
          Empezar
        </Button>
      </div>
    </div>
  )
}
