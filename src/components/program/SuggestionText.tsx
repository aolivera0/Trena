import { useProfile } from '../../auth/AuthProvider'
import { formatPlateWeight } from '../../lib/format'
import type { Suggestion } from '../../lib/strength/prescription'

// "≈ 162.5 kg", "≈ +30 kg de lastre", "Asistida", o el motivo si no hay sugerencia
export function SuggestionText({ suggestion, addsBodyweight }: { suggestion: Suggestion; addsBodyweight: boolean }) {
  const { profile } = useProfile()
  const { unit, roundingKg } = profile.prefs

  if (suggestion.kind === 'missing') return <span className="text-xs text-muted">{suggestion.reason}</span>
  if (suggestion.assisted) return <span className="text-xs text-warning">Necesita asistencia</span>
  const w = formatPlateWeight(suggestion.kg, unit, roundingKg)
  return (
    <span className="tabular text-xs text-accent">
      ≈ {addsBodyweight ? `+${w} lastre` : w}
    </span>
  )
}
