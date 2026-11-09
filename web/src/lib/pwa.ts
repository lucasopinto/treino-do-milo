import { registerSW } from 'virtual:pwa-register'

/** Registra o service worker. Atualizações são aplicadas sozinhas na próxima abertura. */
export function registerServiceWorker(): void {
  if (!('serviceWorker' in navigator)) return
  registerSW({ immediate: true })
}

/** O app está instalado na tela de início? */
export function isStandalone(): boolean {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

export function isIOS(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
}
