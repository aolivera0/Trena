// Pitidos del descanso con Web Audio (sin archivos de sonido). Los navegadores
// solo permiten audio después de un gesto del usuario: unlockAudio() se llama
// al marcar una serie.
let ctx: AudioContext | null = null

export function unlockAudio() {
  try {
    ctx ??= new AudioContext()
    if (ctx.state === 'suspended') void ctx.resume()
  } catch {
    // Sin Web Audio: el descanso sigue funcionando en silencio
  }
}

export function beep(durationMs = 120, frequency = 880) {
  if (!ctx || ctx.state !== 'running') return
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = 'sine'
  osc.frequency.value = frequency
  const t = ctx.currentTime
  gain.gain.setValueAtTime(0.0001, t)
  gain.gain.exponentialRampToValueAtTime(0.3, t + 0.01)
  gain.gain.exponentialRampToValueAtTime(0.0001, t + durationMs / 1000)
  osc.connect(gain).connect(ctx.destination)
  osc.start(t)
  osc.stop(t + durationMs / 1000 + 0.02)
}

export function vibrate(pattern: number | number[]) {
  try {
    navigator.vibrate?.(pattern)
  } catch {
    // iOS no soporta vibración
  }
}
