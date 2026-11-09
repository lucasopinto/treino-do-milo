// Liga o motor de sincronização ao app: guarda a configuração, decide quando sincronizar
// e publica o estado (para a tela Casa e o indicador).

import { useSyncExternalStore } from 'react'
import { db, SYNCED_TABLES } from '../db/db'
import { getDeviceId } from '../lib/ids'
import { readLocalJson, writeLocalJson } from '../lib/storage'
import { api, ApiError, DEFAULT_API_URL, NetworkError, normalizeBaseUrl, type AuthOut, type HouseholdOut, type InviteOut } from './api'
import { runSync, type SyncConfig } from './engine'
import { onScheduleChange, uploadScheduleIfChanged } from './schedule'

const CFG_KEY = 'milo.sync'
const DEBOUNCE_MS = 2_000
const PERIODIC_MS = 60_000

export type SyncPhase = 'off' | 'idle' | 'syncing' | 'offline' | 'error' | 'removed'

export interface SyncStatus {
  phase: SyncPhase
  lastSyncAt: number | null
  error: string | null
  /** Registros recebidos na última rodada (para avisar "3 registros novos do Pai"). */
  lastPulled: number
}

// ---------- Configuração ----------

export function getSyncConfig(): SyncConfig | null {
  const c = readLocalJson<SyncConfig>(CFG_KEY)
  return c && c.token ? c : null
}

function saveConfig(c: SyncConfig | null) {
  writeLocalJson(CFG_KEY, c)
}

export function getApiUrl(): string {
  return readLocalJson<string>('milo.apiUrl') ?? DEFAULT_API_URL
}

export function setApiUrl(url: string) {
  writeLocalJson('milo.apiUrl', normalizeBaseUrl(url) || null)
}

// ---------- Estado publicado ----------

let status: SyncStatus = { phase: getSyncConfig() ? 'idle' : 'off', lastSyncAt: getSyncConfig()?.lastSyncAt ?? null, error: null, lastPulled: 0 }
const listeners = new Set<() => void>()

function setStatus(patch: Partial<SyncStatus>) {
  status = { ...status, ...patch }
  listeners.forEach((l) => l())
}

export function useSyncStatus(): SyncStatus {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => status,
  )
}

// ---------- Rodadas de sincronização ----------

let running: Promise<void> | null = null
let again = false
let applyingRemote = false
let debounceTimer: ReturnType<typeof setTimeout> | null = null

/** Sincroniza agora (se já estiver sincronizando, faz mais uma rodada no fim). */
export function syncNow(): Promise<void> {
  if (running) {
    again = true
    return running
  }
  running = (async () => {
    do {
      again = false
      await syncRound()
    } while (again)
  })().finally(() => {
    running = null
  })
  return running
}

async function syncRound() {
  const cfg = getSyncConfig()
  if (!cfg) {
    setStatus({ phase: 'off' })
    return
  }
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    setStatus({ phase: 'offline' })
    return
  }
  setStatus({ phase: 'syncing', error: null })
  try {
    const r = await runSync({
      db,
      cfg,
      deviceId: getDeviceId(),
      onApplyRemote: (a) => {
        applyingRemote = a
      },
    })
    // A configuração pode ter mudado (saiu da casa) enquanto sincronizava.
    if (getSyncConfig()?.token !== cfg.token) return
    saveConfig(r.cfg)
    // Agenda de saídas e fuso deste celular (para os avisos do servidor chegarem no horário local).
    await uploadScheduleIfChanged({ baseUrl: cfg.apiUrl, token: cfg.token })
    setStatus({ phase: 'idle', lastSyncAt: r.cfg.lastSyncAt, lastPulled: r.pulled })
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) {
      saveConfig(null)
      writeLocalJson('milo.pushEndpoint', null)
      setStatus({ phase: 'removed', error: 'Este celular foi removido da casa. Os dados continuam aqui.' })
    } else if (e instanceof NetworkError) {
      setStatus({ phase: 'offline', error: null })
    } else {
      setStatus({ phase: 'error', error: e instanceof Error ? e.message : 'Erro ao sincronizar.' })
    }
  }
}

/** Pede uma sincronização daqui a pouco (junta várias edições seguidas numa rodada só). */
export function requestSync(delay = DEBOUNCE_MS) {
  if (!getSyncConfig()) return
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    debounceTimer = null
    void syncNow()
  }, delay)
}

let started = false

/** Liga os gatilhos: abrir o app, voltar para ele, voltar a internet, cada gravação e a cada minuto. */
export function startSyncLoop(): () => void {
  if (started) return () => {}
  started = true
  for (const t of SYNCED_TABLES) {
    const table = db.table(t)
    table.hook('creating', () => {
      if (!applyingRemote) requestSync()
    })
    table.hook('updating', () => {
      if (!applyingRemote) requestSync()
      return undefined
    })
  }
  onScheduleChange(() => requestSync(500))
  const onVisible = () => document.visibilityState === 'visible' && void syncNow()
  const onOnline = () => void syncNow()
  document.addEventListener('visibilitychange', onVisible)
  window.addEventListener('online', onOnline)
  window.addEventListener('offline', () => getSyncConfig() && setStatus({ phase: 'offline' }))
  const timer = window.setInterval(() => document.visibilityState === 'visible' && void syncNow(), PERIODIC_MS)
  void syncNow()
  return () => {
    document.removeEventListener('visibilitychange', onVisible)
    window.removeEventListener('online', onOnline)
    window.clearInterval(timer)
  }
}

/** Faz o próximo envio mandar tudo de novo (depois de importar backup ou apagar dados). */
export function markFullResync({ resetCursor = false } = {}) {
  const cfg = getSyncConfig()
  if (!cfg) return
  saveConfig({ ...cfg, pushedUntil: null, cursor: resetCursor ? 0 : cfg.cursor })
  requestSync(500)
}

// ---------- Casa ----------

function connect(apiUrl: string, auth: AuthOut) {
  setApiUrl(apiUrl)
  saveConfig({
    apiUrl: normalizeBaseUrl(apiUrl),
    token: auth.token,
    householdId: auth.householdId,
    serverDeviceId: auth.deviceId,
    cursor: 0,
    pushedUntil: null,
    lastSyncAt: null,
  })
  setStatus({ phase: 'idle', error: null, lastSyncAt: null })
}

// O servidor grátis pode estar "dormindo": a primeira chamada pode demorar até ~1 minuto.
const SLOW = 90_000

export async function createHousehold(apiUrl: string, deviceName: string): Promise<InviteOut | null> {
  const auth = await api<AuthOut>('/households', {
    baseUrl: apiUrl,
    method: 'POST',
    body: { deviceName, clientDeviceId: getDeviceId() },
    timeoutMs: SLOW,
  })
  connect(apiUrl, auth)
  await syncNow()
  return auth.invite
}

export async function joinHousehold(apiUrl: string, code: string, deviceName: string): Promise<void> {
  const auth = await api<AuthOut>('/households/join', {
    baseUrl: apiUrl,
    method: 'POST',
    body: { code, deviceName, clientDeviceId: getDeviceId() },
    timeoutMs: SLOW,
  })
  connect(apiUrl, auth)
  await syncNow()
}

function authed() {
  const cfg = getSyncConfig()
  if (!cfg) throw new Error('Este celular não está numa casa.')
  return { baseUrl: cfg.apiUrl, token: cfg.token, cfg }
}

export function fetchHousehold(): Promise<HouseholdOut> {
  const { cfg: _cfg, ...o } = authed()
  return api<HouseholdOut>('/households/me', { ...o, timeoutMs: SLOW })
}

export function newInvite(): Promise<InviteOut> {
  const { cfg: _cfg, ...o } = authed()
  return api<InviteOut>('/households/invites', { ...o, method: 'POST' })
}

export async function removeDevice(id: string): Promise<void> {
  const { cfg: _cfg, ...o } = authed()
  await api<void>(`/devices/${encodeURIComponent(id)}`, { ...o, method: 'DELETE' })
}

export async function renameThisDevice(name: string): Promise<void> {
  const { cfg: _cfg, ...o } = authed()
  await api<void>('/devices/me', { ...o, method: 'PATCH', body: { name } })
}

/** Sai da casa. Os dados continuam neste celular. */
export async function leaveHousehold(): Promise<void> {
  const { cfg, ...o } = authed()
  try {
    await api<void>(`/devices/${encodeURIComponent(cfg.serverDeviceId)}`, { ...o, method: 'DELETE' })
  } catch (e) {
    // Já removido por outro aparelho: tudo bem, só esquece a casa.
    if (!(e instanceof ApiError && (e.status === 401 || e.status === 404))) throw e
  }
  forgetHousehold()
}

export function forgetHousehold() {
  writeLocalJson('milo.pushEndpoint', null)
  saveConfig(null)
  setStatus({ phase: 'off', error: null, lastSyncAt: null, lastPulled: 0 })
}
