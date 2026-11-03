// Token de invitación recordado mientras el atleta inicia sesión o crea su perfil.
const KEY = 'trena:pendingInvite'

export function getPendingInvite(): string | null {
  try {
    return localStorage.getItem(KEY)
  } catch {
    return null
  }
}

export function setPendingInvite(token: string | null) {
  try {
    if (token) localStorage.setItem(KEY, token)
    else localStorage.removeItem(KEY)
  } catch {
    // Sin almacenamiento (modo privado): el atleta tendrá que abrir el link de nuevo
  }
}
