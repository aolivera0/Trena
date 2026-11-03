// Notificaciones ligeras (toasts) sin dependencias.

export type Toast = { id: number; message: string; tone: 'info' | 'error' }

const EVENT = 'trena:toast'
let nextId = 1

export function toast(message: string, tone: Toast['tone'] = 'info') {
  window.dispatchEvent(new CustomEvent<Toast>(EVENT, { detail: { id: nextId++, message, tone } }))
}

export function onToast(listener: (t: Toast) => void) {
  const handler = (e: Event) => listener((e as CustomEvent<Toast>).detail)
  window.addEventListener(EVENT, handler)
  return () => window.removeEventListener(EVENT, handler)
}

// Las escrituras de Firestore se aplican al instante en la caché local, pero la
// promesa solo se resuelve cuando el servidor confirma (nunca, si no hay red).
// Por eso la UI no las espera: se lanzan y solo se avisa si fallan.
export function track(promise: Promise<unknown>, errorMessage = 'No se pudo guardar') {
  promise.catch((err: unknown) => {
    console.error(err)
    const code = (err as { code?: string }).code
    toast(code === 'permission-denied' ? `${errorMessage}: sin permiso` : errorMessage, 'error')
  })
}
