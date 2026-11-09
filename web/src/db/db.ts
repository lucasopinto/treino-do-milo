import Dexie, { type EntityTable } from 'dexie'
import type {
  Activity,
  ChecklistDay,
  Elimination,
  Settings,
  SkillProgress,
  TrainingSession,
} from '../domain/types'

export class MiloDB extends Dexie {
  sessions!: EntityTable<TrainingSession, 'id'>
  eliminations!: EntityTable<Elimination, 'id'>
  activities!: EntityTable<Activity, 'id'>
  checklist!: EntityTable<ChecklistDay, 'id'>
  skillProgress!: EntityTable<SkillProgress, 'id'>
  settings!: EntityTable<Settings, 'id'>

  constructor(name = 'treino-do-milo') {
    super(name)
    this.version(1).stores({
      sessions: 'id, startedAt, skillId, trainerId, updatedAt',
      eliminations: 'id, at, trainerId, updatedAt',
      activities: 'id, startedAt, trainerId, updatedAt',
      checklist: 'id, updatedAt',
      skillProgress: 'id, updatedAt',
      settings: 'id',
    })
  }
}

export const db = new MiloDB()

export const SYNCED_TABLES = [
  'sessions',
  'eliminations',
  'activities',
  'checklist',
  'skillProgress',
  'settings',
] as const
export type SyncedTable = (typeof SYNCED_TABLES)[number]
