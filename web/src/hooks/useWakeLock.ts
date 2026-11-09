import { useEffect, useState } from 'react'

/**
 * Mantém a tela acesa enquanto `active` for verdadeiro (Wake Lock API).
 * O navegador solta a trava quando o app sai da tela; pedimos de novo ao voltar.
 */
export function useWakeLock(active: boolean): { supported: boolean; locked: boolean } {
  const supported = typeof navigator !== 'undefined' && 'wakeLock' in navigator
  const [locked, setLocked] = useState(false)

  useEffect(() => {
    if (!supported || !active) return
    let sentinel: WakeLockSentinel | null = null
    let cancelled = false

    async function acquire() {
      if (document.visibilityState !== 'visible') return
      try {
        sentinel = await navigator.wakeLock.request('screen')
        if (cancelled) {
          void sentinel.release()
          return
        }
        setLocked(true)
        sentinel.addEventListener('release', () => setLocked(false))
      } catch {
        setLocked(false)
      }
    }

    const onVisible = () => {
      if (document.visibilityState === 'visible' && (!sentinel || sentinel.released)) void acquire()
    }

    void acquire()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', onVisible)
      void sentinel?.release().catch(() => {})
      setLocked(false)
    }
  }, [active, supported])

  return { supported, locked }
}
