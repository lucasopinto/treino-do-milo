import { db, SYNCED_TABLES, type SyncedTable } from './db'
import { mergeRecords } from '../domain/merge'
import type { Activity, BaseRecord, ChecklistDay, Elimination, Settings, SkillProgress, TrainingSession } from '../domain/types'

export const BACKUP_APP = 'treino-do-milo'
export const BACKUP_VERSION = 1

export interface BackupData {
  settings: Settings[]
  sessions: TrainingSession[]
  eliminations: Elimination[]
  activities: Activity[]
  checklist: ChecklistDay[]
  skillProgress: SkillProgress[]
}

export interface BackupFile {
  app: typeof BACKUP_APP
  version: number
  exportedAt: number
  data: BackupData
}

export async function exportBackup(): Promise<BackupFile> {
  const data = {} as Record<SyncedTable, BaseRecord[]>
  await db.transaction('r', SYNCED_TABLES.map((t) => db.table(t)), async () => {
    for (const t of SYNCED_TABLES) data[t] = await db.table(t).toArray()
  })
  return { app: BACKUP_APP, version: BACKUP_VERSION, exportedAt: Date.now(), data: data as unknown as BackupData }
}

const isObj = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x)

function isRecord(x: unknown): x is BaseRecord {
  return isObj(x) && typeof x.id === 'string' && typeof x.updatedAt === 'number' && typeof x.createdAt === 'number'
}

/** Confere se o arquivo é um backup deste app. Lança erro com mensagem amigável. */
export function validateBackup(raw: unknown): BackupFile {
  if (!isObj(raw) || raw.app !== BACKUP_APP) throw new Error('Este arquivo não é um backup do Treino do Milo.')
  if (typeof raw.version !== 'number' || raw.version > BACKUP_VERSION)
    throw new Error('Backup de uma versão mais nova do app. Atualize o app neste celular primeiro.')
  if (!isObj(raw.data)) throw new Error('Backup sem dados.')
  for (const t of SYNCED_TABLES) {
    const list = raw.data[t] ?? []
    if (!Array.isArray(list)) throw new Error(`Backup com formato inválido em "${t}".`)
    if (!list.every(isRecord)) throw new Error(`Backup com registros inválidos em "${t}".`)
    // Registros antigos sem os campos novos.
    for (const r of list as BaseRecord[]) {
      if (r.deletedAt === undefined) r.deletedAt = null
      if (typeof r.deviceId !== 'string') r.deviceId = 'importado'
    }
    ;(raw.data as Record<string, unknown>)[t] = list
  }
  return raw as unknown as BackupFile
}

export interface ImportResult {
  added: number
  updated: number
  unchanged: number
}

/**
 * - 'mesclar': junta com o que já existe; para o mesmo registro vence o editado por último.
 * - 'substituir': apaga tudo deste celular e coloca o conteúdo do backup.
 */
export async function importBackup(file: BackupFile, mode: 'mesclar' | 'substituir'): Promise<ImportResult> {
  const result: ImportResult = { added: 0, updated: 0, unchanged: 0 }
  await db.transaction('rw', SYNCED_TABLES.map((t) => db.table(t)), async () => {
    for (const t of SYNCED_TABLES) {
      const table = db.table<BaseRecord, string>(t)
      const incoming = (file.data[t] ?? []) as BaseRecord[]
      if (mode === 'substituir') {
        await table.clear()
        await table.bulkPut(incoming)
        result.added += incoming.length
      } else {
        const local = await table.toArray()
        const m = mergeRecords(local, incoming)
        await table.bulkPut(m.toWrite)
        result.added += m.added
        result.updated += m.updated
        result.unchanged += m.unchanged
      }
    }
  })
  return result
}

export function backupFileName(d = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `treino-milo-${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}.json`
}

/** Apaga todos os dados deste celular. */
export async function wipeAll(): Promise<void> {
  await db.transaction('rw', SYNCED_TABLES.map((t) => db.table(t)), async () => {
    for (const t of SYNCED_TABLES) await db.table(t).clear()
  })
}
