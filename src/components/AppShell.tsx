import { Calculator, ChartLine, Dumbbell, Settings, Users, WifiOff } from 'lucide-react'
import { Link, NavLink, Outlet } from 'react-router'
import { useProfile } from '../auth/AuthProvider'
import { useOnlineStatus } from '../hooks/useOnlineStatus'

const tabs = [
  { to: '/', label: 'Entrenar', icon: Dumbbell, end: true, role: 'athlete' },
  { to: '/history', label: 'Historial', icon: ChartLine, role: 'athlete' },
  { to: '/coach', label: 'Atletas', icon: Users, role: 'coach' },
  { to: '/settings', label: 'Ajustes', icon: Settings },
] as const

export function AppShell() {
  const online = useOnlineStatus()
  const { profile } = useProfile()
  const visible = tabs.filter((t) => !('role' in t) || profile.roles[t.role])

  return (
    <div className="mx-auto flex min-h-dvh max-w-xl flex-col">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-bg/90 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur">
        <span className="text-lg font-bold tracking-tight">Trena</span>
        <div className="flex items-center gap-2">
          {!online && (
            <span className="flex items-center gap-1.5 rounded-full bg-warning/15 px-2.5 py-1 text-xs font-medium text-warning">
              <WifiOff size={14} aria-hidden />
              Sin conexión
            </span>
          )}
          <Link
            to="/calculator"
            aria-label="Calculadora RPE"
            title="Calculadora RPE"
            className="-mr-2 flex size-9 items-center justify-center rounded-lg text-muted hover:text-text"
          >
            <Calculator size={20} />
          </Link>
        </div>
      </header>

      <main className="flex-1 px-4 py-5">
        <Outlet />
      </main>

      <nav
        className="sticky bottom-0 grid border-t border-border bg-bg/95 pb-[env(safe-area-inset-bottom)] backdrop-blur"
        style={{ gridTemplateColumns: `repeat(${visible.length}, 1fr)` }}
      >
        {visible.map(({ to, label, icon: Icon, ...t }) => (
          <NavLink
            key={to}
            to={to}
            end={'end' in t}
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors ${
                isActive ? 'text-accent' : 'text-muted hover:text-text'
              }`
            }
          >
            <Icon size={22} aria-hidden />
            {label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
