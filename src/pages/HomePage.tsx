import { Navigate } from 'react-router'
import { useProfile } from '../auth/AuthProvider'
import { Placeholder } from '../components/Placeholder'
import { ProgramList } from '../components/ProgramList'
import { PageHeader } from '../components/ui'

export function HomePage() {
  const { user, profile } = useProfile()
  if (!profile.roles.athlete) return <Navigate to="/coach" replace />

  return (
    <div className="space-y-6">
      <PageHeader title="Entrenar" subtitle={`Hola, ${profile.displayName.split(' ')[0]}`} />
      <Placeholder title="Sesión de hoy" phase={2}>
        Aquí aparecerán la sesión en curso y el botón para empezar un entrenamiento.
      </Placeholder>
      <ProgramList athleteId={user.uid} canCreate />
    </div>
  )
}
