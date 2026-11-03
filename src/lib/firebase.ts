import { initializeApp } from 'firebase/app'
import { connectAuthEmulator, getAuth } from 'firebase/auth'
import {
  connectFirestoreEmulator,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore'

const env = import.meta.env

export const useEmulators = env.VITE_USE_EMULATORS === 'true'

// Con emuladores siempre se usa el proyecto "demo-trena" (el mismo con el que
// arranca `npm run emulators`), aunque .env.local tenga el proyecto real.
const projectId = useEmulators ? 'demo-trena' : env.VITE_FIREBASE_PROJECT_ID || 'demo-trena'

export const app = initializeApp({
  apiKey: (!useEmulators && env.VITE_FIREBASE_API_KEY) || 'demo-api-key',
  authDomain: (!useEmulators && env.VITE_FIREBASE_AUTH_DOMAIN) || `${projectId}.firebaseapp.com`,
  projectId,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
})

export const auth = getAuth(app)

// Caché persistente en IndexedDB: lecturas y escrituras funcionan sin conexión
// y se sincronizan al volver la red. El tab manager la comparte entre pestañas.
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
})

if (useEmulators) {
  const host = window.location.hostname
  connectAuthEmulator(auth, `http://${host}:9099`, { disableWarnings: true })
  connectFirestoreEmulator(db, host, 8080)
}
