import { Loader2, X } from 'lucide-react'
import {
  useEffect,
  useState,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
} from 'react'
import { onToast, type Toast } from '../lib/feedback'
import { kgToUnit, unitToKg, type Unit } from '../lib/strength/units'

// ---------- Botones ----------

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'

const buttonStyles: Record<ButtonVariant, string> = {
  primary: 'bg-accent text-bg hover:bg-accent/90 font-semibold',
  secondary: 'bg-surface-2 text-text hover:bg-border',
  ghost: 'text-muted hover:text-text hover:bg-surface-2',
  danger: 'bg-danger/15 text-danger hover:bg-danger/25',
}

export function Button({
  variant = 'secondary',
  size = 'md',
  loading,
  className = '',
  children,
  disabled,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
  size?: 'sm' | 'md'
  loading?: boolean
}) {
  const sizing = size === 'sm' ? 'h-8 px-3 text-sm gap-1.5' : 'h-11 px-4 gap-2'
  return (
    <button
      type="button"
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center rounded-lg transition-colors disabled:opacity-50 ${sizing} ${buttonStyles[variant]} ${className}`}
      {...props}
    >
      {loading && <Loader2 size={16} className="animate-spin" aria-hidden />}
      {children}
    </button>
  )
}

export function IconButton({
  label,
  className = '',
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={`inline-flex size-9 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface-2 hover:text-text disabled:opacity-40 ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}

// ---------- Formularios ----------

const fieldBase =
  'h-11 w-full rounded-lg border border-border bg-surface-2 px-3 text-text placeholder:text-muted/60 focus:border-accent focus:outline-none'

export function Input({ className = '', ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`${fieldBase} ${className}`} {...props} />
}

export function Select({ className = '', children, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={`${fieldBase} appearance-none pr-8 ${className}`} {...props}>
      {children}
    </select>
  )
}

export function Field({ label, hint, children }: { label: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium text-muted">{label}</span>
      {children}
      {hint && <span className="block text-xs text-muted">{hint}</span>}
    </label>
  )
}

function parseDecimal(text: string): number | null {
  const n = Number(text.replace(',', '.'))
  return text.trim() === '' || Number.isNaN(n) ? null : n
}

function formatDecimal(n: number | null): string {
  return n == null ? '' : String(Number(n.toFixed(2)))
}

// Input numérico que acepta coma decimal y deja escribir "82." sin perder el punto.
export function NumberInput({
  value,
  onChange,
  className = '',
  ...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'> & {
  value: number | null
  onChange: (value: number | null) => void
}) {
  const [text, setText] = useState(formatDecimal(value))

  useEffect(() => {
    // Sincroniza cuando el valor cambia desde fuera (no mientras se escribe lo mismo)
    if (parseDecimal(text) !== value) setText(formatDecimal(value))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  return (
    <input
      type="text"
      inputMode="decimal"
      className={`${fieldBase} tabular ${className}`}
      value={text}
      onChange={(e) => {
        setText(e.target.value)
        onChange(parseDecimal(e.target.value))
      }}
      {...props}
    />
  )
}

// Peso guardado en kg y mostrado en la unidad del usuario.
export function WeightInput({
  valueKg,
  onChangeKg,
  unit,
  ...props
}: Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'> & {
  valueKg: number | null
  onChangeKg: (kg: number | null) => void
  unit: Unit
}) {
  const shown = valueKg == null ? null : Number(kgToUnit(valueKg, unit).toFixed(2))
  return (
    <div className="relative">
      <NumberInput
        value={shown}
        onChange={(v) => onChangeKg(v == null ? null : unitToKg(v, unit))}
        className="pr-10"
        {...props}
      />
      <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted">
        {unit}
      </span>
    </div>
  )
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  size = 'md',
}: {
  value: T
  options: { value: T; label: string }[]
  onChange: (value: T) => void
  size?: 'sm' | 'md'
}) {
  return (
    <div className="flex rounded-lg bg-surface-2 p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`flex-1 rounded-md px-2 font-medium transition-colors ${
            size === 'sm' ? 'h-7 text-xs' : 'h-9 text-sm'
          } ${value === o.value ? 'bg-accent text-bg' : 'text-muted hover:text-text'}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean
  onChange: (checked: boolean) => void
  label: ReactNode
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 py-1">
      <span>{label}</span>
      <input
        type="checkbox"
        className="peer sr-only"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span className="relative h-6 w-11 shrink-0 rounded-full bg-border transition-colors after:absolute after:left-0.5 after:top-0.5 after:size-5 after:rounded-full after:bg-text after:transition-transform peer-checked:bg-accent peer-checked:after:translate-x-5 peer-focus-visible:ring-2 peer-focus-visible:ring-accent" />
    </label>
  )
}

// ---------- Contenedores ----------

export function Card({ className = '', children }: { className?: string; children: ReactNode }) {
  return <div className={`rounded-xl border border-border bg-surface p-4 ${className}`}>{children}</div>
}

export function Badge({ tone = 'muted', children }: { tone?: 'muted' | 'success' | 'warning' | 'accent'; children: ReactNode }) {
  const tones = {
    muted: 'bg-surface-2 text-muted',
    success: 'bg-success/15 text-success',
    warning: 'bg-warning/15 text-warning',
    accent: 'bg-accent/15 text-accent',
  }
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${tones[tone]}`}>
      {children}
    </span>
  )
}

export function PageHeader({ title, subtitle, action }: { title: ReactNode; subtitle?: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-5 flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h1 className="truncate text-2xl font-bold">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted">
      {children}
    </div>
  )
}

export function Spinner() {
  return <Loader2 size={20} className="animate-spin text-muted" aria-label="Cargando" />
}

export function FullScreenSpinner() {
  return (
    <div className="flex min-h-dvh items-center justify-center">
      <Spinner />
    </div>
  )
}

// Hoja inferior en móvil, diálogo centrado en pantallas grandes.
export function Sheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 sm:items-center" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="flex max-h-[90dvh] w-full max-w-xl flex-col rounded-t-2xl border border-border bg-surface sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="font-semibold">{title}</h2>
          <IconButton label="Cerrar" onClick={onClose}>
            <X size={20} />
          </IconButton>
        </div>
        <div className="overflow-y-auto p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">{children}</div>
      </div>
    </div>
  )
}

export function Toaster() {
  const [toasts, setToasts] = useState<Toast[]>([])

  useEffect(
    () =>
      onToast((t) => {
        setToasts((ts) => [...ts, t])
        setTimeout(() => setToasts((ts) => ts.filter((x) => x.id !== t.id)), 4000)
      }),
    [],
  )

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-20 z-[60] flex flex-col items-center gap-2 px-4">
      {toasts.map((t) => (
        <div
          key={t.id}
          role="status"
          className={`rounded-lg px-4 py-2.5 text-sm shadow-lg ${
            t.tone === 'error' ? 'bg-danger text-white' : 'bg-surface-2 text-text'
          }`}
        >
          {t.message}
        </div>
      ))}
    </div>
  )
}
