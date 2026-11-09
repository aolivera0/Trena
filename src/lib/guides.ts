import { doc, serverTimestamp, setDoc } from 'firebase/firestore'
import { track } from './feedback'
import { db } from './firebase'

// Guía de un ejercicio escrita por un entrenador (o por un atleta para sí
// mismo). La ven el autor y sus atletas.
export type ExerciseGuide = {
  ownerId: string
  exerciseId: string
  text: string
  videoUrl: string
}

export const guideRef = (ownerId: string, exerciseId: string) => doc(db, 'exerciseGuides', `${ownerId}__${exerciseId}`)

export function saveGuide(ownerId: string, exerciseId: string, data: Pick<ExerciseGuide, 'text' | 'videoUrl'>) {
  track(setDoc(guideRef(ownerId, exerciseId), { ownerId, exerciseId, ...data, updatedAt: serverTimestamp() }), 'No se pudo guardar la guía')
}

// Solo enlaces http(s): evita javascript: y similares en el href
export function safeUrl(url: string): string | null {
  try {
    const u = new URL(url.trim())
    return u.protocol === 'https:' || u.protocol === 'http:' ? u.toString() : null
  } catch {
    return null
  }
}

export function youtubeSearchUrl(name: string): string {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(`${name} técnica`)}`
}
