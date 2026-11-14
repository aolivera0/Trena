import { registerSW } from 'virtual:pwa-register'

// Actualización de la PWA instalada. El service worker nuevo se activa solo
// (autoUpdate); lo que se controla es cuándo recargar la pantalla:
// - fuera de una sesión y sin estar escribiendo → se recarga sola;
// - durante una sesión o con un campo enfocado → se avisa (UpdateBanner) y se
//   recarga al tocar "Actualizar" o al salir de la sesión, para no cortar un
//   registro a medias.

const READY_EVENT = 'trena:update-ready'
const CHECK_INTERVAL_MS = 30 * 60 * 1000

let reloadPending = false

export const updatePending = () => reloadPending

function isBusy() {
  const el = document.activeElement
  const typing = el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement
  return typing || location.pathname.startsWith('/session/')
}

// Recarga si hay versión nueva y no se está entrenando ni escribiendo
export function applyUpdateIfIdle() {
  if (reloadPending && !isBusy()) window.location.reload()
}

export function applyUpdateNow() {
  window.location.reload()
}

export function onUpdateReady(listener: () => void) {
  window.addEventListener(READY_EVENT, listener)
  return () => window.removeEventListener(READY_EVENT, listener)
}

export function setupPwa() {
  if (!('serviceWorker' in navigator)) return
  registerSW({
    immediate: true,
    onNeedReload() {
      reloadPending = true
      window.dispatchEvent(new Event(READY_EVENT))
      applyUpdateIfIdle()
    },
    onRegisteredSW(_url, registration) {
      if (!registration) return
      // Una PWA puede quedar abierta días: buscar versiones nuevas cada rato
      // y cada vez que se vuelve a la app
      const check = () => {
        if (navigator.onLine) void registration.update().catch(() => {})
      }
      setInterval(check, CHECK_INTERVAL_MS)
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') check()
      })
    },
  })
}
