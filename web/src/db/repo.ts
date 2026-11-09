import { db } from './db'
import { getDeviceId, newId } from '../lib/ids'
import { DEFAULT_SETTINGS } from '../domain/defaults'
import type {
  Activity,
  BaseRecord,
  ChecklistDay,
  ChecklistItemId,
  Elimination,
  Settings,
  SkillId,
  SkillProgress,
  TrainingSession,
} from '../domain/types'

type NewRecord<T extends BaseRecord> = Omit<T, keyof BaseRecord>

function stamp<T extends BaseRecord>(data: NewRecord<T>, id: string = newId(), now = Date.now()): T {
  return { ...data, id, createdAt: now, updatedAt: now, deletedAt: null, deviceId: getDeviceId() } as T
}

/**
 * Marca uma edição. O horário nunca fica menor que o da versão editada, para a edição
 * sempre vencer a versão anterior na sincronização, mesmo com o relógio do celular atrasado.
 */
function touch(prev?: Pick<BaseRecord, 'updatedAt'>) {
  return { updatedAt: Math.max(Date.now(), (prev?.updatedAt ?? 0) + 1), deviceId: getDeviceId() }
}

// ---------- Configurações ----------

export function defaultSettings(): Settings {
  return stamp<Settings>({ ...DEFAULT_SETTINGS } as NewRecord<Settings>, 'settings', 0)
}

export async function ensureSettings(): Promise<Settings> {
  const existing = await db.settings.get('settings')
  if (existing) return existing
  const s = defaultSettings()
  await db.settings.put(s)
  return s
}

export async function updateSettings(patch: Partial<Omit<Settings, keyof BaseRecord>>): Promise<void> {
  const current = await ensureSettings()
  await db.settings.put({ ...current, ...patch, ...touch(current) })
}

// ---------- Sessões ----------

export async function addSession(data: NewRecord<TrainingSession>): Promise<TrainingSession> {
  const rec = stamp<TrainingSession>(data)
  await db.sessions.add(rec)
  return rec
}

// ---------- Xixi e cocô ----------

export async function addElimination(data: NewRecord<Elimination>): Promise<Elimination> {
  const rec = stamp<Elimination>(data)
  await db.eliminations.add(rec)
  return rec
}

export async function updateElimination(id: string, patch: Partial<NewRecord<Elimination>>): Promise<void> {
  const cur = await db.eliminations.get(id)
  if (cur) await db.eliminations.put({ ...cur, ...patch, ...touch(cur) })
}

// ---------- Atividade ----------

export async function addActivity(data: NewRecord<Activity>): Promise<Activity> {
  const rec = stamp<Activity>(data)
  await db.activities.add(rec)
  return rec
}

// ---------- Checklist ----------

export async function setChecklistItem(dayKey: string, item: ChecklistItemId, value: boolean): Promise<void> {
  const existing = await db.checklist.get(dayKey)
  if (existing) {
    await db.checklist.put({ ...existing, items: { ...existing.items, [item]: value }, ...touch(existing) })
  } else {
    const items = { comida: false, passeio: false, brincadeira: false, carinho: false, [item]: value }
    await db.checklist.put(stamp<ChecklistDay>({ items }, dayKey))
  }
}

// ---------- Nível dos comandos ----------

export async function setSkillLevel(skillId: SkillId, levelIndex: number, trainerId: string): Promise<void> {
  const now = Date.now()
  const existing = await db.skillProgress.get(skillId)
  const change = { levelIndex, at: now, trainerId }
  if (existing) {
    await db.skillProgress.put({
      ...existing,
      levelIndex,
      levelChangedAt: now,
      history: [...existing.history, change],
      ...touch(existing),
    })
  } else {
    await db.skillProgress.put(
      stamp<SkillProgress>({ levelIndex, levelChangedAt: now, history: [change] }, skillId, now),
    )
  }
}

// ---------- Exclusão lógica ----------

export type DeletableTable = 'sessions' | 'eliminations' | 'activities'

export async function softDelete(table: DeletableTable, id: string): Promise<void> {
  const cur = await db.table<BaseRecord, string>(table).get(id)
  if (cur) await db.table<BaseRecord, string>(table).put({ ...cur, deletedAt: Date.now(), ...touch(cur) })
}

export async function restore(table: DeletableTable, id: string): Promise<void> {
  const cur = await db.table<BaseRecord, string>(table).get(id)
  if (cur) await db.table<BaseRecord, string>(table).put({ ...cur, deletedAt: null, ...touch(cur) })
}
