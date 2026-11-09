// Motor de sincronização (Fase 2), offline-first:
// o app grava sempre no celular; quando há internet, envia o que mudou aqui e recebe o que mudou nos outros.
//
// - Enviar: registros editados neste aparelho (deviceId deste celular) depois do último envio.
//   Na primeira vez (ou depois de importar um backup), envia tudo, menos os dados de exemplo.
// - Receber: tudo que o servidor gravou depois do último `seq` recebido.
// - Conflito: o mais recente vence (pickNewer, a mesma regra do servidor).

import type { MiloDB, SyncedTable } from '../db/db'
import { SYNCED_TABLES } from '../db/db'
import { pickNewer } from '../domain/merge'
import type { BaseRecord } from '../domain/types'
import { DEMO_DEVICE } from '../seed/demo'
import { api, type PullOut, type PushOut, type SyncRecord } from './api'

export interface SyncConfig {
  apiUrl: string
  token: string
  householdId: string
  /** id deste aparelho no servidor (diferente do deviceId gravado nos registros). */
  serverDeviceId: string
  /** Último seq recebido do servidor. */
  cursor: number
  /** Maior updatedAt dos registros deste aparelho já enviados. null = enviar tudo. */
  pushedUntil: number | null
  lastSyncAt: number | null
}

export interface SyncContext {
  db: MiloDB
  cfg: SyncConfig
  /** deviceId deste celular (milo.deviceId). */
  deviceId: string
  fetchImpl?: typeof fetch
  /** Avisado antes/depois de gravar dados vindos do servidor (para não disparar outro envio). */
  onApplyRemote?: (applying: boolean) => void
}

export interface SyncResult {
  pushed: number
  pulled: number
  corrected: number
  cfg: SyncConfig
}

const PUSH_BATCH = 200

const key = (collection: string, id: string) => `${collection}/${id}`

/** Registros que este aparelho precisa enviar. */
export async function collectOutbox(db: MiloDB, cfg: Pick<SyncConfig, 'pushedUntil'>, deviceId: string): Promise<SyncRecord[]> {
  const out: SyncRecord[] = []
  for (const t of SYNCED_TABLES) {
    const table = db.table<BaseRecord, string>(t)
    let rows: BaseRecord[]
    if (cfg.pushedUntil === null) {
      // Envio completo: tudo, menos os dados de exemplo.
      rows = await table.filter((r) => r.deviceId !== DEMO_DEVICE).toArray()
    } else {
      const since = cfg.pushedUntil
      rows =
        t === 'settings'
          ? await table.filter((r) => r.deviceId === deviceId && r.updatedAt > since).toArray()
          : await table.where('updatedAt').above(since).filter((r) => r.deviceId === deviceId).toArray()
    }
    for (const r of rows) out.push({ collection: t, id: r.id, updatedAt: r.updatedAt, deviceId: r.deviceId, data: r as SyncRecord['data'] })
  }
  return out
}

/**
 * Grava registros vindos do servidor.
 * - modo 'merge' (pull): só grava se o do servidor vencer o local (o local pode ter edição ainda não enviada).
 * - modo 'correction' (resposta do envio): o servidor manda; grava se o local não mudou desde o envio.
 */
export async function applyRemote(
  db: MiloDB,
  records: SyncRecord[],
  mode: 'merge' | 'correction',
  sentUpdatedAt?: Map<string, number>,
): Promise<number> {
  if (records.length === 0) return 0
  let written = 0
  const tables = [...new Set(records.map((r) => r.collection))].filter((t): t is SyncedTable =>
    (SYNCED_TABLES as readonly string[]).includes(t),
  )
  await db.transaction('rw', tables.map((t) => db.table(t)), async () => {
    for (const r of records) {
      if (!tables.includes(r.collection)) continue
      const table = db.table<BaseRecord, string>(r.collection)
      const incoming = { ...r.data, id: r.id, updatedAt: r.updatedAt, deviceId: r.deviceId } as BaseRecord
      const local = await table.get(r.id)
      let write: boolean
      if (!local) write = true
      else if (mode === 'merge') write = pickNewer(local, incoming) === incoming
      else write = local.updatedAt === sentUpdatedAt?.get(key(r.collection, r.id))
      if (write) {
        await table.put(incoming)
        written++
      }
    }
  })
  return written
}

/** Uma rodada completa: envia o que falta e recebe as novidades. Lança ApiError/NetworkError. */
export async function runSync(ctx: SyncContext): Promise<SyncResult> {
  const { db, deviceId, fetchImpl } = ctx
  let cfg = { ...ctx.cfg }
  const base = { baseUrl: cfg.apiUrl, token: cfg.token, fetchImpl }
  const remote = async <T>(fn: () => Promise<T>) => {
    ctx.onApplyRemote?.(true)
    try {
      return await fn()
    } finally {
      ctx.onApplyRemote?.(false)
    }
  }

  // 1) Enviar
  const outbox = await collectOutbox(db, cfg, deviceId)
  let pushed = 0
  let corrected = 0
  for (let i = 0; i < outbox.length; i += PUSH_BATCH) {
    const batch = outbox.slice(i, i + PUSH_BATCH)
    const res = await api<PushOut>('/sync/push', { ...base, method: 'POST', body: { records: batch } })
    pushed += res.accepted
    const sent = new Map(batch.map((r) => [key(r.collection, r.id), r.updatedAt]))
    corrected += await remote(() => applyRemote(db, res.corrections, 'correction', sent))
  }
  // Só avança a marca com registros deste aparelho (no envio completo vão também os de outros).
  const own = outbox.filter((r) => r.deviceId === deviceId).map((r) => r.updatedAt)
  const maxOwn = own.length ? Math.max(...own) : -1
  cfg = { ...cfg, pushedUntil: Math.max(cfg.pushedUntil ?? -1, maxOwn) }

  // 2) Receber
  let pulled = 0
  for (let page = 0; page < 1000; page++) {
    const res = await api<PullOut>(`/sync/pull?since=${cfg.cursor}`, base)
    pulled += await remote(() => applyRemote(db, res.records, 'merge'))
    cfg = { ...cfg, cursor: res.seq }
    if (!res.hasMore) break
  }

  cfg = { ...cfg, lastSyncAt: Date.now() }
  return { pushed, pulled, corrected, cfg }
}
