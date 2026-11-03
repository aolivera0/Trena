import { Placeholder } from '../components/Placeholder'
import { useEmulators } from '../lib/firebase'

export function SettingsPage() {
  return (
    <Placeholder title="Ajustes" phase={1}>
      Unidades (kg/lb), redondeo, fórmula de e1RM, RMs y créditos de las imágenes.
      <span className="mt-3 block text-xs">
        Firebase: {useEmulators ? 'emuladores locales' : 'proyecto real'}
      </span>
    </Placeholder>
  )
}
