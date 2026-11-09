// Genera src/data/catalog.json a partir del manifest de @bryllim/workout-guide.
// El paquete completo pesa ~3 MB; la app solo necesita estos campos, y las
// imágenes se sirven desde jsDelivr (cacheadas por el service worker).
//
// Uso: npm run catalog
import { writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)
const manifest = require('@bryllim/workout-guide/manifest.json')
const { version } = require('@bryllim/workout-guide/package.json')

// Ejercicios donde la carga real es peso corporal + lastre
const ADDS_BODYWEIGHT = new Set([
  'pull-up',
  'chin-up',
  'neutral-grip-pull-up',
  'dip',
  'chest-dip',
  'weighted-pull-up',
  'weighted-chin-up',
  'weighted-dip',
])

const NAMES_ES = {
  squat: 'Sentadilla',
  'front-squat': 'Sentadilla frontal',
  'bench-press': 'Press banca',
  'close-grip-bench-press': 'Press banca agarre cerrado',
  'incline-bench-press': 'Press banca inclinado',
  deadlift: 'Peso muerto',
  'sumo-deadlift': 'Peso muerto sumo',
  'romanian-deadlift': 'Peso muerto rumano',
  'pull-up': 'Dominadas',
  'chin-up': 'Dominadas supinas',
  'weighted-pull-up': 'Dominadas lastradas',
  'weighted-chin-up': 'Dominadas supinas lastradas',
  dip: 'Fondos',
  'weighted-dip': 'Fondos lastrados',
  'overhead-press': 'Press militar',
  'barbell-row': 'Remo con barra',
  'hip-thrust': 'Hip thrust',
}

// Ejercicios que no están en el paquete (sin imagen)
const EXTRA = [
  {
    slug: 'muscle-up',
    name: 'Muscle-Up',
    nameEs: 'Muscle-Up',
    equipment: 'Pull-up Bar',
    muscle: 'Lats',
    secondary: ['Biceps', 'Triceps', 'Chest', 'Core'],
    type: 'weight_reps',
    addsBodyweight: true,
    hasImages: false,
  },
]

const catalog = [
  ...manifest.map((e) => ({
    slug: e.slug,
    name: e.name,
    nameEs: NAMES_ES[e.slug] ?? null,
    equipment: e.equipment,
    muscle: e.primaryMuscle,
    secondary: e.secondaryMuscles,
    type: e.exerciseType,
    addsBodyweight: ADDS_BODYWEIGHT.has(e.slug),
    hasImages: true,
  })),
  ...EXTRA,
].sort((a, b) => (a.nameEs ?? a.name).localeCompare(b.nameEs ?? b.name, 'es'))

const out = new URL('../src/data/catalog.json', import.meta.url)
writeFileSync(out, JSON.stringify({ version, exercises: catalog }) + '\n')
console.log(`catalog.json: ${catalog.length} ejercicios (workout-guide ${version})`)
