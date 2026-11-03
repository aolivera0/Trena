// Tests de las reglas de Firestore. Necesitan el emulador:
//   npm run test:rules        (levanta el emulador, corre y lo apaga)
// o, con el emulador ya corriendo (npm run emulators):
//   npx vitest run --config vitest.rules.config.ts
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from '@firebase/rules-unit-testing'
import {
  Timestamp,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
  writeBatch,
  type Firestore,
} from 'firebase/firestore'
import { readFileSync } from 'node:fs'
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest'

let env: RulesTestEnvironment

const COACH = 'coach'
const ATHLETE = 'athlete'
const OTHER = 'other'
const PROGRAM = 'prog1'

const profile = (over: Record<string, unknown> = {}) => ({
  displayName: 'X',
  email: 'x@x.com',
  photoURL: null,
  roles: { athlete: true, coach: false },
  coachId: null,
  coachName: null,
  inviteToken: null,
  prefs: { unit: 'kg', roundingKg: 2.5, e1rmFormula: 'epley' },
  bodyweightKg: 80,
  ...over,
})

const week = (status: 'DRAFT' | 'PUBLISHED', index: number) => ({
  index,
  name: `Semana ${index}`,
  status,
  publishedAt: null,
  days: [],
})

const futureTs = () => Timestamp.fromMillis(Date.now() + 86_400_000)

const as = (uid: string): Firestore => env.authenticatedContext(uid).firestore() as unknown as Firestore

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: 'demo-trena-rules',
    firestore: { rules: readFileSync('firestore.rules', 'utf8'), host: '127.0.0.1', port: 8080 },
  })
})

afterAll(() => env?.cleanup())

// Escenario base: entrenador con un atleta vinculado; programa del entrenador
// con semana 1 publicada y semana 2 en borrador.
beforeEach(async () => {
  await env.clearFirestore()
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore()
    await setDoc(doc(db, 'users', COACH), profile({ roles: { athlete: false, coach: true }, displayName: 'Coach' }))
    await setDoc(doc(db, 'users', ATHLETE), profile({ coachId: COACH, coachName: 'Coach', inviteToken: 't0' }))
    await setDoc(doc(db, 'users', OTHER), profile())
    await setDoc(doc(db, 'users', ATHLETE, 'programs', PROGRAM), { name: 'Bloque', ownerId: COACH })
    await setDoc(doc(db, 'users', ATHLETE, 'programs', PROGRAM, 'weeks', 'w1'), week('PUBLISHED', 1))
    await setDoc(doc(db, 'users', ATHLETE, 'programs', PROGRAM, 'weeks', 'w2'), week('DRAFT', 2))
    await setDoc(doc(db, 'users', ATHLETE, 'rms', 'wg:squat'), { e1rmKg: 200 })
  })
})

const weekDoc = (db: Firestore, id: string) => doc(db, 'users', ATHLETE, 'programs', PROGRAM, 'weeks', id)
const weeksCol = (db: Firestore) => collection(db, 'users', ATHLETE, 'programs', PROGRAM, 'weeks')

describe('R-2: semanas en borrador', () => {
  it('el atleta ve la semana publicada', async () => {
    await assertSucceeds(getDoc(weekDoc(as(ATHLETE), 'w1')))
  })

  it('el atleta NO ve la semana 2 sin publicar', async () => {
    await assertFails(getDoc(weekDoc(as(ATHLETE), 'w2')))
  })

  it('el atleta solo puede listar con el filtro de publicadas', async () => {
    await assertFails(getDocs(weeksCol(as(ATHLETE))))
    await assertSucceeds(getDocs(query(weeksCol(as(ATHLETE)), where('status', '==', 'PUBLISHED'))))
  })

  it('al publicar, el atleta la ve', async () => {
    await assertSucceeds(updateDoc(weekDoc(as(COACH), 'w2'), { status: 'PUBLISHED' }))
    await assertSucceeds(getDoc(weekDoc(as(ATHLETE), 'w2')))
  })

  it('el atleta no puede editar ni publicar el programa del entrenador', async () => {
    await assertFails(updateDoc(weekDoc(as(ATHLETE), 'w2'), { status: 'PUBLISHED' }))
    await assertFails(updateDoc(weekDoc(as(ATHLETE), 'w1'), { name: 'hack' }))
  })

  it('el entrenador ve y edita los borradores', async () => {
    await assertSucceeds(getDocs(weeksCol(as(COACH))))
    await assertSucceeds(updateDoc(weekDoc(as(COACH), 'w2'), { name: 'Semana 2 — carga' }))
  })

  it('alguien ajeno no ve nada', async () => {
    await assertFails(getDoc(weekDoc(as(OTHER), 'w1')))
    await assertFails(getDoc(doc(as(OTHER), 'users', ATHLETE)))
    await assertFails(getDoc(doc(as(OTHER), 'users', ATHLETE, 'rms', 'wg:squat')))
  })
})

describe('programas propios del atleta', () => {
  it('el atleta crea un programa con su primera semana y ve sus borradores', async () => {
    const db = as(ATHLETE)
    const batch = writeBatch(db)
    batch.set(doc(db, 'users', ATHLETE, 'programs', 'mine'), { name: 'Propio', ownerId: ATHLETE })
    batch.set(doc(db, 'users', ATHLETE, 'programs', 'mine', 'weeks', 'a'), week('DRAFT', 1))
    await assertSucceeds(batch.commit())
    await assertSucceeds(getDoc(doc(db, 'users', ATHLETE, 'programs', 'mine', 'weeks', 'a')))
  })

  it('el atleta no puede crear programas a nombre de otro', async () => {
    await assertFails(setDoc(doc(as(ATHLETE), 'users', ATHLETE, 'programs', 'x'), { name: 'X', ownerId: COACH }))
  })

  it('el entrenador no puede escribir en atletas ajenos', async () => {
    await assertFails(setDoc(doc(as(COACH), 'users', OTHER, 'programs', 'x'), { name: 'X', ownerId: COACH }))
  })
})

describe('perfiles', () => {
  it('nadie se asigna un entrenador sin invitación', async () => {
    await assertFails(updateDoc(doc(as(OTHER), 'users', OTHER), { coachId: COACH, coachName: 'Coach' }))
  })

  it('no se puede crear un perfil ya vinculado', async () => {
    await assertFails(setDoc(doc(as('new'), 'users', 'new'), profile({ coachId: COACH })))
    await assertSucceeds(setDoc(doc(as('new'), 'users', 'new'), profile()))
  })

  it('el atleta cambia sus preferencias', async () => {
    await assertSucceeds(updateDoc(doc(as(ATHLETE), 'users', ATHLETE), { 'prefs.unit': 'lb' }))
  })

  it('el entrenador lee a su atleta, no a otros', async () => {
    await assertSucceeds(getDoc(doc(as(COACH), 'users', ATHLETE)))
    await assertFails(getDoc(doc(as(COACH), 'users', OTHER)))
    await assertSucceeds(getDocs(query(collection(as(COACH), 'users'), where('coachId', '==', COACH))))
  })

  it('el entrenador solo puede desvincular, no editar el perfil', async () => {
    await assertFails(updateDoc(doc(as(COACH), 'users', ATHLETE), { bodyweightKg: 50 }))
    await assertSucceeds(
      updateDoc(doc(as(COACH), 'users', ATHLETE), { coachId: null, coachName: null, inviteToken: null }),
    )
  })

  it('el atleta puede desvincularse', async () => {
    await assertSucceeds(
      updateDoc(doc(as(ATHLETE), 'users', ATHLETE), { coachId: null, coachName: null, inviteToken: null }),
    )
  })
})

describe('invitaciones', () => {
  const invite = (over: Record<string, unknown> = {}) => ({
    coachId: COACH,
    coachName: 'Coach',
    createdAt: Timestamp.now(),
    expiresAt: futureTs(),
    usedBy: null,
    usedAt: null,
    ...over,
  })

  async function seedInvite(token: string, over: Record<string, unknown> = {}) {
    await env.withSecurityRulesDisabled((ctx) => setDoc(doc(ctx.firestore(), 'invites', token), invite(over)))
  }

  function accept(db: Firestore, uid: string, token: string, coachId = COACH) {
    const batch = writeBatch(db)
    batch.update(doc(db, 'users', uid), {
      coachId,
      coachName: 'Coach',
      inviteToken: token,
      roles: { athlete: true, coach: false },
    })
    batch.update(doc(db, 'invites', token), { usedBy: uid, usedAt: Timestamp.now() })
    return batch.commit()
  }

  it('solo un entrenador crea invitaciones a su nombre', async () => {
    await assertSucceeds(setDoc(doc(as(COACH), 'invites', 'a'), invite()))
    await assertFails(setDoc(doc(as(OTHER), 'invites', 'b'), invite({ coachId: OTHER })))
    await assertFails(setDoc(doc(as(OTHER), 'invites', 'c'), invite()))
  })

  it('aceptar una invitación válida vincula al atleta', async () => {
    await seedInvite('ok')
    await assertSucceeds(accept(as(OTHER), OTHER, 'ok'))
    await assertSucceeds(getDoc(doc(as(COACH), 'users', OTHER)))
  })

  it('no se puede usar dos veces', async () => {
    await seedInvite('used', { usedBy: ATHLETE })
    await assertFails(accept(as(OTHER), OTHER, 'used'))
  })

  it('no se puede usar vencida', async () => {
    await seedInvite('old', { expiresAt: Timestamp.fromMillis(Date.now() - 1000) })
    await assertFails(accept(as(OTHER), OTHER, 'old'))
  })

  it('no se puede apuntar a otro entrenador distinto al de la invitación', async () => {
    await seedInvite('ok2')
    await assertFails(accept(as(OTHER), OTHER, 'ok2', ATHLETE))
  })

  it('no se puede vincular sin marcar la invitación como usada', async () => {
    await seedInvite('ok3')
    await assertFails(
      updateDoc(doc(as(OTHER), 'users', OTHER), { coachId: COACH, coachName: 'Coach', inviteToken: 'ok3' }),
    )
  })
})

describe('ejercicios propios', () => {
  it('se crean a nombre propio y los lee cualquiera con sesión', async () => {
    await assertSucceeds(setDoc(doc(as(COACH), 'exercises', 'e1'), { name: 'Front lever', ownerId: COACH }))
    await assertFails(setDoc(doc(as(COACH), 'exercises', 'e2'), { name: 'X', ownerId: ATHLETE }))
    await assertSucceeds(getDoc(doc(as(ATHLETE), 'exercises', 'e1')))
    await assertFails(updateDoc(doc(as(ATHLETE), 'exercises', 'e1'), { name: 'Hack' }))
  })
})
