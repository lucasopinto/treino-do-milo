import { useEffect, useState } from 'react'

/** Hora atual, atualizada a cada `intervalMs` e ao voltar para o app. */
export function useNow(intervalMs = 1000): Date {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const update = () => setNow(new Date())
    // Alinha com a virada do segundo para o relógio não "pular".
    let interval: number | undefined
    const align = window.setTimeout(() => {
      update()
      interval = window.setInterval(update, intervalMs)
    }, intervalMs - (Date.now() % intervalMs))
    document.addEventListener('visibilitychange', update)
    return () => {
      window.clearTimeout(align)
      if (interval) window.clearInterval(interval)
      document.removeEventListener('visibilitychange', update)
    }
  }, [intervalMs])
  return now
}
