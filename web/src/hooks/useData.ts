import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db/db'
import { defaultSettings } from '../db/repo'
import type { Activity, ChecklistDay, Elimination, Settings, SkillProgress, TrainingSession } from '../domain/types'

const alive = <T extends { deletedAt: number | null }>(r: T) => r.deletedAt === null

export function useSettings(): Settings {
  return useLiveQuery(() => db.settings.get('settings'), []) ?? defaultSettings()
}

export function useSessions(sinceMs = 0): TrainingSession[] | undefined {
  return useLiveQuery(
    () => db.sessions.where('startedAt').aboveOrEqual(sinceMs).filter(alive).sortBy('startedAt'),
    [sinceMs],
  )
}

export function useEliminations(sinceMs = 0): Elimination[] | undefined {
  return useLiveQuery(() => db.eliminations.where('at').aboveOrEqual(sinceMs).filter(alive).sortBy('at'), [sinceMs])
}

export function useActivities(sinceMs = 0): Activity[] | undefined {
  return useLiveQuery(
    () => db.activities.where('startedAt').aboveOrEqual(sinceMs).filter(alive).sortBy('startedAt'),
    [sinceMs],
  )
}

export function useChecklistDays(): ChecklistDay[] | undefined {
  return useLiveQuery(() => db.checklist.filter(alive).toArray(), [])
}

export function useSkillProgress(): SkillProgress[] | undefined {
  return useLiveQuery(() => db.skillProgress.filter(alive).toArray(), [])
}
