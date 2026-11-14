import { useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router'

// La ventana del ejercicio vive en la URL (?ejercicio=…&atleta=…) sobre la
// página actual: el gesto "atrás" la cierra y la página de abajo no se
// desmonta (se conservan pestaña, scroll y lo escrito).
export const EXERCISE_PARAM = 'ejercicio'
export const ATHLETE_PARAM = 'atleta'

type ModalState = { exerciseModal?: true }

export function useExerciseModal() {
  const navigate = useNavigate()
  const location = useLocation()

  const openExercise = useCallback(
    (athleteId: string, exerciseId: string) => {
      const params = new URLSearchParams(location.search)
      params.set(EXERCISE_PARAM, exerciseId)
      params.set(ATHLETE_PARAM, athleteId)
      const opened = (location.state as ModalState | null)?.exerciseModal
      // Si ya hay una abierta se reemplaza, para que "atrás" vuelva a la página
      navigate({ pathname: location.pathname, search: `?${params}` }, { replace: !!opened, state: { exerciseModal: true } })
    },
    [location, navigate],
  )

  const closeExercise = useCallback(() => {
    if ((location.state as ModalState | null)?.exerciseModal) {
      navigate(-1)
      return
    }
    // Entrada directa por URL: quitar los parámetros sin salir de la página
    const params = new URLSearchParams(location.search)
    params.delete(EXERCISE_PARAM)
    params.delete(ATHLETE_PARAM)
    const search = params.toString()
    navigate({ pathname: location.pathname, search: search ? `?${search}` : '' }, { replace: true })
  }, [location, navigate])

  return { openExercise, closeExercise }
}
