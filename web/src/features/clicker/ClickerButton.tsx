import { useRef, type PointerEvent, type KeyboardEvent } from 'react'
import { audioHealthy, ensureAudio, playClick } from '../../lib/audio'
import { vibrate } from '../../lib/haptics'

/**
 * Botão do clicker. Dispara no `pointerdown` (o `click` chega 50 a 300 ms atrasado no celular).
 * A animação é feita direto no elemento, sem re-render do React, para não atrasar o som.
 */
export function ClickerButton({
  onClick,
  size = 'full',
  label = 'Clique',
  hint,
}: {
  onClick?: () => void
  size?: 'full' | 'compact'
  label?: string
  hint?: string
}) {
  const ref = useRef<HTMLButtonElement>(null)
  // Som que ficou para o fim do toque: o áudio precisava ser (re)ligado, e no celular
  // só dá para fazer isso quando o dedo sai da tela.
  const pendingSound = useRef(false)

  function fire() {
    if (audioHealthy()) playClick()
    else pendingSound.current = true
    vibrate(15)
    const el = ref.current
    if (el) {
      el.classList.remove('clicker-hit')
      void el.offsetWidth // reinicia a animação
      el.classList.add('clicker-hit')
    }
    onClick?.()
  }

  function onPointerDown(e: PointerEvent<HTMLButtonElement>) {
    if (e.button !== 0) return
    e.preventDefault()
    fire()
  }

  function flushPendingSound() {
    if (!pendingSound.current) return
    pendingSound.current = false
    ensureAudio()
    playClick()
  }

  function onKeyDown(e: KeyboardEvent<HTMLButtonElement>) {
    if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) {
      e.preventDefault()
      fire()
      flushPendingSound() // tecla já conta como toque: dá para ligar o som na hora
    }
  }

  const cls =
    size === 'full'
      ? 'aspect-square w-full max-w-[22rem] rounded-full text-4xl'
      : 'min-h-20 w-full rounded-3xl text-xl'

  return (
    <button
      ref={ref}
      type="button"
      onPointerDown={onPointerDown}
      onPointerUp={flushPendingSound}
      onTouchEnd={flushPendingSound}
      onPointerCancel={() => (pendingSound.current = false)}
      onKeyDown={onKeyDown}
      onContextMenu={(e) => e.preventDefault()}
      aria-label={hint ? `${label}. ${hint}` : label}
      className={`clicker-btn mx-auto flex select-none flex-col items-center justify-center bg-brand-700 font-extrabold text-white shadow-xl ring-8 ring-brand-200 dark:ring-brand-900 ${cls}`}
      style={{ touchAction: 'manipulation', WebkitTouchCallout: 'none', WebkitUserSelect: 'none' }}
    >
      {label}
      {hint && <span className="mt-1 text-sm font-semibold opacity-90">{hint}</span>}
    </button>
  )
}
