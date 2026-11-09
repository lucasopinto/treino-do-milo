// Notificações do sistema. Na Fase 1 só disparam com o app aberto ou recém-minimizado
// (não há servidor para acordar o celular). Ver "Limitações" no README.

export type PermissionState = NotificationPermission | 'unsupported'

export function notificationPermission(): PermissionState {
  if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported'
  return Notification.permission
}

export async function requestNotificationPermission(): Promise<PermissionState> {
  if (notificationPermission() === 'unsupported') return 'unsupported'
  try {
    return await Notification.requestPermission()
  } catch {
    return notificationPermission()
  }
}

export async function showSystemNotification(title: string, body: string, tag: string): Promise<boolean> {
  if (notificationPermission() !== 'granted') return false
  const options: NotificationOptions & { vibrate?: number[]; renotify?: boolean } = {
    body,
    tag,
    icon: 'pwa-192x192.png',
    badge: 'pwa-64x64.png',
    vibrate: [300, 150, 300, 150, 300],
    renotify: true,
    requireInteraction: true,
    data: { url: './#/xixi' },
  }
  try {
    if ('serviceWorker' in navigator) {
      const reg = await Promise.race([
        navigator.serviceWorker.ready,
        new Promise<null>((r) => setTimeout(() => r(null), 1500)),
      ])
      if (reg) {
        await reg.showNotification(title, options)
        return true
      }
    }
    new Notification(title, options)
    return true
  } catch {
    return false
  }
}
