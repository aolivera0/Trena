import { Check, ChevronRight, Copy, Share2, UserPlus } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import { useProfile } from '../auth/AuthProvider'
import { Avatar } from '../components/ProgramList'
import { Badge, Button, Card, EmptyState, PageHeader, Spinner } from '../components/ui'
import { useAthletes } from '../hooks/useAthletes'
import { createInvite } from '../lib/db'
import { toast } from '../lib/feedback'

export function CoachPage() {
  const { user, profile } = useProfile()
  const { data: athletes, loading } = useAthletes()
  const [link, setLink] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [copied, setCopied] = useState(false)

  async function invite() {
    setCreating(true)
    try {
      const token = await createInvite(user.uid, profile.displayName)
      setLink(`${window.location.origin}/invite/${token}`)
      setCopied(false)
    } catch (err) {
      console.error(err)
      toast('No se pudo crear la invitación. ¿Tienes conexión?', 'error')
    } finally {
      setCreating(false)
    }
  }

  async function copy() {
    if (!link) return
    await navigator.clipboard.writeText(link)
    setCopied(true)
  }

  async function share() {
    if (!link) return
    try {
      await navigator.share({ title: 'Trena', text: `${profile.displayName} te invita a entrenar en Trena`, url: link })
    } catch {
      // El usuario cerró el diálogo de compartir
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Atletas" subtitle={`${athletes.length} a tu cargo`} />

      <Card className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold">Invitar atleta</h2>
            <p className="text-sm text-muted">Link de un solo uso, vence en 7 días.</p>
          </div>
          <Button size="sm" variant="primary" onClick={invite} loading={creating}>
            <UserPlus size={16} /> {link ? 'Otro' : 'Crear link'}
          </Button>
        </div>
        {link && (
          <div className="space-y-2">
            <code className="block break-all rounded-lg bg-surface-2 p-3 text-xs">{link}</code>
            <div className="flex gap-2">
              <Button size="sm" onClick={copy}>
                {copied ? <Check size={16} /> : <Copy size={16} />} {copied ? 'Copiado' : 'Copiar'}
              </Button>
              {'share' in navigator && (
                <Button size="sm" onClick={share}>
                  <Share2 size={16} /> Compartir
                </Button>
              )}
            </div>
          </div>
        )}
      </Card>

      <section className="space-y-3">
        {loading ? (
          <Spinner />
        ) : athletes.length === 0 && !profile.roles.athlete ? (
          <EmptyState>Todavía no tienes atletas. Comparte un link de invitación.</EmptyState>
        ) : (
          <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
            {profile.roles.athlete && (
              <li>
                <Link to={`/athlete/${user.uid}`} className="flex items-center gap-3 p-4 hover:bg-surface-2">
                  <Avatar profile={profile} />
                  <span className="flex-1 font-medium">{profile.displayName}</span>
                  <Badge tone="accent">Tú</Badge>
                  <ChevronRight size={18} className="text-muted" />
                </Link>
              </li>
            )}
            {athletes.map((a) => (
              <li key={a.id}>
                <Link to={`/athlete/${a.id}`} className="flex items-center gap-3 p-4 hover:bg-surface-2">
                  <Avatar profile={a} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{a.displayName}</span>
                    <span className="block truncate text-xs text-muted">{a.email}</span>
                  </span>
                  <ChevronRight size={18} className="text-muted" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
