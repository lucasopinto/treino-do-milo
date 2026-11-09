import { addDays, atTime, parseHM } from './dates'
import type { OutingTime } from './types'

export interface OutingOccurrence {
  outing: OutingTime
  at: Date
}

/** Horários válidos, ordenados do mais cedo ao mais tarde. */
export function sortOutings(outings: OutingTime[]): OutingTime[] {
  return outings
    .filter((o) => parseHM(o.time) !== null)
    .slice()
    .sort((a, b) => (parseHM(a.time) ?? 0) - (parseHM(b.time) ?? 0))
}

/**
 * Próxima saída programada a partir de `now`.
 * Se todas as de hoje já passaram, devolve a primeira de amanhã.
 */
export function nextOuting(outings: OutingTime[], now: Date): OutingOccurrence | null {
  const sorted = sortOutings(outings)
  if (sorted.length === 0) return null
  for (const outing of sorted) {
    const at = atTime(now, outing.time)!
    if (at.getTime() > now.getTime()) return { outing, at }
  }
  const first = sorted[0]!
  return { outing: first, at: atTime(addDays(now, 1), first.time)! }
}

/**
 * Saídas cujo horário caiu no intervalo (lastCheck, now] e que ainda não estão
 * atrasadas demais (para não disparar lembretes velhos quando o app é reaberto).
 */
export function dueOutings(
  outings: OutingTime[],
  lastCheck: Date,
  now: Date,
  maxLateMs = 10 * 60_000,
): OutingOccurrence[] {
  if (now.getTime() <= lastCheck.getTime()) return []
  const result: OutingOccurrence[] = []
  // Considera ontem e hoje para cobrir a virada da meia-noite.
  for (const base of [addDays(now, -1), now]) {
    for (const outing of sortOutings(outings)) {
      const at = atTime(base, outing.time)!
      const t = at.getTime()
      if (t > lastCheck.getTime() && t <= now.getTime() && now.getTime() - t <= maxLateMs) {
        result.push({ outing, at })
      }
    }
  }
  return result
}

/** Sugere saídas ~20 min depois de cada refeição. */
export function outingsFromMeals(mealTimes: string[], offsetMin = 20): string[] {
  return mealTimes
    .map(parseHM)
    .filter((m): m is number => m !== null)
    .map((m) => {
      const t = (m + offsetMin) % (24 * 60)
      return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`
    })
}
