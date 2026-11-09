import { useEffect, useRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { X } from 'lucide-react'

type Tone = 'brand' | 'green' | 'red' | 'sky' | 'neutral' | 'ghost'

const toneClasses: Record<Tone, string> = {
  brand: 'bg-brand-700 text-white active:bg-brand-800',
  green: 'bg-green-700 text-white active:bg-green-800',
  red: 'bg-red-700 text-white active:bg-red-800',
  sky: 'bg-sky-700 text-white active:bg-sky-800',
  neutral:
    'bg-white text-stone-900 ring-1 ring-stone-300 active:bg-stone-100 dark:bg-stone-800 dark:text-stone-100 dark:ring-stone-700 dark:active:bg-stone-700',
  ghost: 'bg-transparent text-stone-700 active:bg-stone-200 dark:text-stone-200 dark:active:bg-stone-800',
}

interface BtnProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  tone?: Tone
  size?: 'md' | 'lg' | 'xl'
  icon?: ReactNode
}

const sizes = {
  md: 'min-h-12 px-4 text-base gap-2 rounded-xl',
  lg: 'min-h-16 px-5 text-lg gap-3 rounded-2xl',
  xl: 'min-h-24 px-5 text-xl gap-3 rounded-3xl',
}

export function Button({ tone = 'brand', size = 'md', icon, className = '', children, ...rest }: BtnProps) {
  return (
    <button
      type="button"
      className={`inline-flex select-none items-center justify-center font-semibold transition active:animate-pop disabled:opacity-40 ${sizes[size]} ${toneClasses[tone]} ${className}`}
      {...rest}
    >
      {icon}
      {children}
    </button>
  )
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <section
      className={`rounded-3xl bg-white p-4 shadow-sm ring-1 ring-stone-200 dark:bg-stone-900 dark:ring-stone-800 ${className}`}
    >
      {children}
    </section>
  )
}

export function PageHeader({ title, subtitle, right }: { title: string; subtitle?: ReactNode; right?: ReactNode }) {
  return (
    <header className="flex items-start justify-between gap-3 pb-4 pt-4">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold leading-tight">{title}</h1>
        {subtitle && <p className="mt-0.5 text-stone-600 dark:text-stone-400">{subtitle}</p>}
      </div>
      {right}
    </header>
  )
}

export function Segmented<T extends string | number>({
  value,
  options,
  onChange,
  label,
}: {
  value: T
  options: { value: T; label: string }[]
  onChange: (v: T) => void
  label: string
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex gap-1 rounded-2xl bg-stone-200 p-1 dark:bg-stone-800">
      {options.map((o) => {
        const active = o.value === value
        return (
          <button
            key={String(o.value)}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={`min-h-12 flex-1 rounded-xl px-2 text-base font-semibold transition ${
              active
                ? 'bg-white text-stone-900 shadow dark:bg-stone-600 dark:text-white'
                : 'text-stone-600 dark:text-stone-300'
            }`}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

/** Painel que sobe de baixo da tela, usando <dialog> nativo (acessível e fecha com Esc). */
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
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open && !d.open) d.showModal()
    if (!open && d.open) d.close()
  }, [open])
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      aria-label={title}
      className="mx-auto mb-0 mt-auto max-h-[92dvh] w-full max-w-lg rounded-t-3xl bg-white p-0 text-stone-900 backdrop:bg-black/50 dark:bg-stone-900 dark:text-stone-100"
    >
      {open && (
        <div className="animate-fade-up px-4 pb-safe">
          <div className="sticky top-0 z-10 flex items-center justify-between bg-white py-3 dark:bg-stone-900">
            <h2 className="text-xl font-bold">{title}</h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar"
              className="grid size-12 place-items-center rounded-full active:bg-stone-200 dark:active:bg-stone-800"
            >
              <X aria-hidden />
            </button>
          </div>
          <div className="pb-6">{children}</div>
        </div>
      )}
    </dialog>
  )
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="font-semibold">{label}</span>
      {children}
      {hint && <span className="text-sm text-stone-600 dark:text-stone-400">{hint}</span>}
    </label>
  )
}

export function ProgressRing({
  value,
  size = 140,
  stroke = 14,
  children,
  label,
}: {
  value: number // 0..1
  size?: number
  stroke?: number
  children?: ReactNode
  label: string
}) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const v = Math.max(0, Math.min(1, value))
  return (
    <div className="relative grid shrink-0 place-items-center" style={{ width: size, height: size }} role="img" aria-label={label}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} strokeWidth={stroke} className="fill-none stroke-stone-200 dark:stroke-stone-800" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - v)}
          className={`fill-none transition-[stroke-dashoffset] duration-500 ${v >= 1 ? 'stroke-green-600' : 'stroke-brand-600'}`}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">{children}</div>
    </div>
  )
}

export function ProgressBar({ value, label }: { value: number; label: string }) {
  const v = Math.max(0, Math.min(1, value))
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(v * 100)}
      className="h-3 w-full overflow-hidden rounded-full bg-stone-200 dark:bg-stone-800"
    >
      <div
        className={`h-full rounded-full transition-all duration-500 ${v >= 1 ? 'bg-green-600' : 'bg-brand-600'}`}
        style={{ width: `${v * 100}%` }}
      />
    </div>
  )
}

export function Empty({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-2xl border-2 border-dashed border-stone-300 p-6 text-center text-stone-600 dark:border-stone-700 dark:text-stone-400">
      {children}
    </p>
  )
}
