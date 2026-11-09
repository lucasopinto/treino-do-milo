import { readLocal, writeLocal } from './storage'

export function newId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  // Fallback para navegadores antigos ou contexto sem HTTPS.
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16)
  })
}

let cachedDeviceId: string | null = null

/** Identifica este aparelho. Usado para resolver conflitos na sincronização (Fase 2). */
export function getDeviceId(): string {
  if (cachedDeviceId) return cachedDeviceId
  let id = readLocal('milo.deviceId')
  if (!id) {
    id = newId()
    writeLocal('milo.deviceId', id)
  }
  cachedDeviceId = id
  return id
}
