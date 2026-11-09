// Avisos de saída pelo servidor (Web Push): chegam mesmo com o app fechado.

import { readLocal, writeLocal } from '../lib/storage'
import { isIOS, isStandalone } from '../lib/pwa'
import { notificationPermission, requestNotificationPermission } from '../lib/notify'
import { api } from './api'
import { getSyncConfig } from './controller'

const PUSH_KEY = 'milo.pushEndpoint'

export type PushState = 'unsupported' | 'needs-install' | 'denied' | 'off' | 'on'

export function pushSupported(): boolean {
  return typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
}

/** Este celular recebe os lembretes pelo servidor (então o vigia local não precisa avisar). */
export function isPushOn(): boolean {
  return readLocal(PUSH_KEY) !== null && getSyncConfig() !== null
}

export function pushState(): PushState {
  if (!pushSupported()) return isIOS() && !isStandalone() ? 'needs-install' : 'unsupported'
  if (notificationPermission() === 'denied') return 'denied'
  return isPushOn() ? 'on' : 'off'
}

function b64urlToBytes(b64: string): Uint8Array<ArrayBuffer> {
  const pad = '='.repeat((4 - (b64.length % 4)) % 4)
  const raw = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/'))
  const out = new Uint8Array(new ArrayBuffer(raw.length))
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i)
  return out
}

function authed() {
  const cfg = getSyncConfig()
  if (!cfg) throw new Error('Entre numa casa compartilhada primeiro.')
  return { baseUrl: cfg.apiUrl, token: cfg.token }
}

async function registration(): Promise<ServiceWorkerRegistration> {
  const reg = await Promise.race([navigator.serviceWorker.ready, new Promise<null>((r) => setTimeout(() => r(null), 5000))])
  if (!reg) throw new Error('O app ainda não terminou de instalar. Feche e abra de novo.')
  return reg
}

async function sendSubscription(sub: PushSubscription) {
  const json = sub.toJSON()
  await api<void>('/push/subscribe', {
    ...authed(),
    method: 'POST',
    body: { endpoint: json.endpoint, keys: { p256dh: json.keys?.p256dh, auth: json.keys?.auth } },
  })
  writeLocal(PUSH_KEY, sub.endpoint)
}

export async function enablePush(): Promise<void> {
  const o = authed()
  if (!pushSupported()) throw new Error('Este navegador não recebe avisos.')
  const perm = await requestNotificationPermission()
  if (perm !== 'granted') throw new Error('Permissão de notificação negada. Libere nas configurações do celular.')
  const { publicKey } = await api<{ publicKey: string | null }>('/push/vapid-public-key', o)
  if (!publicKey) throw new Error('O servidor ainda não está configurado para avisos.')
  const reg = await registration()
  let sub = await reg.pushManager.getSubscription()
  // Se a chave do servidor mudou, a inscrição antiga não serve.
  const current = sub?.options.applicationServerKey
  const key = b64urlToBytes(publicKey)
  if (sub && current && new Uint8Array(current).toString() !== key.toString()) {
    await sub.unsubscribe()
    sub = null
  }
  sub ??= await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: key })
  await sendSubscription(sub)
}

export async function disablePush(): Promise<void> {
  writeLocal(PUSH_KEY, null)
  try {
    await api<void>('/push/subscribe', { ...authed(), method: 'DELETE' })
  } finally {
    const reg = await navigator.serviceWorker?.getRegistration()
    await (await reg?.pushManager.getSubscription())?.unsubscribe()
  }
}

export async function testPush(): Promise<void> {
  await api<{ sent: number }>('/push/test', { ...authed(), method: 'POST' })
}

/** Ao abrir o app: confirma a inscrição com o servidor (o navegador pode tê-la renovado). */
export async function refreshPushSubscription(): Promise<void> {
  if (!isPushOn() || !pushSupported() || notificationPermission() !== 'granted') return
  try {
    const reg = await registration()
    const sub = await reg.pushManager.getSubscription()
    if (sub) await sendSubscription(sub)
    else writeLocal(PUSH_KEY, null)
  } catch {
    /* tenta de novo na próxima abertura */
  }
}
