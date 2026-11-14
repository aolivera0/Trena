import { RefreshCw } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useLocation } from 'react-router'
import { applyUpdateIfIdle, applyUpdateNow, onUpdateReady, updatePending } from '../lib/pwa'

// Aviso de versión nueva cuando no se pudo aplicar sola (sesión en curso o
// escribiendo). Al cambiar de pantalla se reintenta aplicarla.
export function UpdateBanner() {
  const [ready, setReady] = useState(updatePending)
  const { pathname } = useLocation()

  useEffect(() => onUpdateReady(() => setReady(true)), [])
  useEffect(() => {
    if (ready) applyUpdateIfIdle()
  }, [pathname, ready])

  if (!ready) return null
  return (
    <div className="flex items-center gap-3 border-b border-accent/30 bg-accent/10 px-4 py-2 text-sm">
      <RefreshCw size={16} className="shrink-0 text-accent" aria-hidden />
      <span className="flex-1">Hay una versión nueva de Trena.</span>
      <button type="button" onClick={applyUpdateNow} className="h-8 rounded-lg bg-accent px-3 font-semibold text-bg">
        Actualizar
      </button>
    </div>
  )
}
