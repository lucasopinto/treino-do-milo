/* Código extra carregado pelo service worker gerado (importScripts).
   - Fase 1: abre/foca o app ao tocar numa notificação.
   - Fase 2: mostra os avisos de saída que o servidor manda por Web Push. */

self.addEventListener('push', (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch {
    data = { body: event.data ? event.data.text() : '' }
  }
  const title = data.title || 'Treino do Milo'
  event.waitUntil(
    self.registration.showNotification(title, {
      body: data.body || '',
      tag: data.tag || 'treino-do-milo',
      icon: 'pwa-192x192.png',
      badge: 'pwa-64x64.png',
      vibrate: [300, 150, 300, 150, 300],
      renotify: true,
      requireInteraction: true,
      data: { url: data.url || './#/xixi' },
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const data = event.notification.data || {}
  const target = new URL(data.url || './', self.registration.scope).href
  event.waitUntil(
    (async () => {
      const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      for (const client of all) {
        if (client.url.startsWith(self.registration.scope) && 'focus' in client) {
          await client.focus()
          if ('navigate' in client) await client.navigate(target).catch(() => {})
          return
        }
      }
      await self.clients.openWindow(target)
    })(),
  )
})
