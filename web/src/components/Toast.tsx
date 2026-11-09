import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react'

interface ToastItem {
  id: number
  message: string
  tone: 'ok' | 'info' | 'warn'
  action?: { label: string; onClick: () => void }
}

type ShowToast = (
  message: string,
  opts?: { tone?: ToastItem['tone']; action?: ToastItem['action']; ms?: number },
) => void

const Ctx = createContext<ShowToast>(() => {})

const tones = {
  ok: 'bg-green-800 text-white',
  info: 'bg-stone-800 text-white dark:bg-stone-700',
  warn: 'bg-amber-300 text-stone-950',
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])
  const seq = useRef(0)

  const show = useCallback<ShowToast>((message, opts = {}) => {
    const id = ++seq.current
    setItems((list) => [...list.slice(-2), { id, message, tone: opts.tone ?? 'ok', action: opts.action }])
    window.setTimeout(() => setItems((list) => list.filter((t) => t.id !== id)), opts.ms ?? 4000)
  }, [])

  return (
    <Ctx.Provider value={show}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-24 z-50 flex flex-col items-center gap-2 px-4"
        aria-live="polite"
      >
        {items.map((t) => (
          <div
            key={t.id}
            role="status"
            className={`pointer-events-auto flex w-full max-w-md animate-fade-up items-center gap-3 rounded-2xl px-4 py-3 text-base font-medium shadow-lg ${tones[t.tone]}`}
          >
            <span className="flex-1">{t.message}</span>
            {t.action && (
              <button
                type="button"
                className="min-h-12 rounded-xl px-3 font-bold underline underline-offset-4"
                onClick={() => {
                  t.action?.onClick()
                  setItems((list) => list.filter((x) => x.id !== t.id))
                }}
              >
                {t.action.label}
              </button>
            )}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  )
}

export const useToast = () => useContext(Ctx)
