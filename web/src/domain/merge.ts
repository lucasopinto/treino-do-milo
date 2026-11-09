import type { BaseRecord } from './types'

/**
 * Mescla registros vindos de outro aparelho (backup importado ou, na Fase 2, o servidor).
 * Regra: para o mesmo id, vence quem tem `updatedAt` mais recente.
 * Empate: vence o maior deviceId (determinístico, os dois lados chegam ao mesmo resultado).
 * Exclusões viajam como `deletedAt` preenchido, então também se propagam.
 */
export function pickNewer<T extends BaseRecord>(a: T, b: T): T {
  if (a.updatedAt !== b.updatedAt) return a.updatedAt > b.updatedAt ? a : b
  return a.deviceId >= b.deviceId ? a : b
}

export interface MergeResult<T> {
  /** Registros que precisam ser gravados localmente. */
  toWrite: T[]
  added: number
  updated: number
  unchanged: number
}

export function mergeRecords<T extends BaseRecord>(local: T[], incoming: T[]): MergeResult<T> {
  const byId = new Map(local.map((r) => [r.id, r]))
  const toWrite: T[] = []
  let added = 0
  let updated = 0
  let unchanged = 0
  for (const inc of incoming) {
    const cur = byId.get(inc.id)
    if (!cur) {
      toWrite.push(inc)
      added++
      continue
    }
    const winner = pickNewer(cur, inc)
    if (winner === cur) unchanged++
    else {
      toWrite.push(inc)
      updated++
    }
  }
  return { toWrite, added, updated, unchanged }
}
