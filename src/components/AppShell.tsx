import { ChartLine, Dumbbell, Settings, Users, WifiOff } from 'lucide-react'
import { NavLink, Outlet } from 'react-router'
import { useOnlineStatus } from '../hooks/useOnlineStatus'

const tabs = [
  { to: '/', label: 'Entrenar', icon: Dumbbell, end: true },
  { to: '/history', label: 'Historial', icon: ChartLine },
  { to: '/coach', label: 'Atletas', icon: Users },
  { to: '/settings', label: 'Ajustes', icon: Settings },
]

export function AppShell() {
  const online = useOnlineStatus()

  return (
    <div className="mx-auto flex min-h-dvh max-w-xl flex-col">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-bg/90 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur">
        <span className="text-lg font-bold tracking-tight">Trena</span>
        {!online && (
          <span className="flex items-center gap-1.5 rounded-full bg-warning/15 px-2.5 py-1 text-xs font-medium text-warning">
            <WifiOff size={14} aria-hidden />
            Sin conexión
          </span>
        )}
      </header>

      <main className="flex-1 px-4 py-5">
        <Outlet />
      </main>

      <nav className="sticky bottom-0 grid grid-cols-4 border-t border-border bg-bg/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
        {tabs.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
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
