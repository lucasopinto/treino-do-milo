// Agenda de saídas de cada PESSOA (perfil), no fuso dela.
//
// O Lucas mora no Brasil e o pai em Portugal: cada perfil tem a sua agenda de saídas, o seu fuso
// e a sua chave de lembretes. Ficam no perfil (configurações da casa), então dá para ver e editar
// a agenda de qualquer pessoa em qualquer celular, sempre no horário local DELA.
//
// Cada celular sabe de quem ele é ("dono"): os lembretes daquele celular seguem a agenda do dono.
// Com a casa compartilhada, a agenda e o fuso do dono vão ao servidor, que manda os avisos.
import { useSyncExternalStore } from 'react'
import { db } from '../db/db'
import { defaultSettings, ensureSettings, updateSettings } from '../db/repo'
import { localTimeZone } from '../domain/schedule'
import { useSettings } from '../hooks/useData'
import { readLocal, readLocalJson, writeLocal } from '../lib/storage'
import type { OutingTime, Settings, Trainer } from '../domain/types'
import { api, ApiError, type ApiOptions } from './api'

const OWNER_KEY = 'milo.deviceOwner'
const SENT_KEY = 'milo.outingScheduleSent'
/** Agenda por celular da versão anterior: vira a agenda do dono na primeira vez. */
const LEGACY_KEY = 'milo.outingSchedule'

export interface ProfileSchedule {
  outingTimes: OutingTime[]
  remindersEnabled: boolean
  timezone: string
}

// ---------- Dono do celular ----------

const listeners = new Set<() => void>()

export function getDeviceOwner(): string | null {
  return readLocal(OWNER_KEY)
}

/** Avisa quando o dono do celular muda (o sincronizador usa para mandar a agenda ao servidor). */
export function onScheduleChange(fn: () => void): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export function useDeviceOwner(): string | null {
  return useSyncExternalStore(onScheduleChange, getDeviceOwner, () => null)
}

/**
 * Define de quem é este celular. Se o perfil ainda não tem fuso, usa o deste celular
 * (o celular do pai em Portugal deixa o perfil dele no horário de Lisboa).
 */
export async function setDeviceOwner(trainerId: string): Promise<void> {
  writeLocal(OWNER_KEY, trainerId)
  for (const l of listeners) l()
  const s = await ensureSettings()
  const t = s.trainers.find((x) => x.id === trainerId)
  if (!t) return
  const patch: Partial<Trainer> = {}
  if (!t.timezone) patch.timezone = localTimeZone()
  const legacy = readLocalJson<{ outingTimes?: OutingTime[]; remindersEnabled?: boolean }>(LEGACY_KEY)
  if (!t.outingTimes && legacy && Array.isArray(legacy.outingTimes)) {
    patch.outingTimes = legacy.outingTimes
    patch.remindersEnabled = legacy.remindersEnabled !== false
  }
  writeLocal(LEGACY_KEY, null)
  if (Object.keys(patch).length > 0) await updateTrainer(trainerId, patch)
}

// ---------- Agenda de cada perfil ----------

/** Agenda de um perfil. Sem agenda própria ainda, usa a agenda antiga da casa. */
export function profileSchedule(settings: Settings, trainerId: string | null | undefined): ProfileSchedule {
  const t = settings.trainers.find((x) => x.id === trainerId)
  return {
    outingTimes: t?.outingTimes ?? settings.outingTimes,
    remindersEnabled: t?.remindersEnabled ?? settings.remindersEnabled,
    timezone: t?.timezone ?? localTimeZone(),
  }
}

/** Altera um perfil lendo a versão mais nova do banco (não a da tela, que pode estar velha). */
export async function updateTrainer(trainerId: string, patch: Partial<Omit<Trainer, 'id'>>): Promise<void> {
  const s = await ensureSettings()
  const base = profileSchedule(s, trainerId)
  await updateSettings({
    trainers: s.trainers.map((t) =>
      t.id === trainerId
        ? {
            ...t,
            // Ao editar pela primeira vez, a agenda antiga da casa vira a do perfil.
            outingTimes: t.outingTimes ?? base.outingTimes,
            remindersEnabled: t.remindersEnabled ?? base.remindersEnabled,
            ...patch,
          }
        : t,
    ),
  })
}

export function useProfileSchedule(trainerId: string): ProfileSchedule & { update: (patch: Partial<ProfileSchedule>) => Promise<void> } {
  const settings = useSettings()
  return { ...profileSchedule(settings, trainerId), update: (patch) => updateTrainer(trainerId, patch) }
}

// ---------- Fusos ----------

const TZ_NAMES: Record<string, string> = {
  'America/Sao_Paulo': 'Brasil (Brasília)',
  'America/Fortaleza': 'Brasil (Fortaleza)',
  'America/Recife': 'Brasil (Recife)',
  'America/Bahia': 'Brasil (Salvador)',
  'America/Manaus': 'Brasil (Manaus)',
  'Europe/Lisbon': 'Portugal (Lisboa)',
  'Atlantic/Madeira': 'Portugal (Madeira)',
  'Atlantic/Azores': 'Portugal (Açores)',
}

export function timeZoneName(tz: string): string {
  return TZ_NAMES[tz] ?? tz.replace(/_/g, ' ')
}

/** Opções para escolher o fuso de um perfil. */
export function timeZoneOptions(current: string): string[] {
  return [...new Set([current, localTimeZone(), 'America/Sao_Paulo', 'Europe/Lisbon', 'Atlantic/Madeira', 'Atlantic/Azores'])]
}

// ---------- Envio ao servidor ----------

/**
 * Manda a agenda e o fuso do dono deste celular ao servidor, se mudaram desde o último envio.
 * Chamado em cada rodada de sincronização. Sem dono escolhido, não manda nada.
 */
export async function uploadScheduleIfChanged(conn: Pick<ApiOptions, 'baseUrl' | 'token' | 'fetchImpl'>): Promise<void> {
  const owner = getDeviceOwner()
  if (!owner) return
  const s = (await db.settings.get('settings')) ?? defaultSettings()
  const sched = profileSchedule(s, owner)
  const body = {
    outingTimes: sched.outingTimes.map((o) => ({ id: o.id, time: o.time, label: (o.label || 'Saída').slice(0, 60) })),
    remindersEnabled: sched.remindersEnabled,
    timezone: sched.timezone,
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
