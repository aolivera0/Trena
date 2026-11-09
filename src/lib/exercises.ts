import catalogData from '../data/catalog.json'
import type { CustomExercise, ExerciseRef, WithId } from './types'

export type CatalogExercise = {
  slug: string
  name: string
  nameEs: string | null
  equipment: string
  muscle: string
  secondary: string[]
  type: string
  addsBodyweight: boolean
  hasImages: boolean
}

export const catalog = catalogData.exercises as CatalogExercise[]
const bySlug = new Map(catalog.map((e) => [e.slug, e]))

export function getCatalogExercise(slug: string): CatalogExercise | undefined {
  return bySlug.get(slug)
}

export function catalogRef(e: CatalogExercise): ExerciseRef {
  return {
    id: `wg:${e.slug}`,
    name: e.nameEs ?? e.name,
    variant: null,
    slug: e.slug,
    addsBodyweight: e.addsBodyweight,
  }
}

export function customRef(e: WithId<CustomExercise>): ExerciseRef {
  return {
    id: `c:${e.id}`,
    name: e.name,
    variant: e.variant,
    slug: e.slug,
    addsBodyweight: e.addsBodyweight,
  }
}

export function exerciseLabel(ref: Pick<ExerciseRef, 'name' | 'variant'>): string {
  return ref.variant ? `${ref.name} · ${ref.variant}` : ref.name
}

// Ejercicios con RM inicial obligatorio (SPEC §2)
export const INITIAL_RM_SLUGS = [
  'squat',
  'bench-press',
  'deadlift',
  'muscle-up',
  'weighted-pull-up',
  'weighted-dip',
] as const

export function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
}

export function searchCatalog(query: string): CatalogExercise[] {
  const q = normalize(query)
  if (!q) return catalog
  const terms = q.split(/\s+/)
  return catalog.filter((e) => {
    const hay = normalize(`${e.nameEs ?? ''} ${e.name} ${e.equipment} ${e.muscle} ${e.slug}`)
    return terms.every((t) => hay.includes(t))
  })
}

const ASSET_BASE = `https://cdn.jsdelivr.net/npm/@bryllim/workout-guide@${catalogData.version}/assets`

export function exerciseImageUrl(slug: string | null, frame: 1 | 2 | 3 = 1): string | null {
  if (!slug || !bySlug.get(slug)?.hasImages) return null
  return `${ASSET_BASE}/${slug}/frame-${frame}.png`
}

const MUSCLES_ES: Record<string, string> = {
  Chest: 'Pecho',
  Shoulders: 'Hombros',
  'Rear Delts': 'Deltoides posterior',
  'Upper Back': 'Espalda alta',
  'Posterior Chain': 'Cadena posterior',
  Hamstrings: 'Isquiotibiales',
  Back: 'Espalda',
  Lats: 'Dorsales',
  Biceps: 'Bíceps',
  Quads: 'Cuádriceps',
  Glutes: 'Glúteos',
  Calves: 'Gemelos',
  Forearms: 'Antebrazos',
  Triceps: 'Tríceps',
  Core: 'Core',
  Legs: 'Piernas',
  'Lower Back': 'Zona lumbar',
  Adductors: 'Aductores',
  Mobility: 'Movilidad',
  Hips: 'Caderas',
  Cardio: 'Cardio',
  Groin: 'Ingle',
  Grip: 'Agarre',
}

const EQUIPMENT_ES: Record<string, string> = {
  Barbell: 'Barra',
  Dumbbell: 'Mancuernas',
  Machine: 'Máquina',
  Cable: 'Polea',
  Bodyweight: 'Peso corporal',
  Cardio: 'Cardio',
  Plate: 'Disco',
  Kettlebell: 'Kettlebell',
  'Pull-up Bar': 'Barra de dominadas',
  Bench: 'Banco',
  Wall: 'Pared',
  Chair: 'Silla',
  Doorway: 'Marco de puerta',
  Towel: 'Toalla',
  Box: 'Cajón',
  'Stability Ball': 'Fitball',
  'Resistance Band': 'Banda elástica',
}

export const muscleEs = (m: string) => MUSCLES_ES[m] ?? m
export const equipmentEs = (e: string) => EQUIPMENT_ES[e] ?? e
