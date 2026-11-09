/* Código extra carregado pelo service worker gerado (importScripts).
   Fase 1: abre/foca o app ao tocar numa notificação.
   Fase 2: tratamento de mensagens Web Push entra aqui. */

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
          return
        }
      }
      await self.clients.openWindow(target)
    })(),
  )
})
