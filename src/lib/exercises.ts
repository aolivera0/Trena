import catalogData from '../data/catalog.json'
import type { CustomExercise, ExerciseRef, WithId } from './types'

export type CatalogExercise = {
  slug: string
  name: string
  nameEs: string | null
  equipment: string
  muscle: string
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
