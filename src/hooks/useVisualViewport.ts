import { useEffect, useState } from 'react'

type Viewport = { height: number; offsetTop: number }

function read(): Viewport {
  const vv = window.visualViewport
  return vv ? { height: vv.height, offsetTop: vv.offsetTop } : { height: window.innerHeight, offsetTop: 0 }
}

// Área visible real: en móvil se encoge cuando aparece el teclado (en iOS la
// página además se desplaza). Sirve para que una vista a pantalla completa no
// quede tapada por el teclado.
export function useVisualViewport(enabled = true): Viewport {
  const [vp, setVp] = useState(read)
  useEffect(() => {
    if (!enabled) return
    const vv = window.visualViewport
    const update = () => setVp(read())
    update()
    vv?.addEventListener('resize', update)
    vv?.addEventListener('scroll', update)
    window.addEventListener('resize', update)
    return () => {
      vv?.removeEventListener('resize', update)
      vv?.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [enabled])
  return vp
}
