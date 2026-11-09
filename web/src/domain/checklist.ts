import { addDays, dayKey } from './dates'
import type { ChecklistDay, ChecklistItemId } from './types'

export const CHECKLIST_IDS: ChecklistItemId[] = ['comida', 'passeio', 'brincadeira', 'carinho']

export function checkedCount(day: Pick<ChecklistDay, 'items'> | undefined): number {
  if (!day) return 0
  return CHECKLIST_IDS.filter((id) => day.items[id]).length
}

export function isComplete(day: Pick<ChecklistDay, 'items'> | undefined): boolean {
  return checkedCount(day) === CHECKLIST_IDS.length
}

/** Dias completos seguidos. Se hoje ainda não está completo, conta a partir de ontem. */
export function completeStreak(days: ChecklistDay[], now: Date): number {
  const complete = new Set(days.filter((d) => d.deletedAt === null && isComplete(d)).map((d) => d.id))
  let d = complete.has(dayKey(now)) ? now : addDays(now, -1)
  let streak = 0
  while (complete.has(dayKey(d))) {
    streak++
    d = addDays(d, -1)
  }
  return streak
}

/** Situação dos últimos `n` dias (mais antigo primeiro) para o histórico. */
export function lastDays(
  days: ChecklistDay[],
  now: Date,
  n: number,
): { key: string; date: Date; count: number; complete: boolean }[] {
  const byId = new Map(days.filter((d) => d.deletedAt === null).map((d) => [d.id, d]))
  const out = []
  for (let i = n - 1; i >= 0; i--) {
    const date = addDays(now, -i)
    const key = dayKey(date)
    const day = byId.get(key)
    out.push({ key, date, count: checkedCount(day), complete: isComplete(day) })
  }
  return out
}
