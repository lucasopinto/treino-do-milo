// Agenda de saídas de cada celular.
//
// Cada pessoa pode morar num lugar (ex.: Lucas no Brasil e o pai em Portugal), então a agenda
// de saídas e a chave dos lembretes são DESTE aparelho: ficam no localStorage e não sincronizam
// com os outros celulares. Os registros de xixi, treinos etc. continuam compartilhados.
// Com a casa compartilhada, a agenda vai para o servidor junto com o fuso do celular, para os
// avisos chegarem no horário local de cada um.
import { useSyncExternalStore } from 'react'
import { db } from '../db/db'
import { defaultSettings } from '../db/repo'
import { useSettings } from '../hooks/useData'
import { readLocal, writeLocal, writeLocalJson } from '../lib/storage'
import type { OutingTime } from '../domain/types'
import { api, ApiError, type ApiOptions } from './api'

const KEY = 'milo.outingSchedule'
const SENT_KEY = 'milo.outingScheduleSent'

export interface DeviceSchedule {
  outingTimes: OutingTime[]
  remindersEnabled: boolean
}

const listeners = new Set<() => void>()
let cachedRaw: string | null | undefined
let cachedValue: DeviceSchedule | null = null

/** Agenda própria deste celular (null = ainda usa a agenda antiga, guardada nas configurações). */
export function getOwnSchedule(): DeviceSchedule | null {
  const raw = readLocal(KEY)
  if (raw !== cachedRaw) {
    cachedRaw = raw
    try {
      const v = raw ? (JSON.parse(raw) as DeviceSchedule) : null
      cachedValue = v && Array.isArray(v.outingTimes) ? { outingTimes: v.outingTimes, remindersEnabled: v.remindersEnabled !== false } : null
    } catch {
      cachedValue = null
    }
  }
  return cachedValue
}

export function saveOwnSchedule(s: DeviceSchedule): void {
  writeLocalJson(KEY, s)
  for (const l of listeners) l()
}

/** Avisa quando a agenda deste celular muda (o sincronizador usa para mandar ao servidor). */
export function onScheduleChange(fn: () => void): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

/** Fuso do celular, ex.: "America/Sao_Paulo" ou "Europe/Lisbon". */
export function deviceTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Sao_Paulo'
  } catch {
    return 'America/Sao_Paulo'
  }
}

/** Agenda em uso neste celular (a própria, ou a das configurações enquanto não houver). */
export function useOutingSchedule(): DeviceSchedule & { update: (patch: Partial<DeviceSchedule>) => void } {
  const settings = useSettings()
  const own = useSyncExternalStore(onScheduleChange, getOwnSchedule, () => null)
  const current: DeviceSchedule = own ?? { outingTimes: settings.outingTimes, remindersEnabled: settings.remindersEnabled }
  return {
    ...current,
    update: (patch) => saveOwnSchedule({ ...current, ...patch }),
  }
}

/** Copia a agenda antiga (das configurações) para este celular, para ela não mudar mais com o outro. */
export async function ensureOwnSchedule(): Promise<DeviceSchedule> {
  const own = getOwnSchedule()
  if (own) return own
  const s = (await db.settings.get('settings')) ?? defaultSettings()
  const fresh = { outingTimes: s.outingTimes, remindersEnabled: s.remindersEnabled }
  writeLocalJson(KEY, fresh) // sem avisar os ouvintes: nada mudou para quem está vendo
  return fresh
}

/**
 * Manda a agenda e o fuso deste celular ao servidor, se mudaram desde o último envio.
 * Chamado em cada rodada de sincronização.
 */
export async function uploadScheduleIfChanged(conn: Pick<ApiOptions, 'baseUrl' | 'token' | 'fetchImpl'>): Promise<void> {
  const own = await ensureOwnSchedule()
  const body = {
    outingTimes: own.outingTimes.map((o) => ({ id: o.id, time: o.time, label: (o.label || 'Saída').slice(0, 60) })),
    remindersEnabled: own.remindersEnabled,
    timezone: deviceTimeZone(),
  }
  // Inclui um resumo do token: entrou noutra casa = aparelho novo no servidor = manda de novo.
  const key = `${shortHash(conn.token ?? '')}|${JSON.stringify(body)}`
  if (readLocal(SENT_KEY) === key) return
  try {
    await api('/devices/me/schedule', { ...conn, method: 'PUT', body })
  } catch (e) {
    // Servidor ainda sem essa rota (atualizando) ou agenda recusada: tenta de novo na próxima rodada,
    // sem atrapalhar a sincronização dos registros.
    if (e instanceof ApiError && e.status !== 401) return
    throw e
  }
  writeLocal(SENT_KEY, key)
}

/** Resumo curto (FNV-1a) para não guardar o token de novo no localStorage. */
function shortHash(text: string): string {
  let h = 0x811c9dc5
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return (h >>> 0).toString(36)
}
