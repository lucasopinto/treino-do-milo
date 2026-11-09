import { addDays, dayKey, daysBetween, startOfDay } from './dates'
import type { Activity, Elimination, TrainingSession } from './types'

export interface DaySummary {
  sessions: number
  trainingMin: number
  activityMin: number
  peeOutside: number
  peeInside: number
  pooOutside: number
  pooInside: number
  accidents: number
}

const sameDay = (t: number, key: string) => dayKey(t) === key

export function daySummary(
  day: Date,
  data: { sessions: TrainingSession[]; eliminations: Elimination[]; activities: Activity[] },
): DaySummary {
  const key = dayKey(day)
  const sessions = data.sessions.filter((s) => s.deletedAt === null && sameDay(s.startedAt, key))
  const elims = data.eliminations.filter((e) => e.deletedAt === null && sameDay(e.at, key))
  const acts = data.activities.filter((a) => a.deletedAt === null && sameDay(a.startedAt, key))
  const count = (kind: Elimination['kind'], place: Elimination['place']) =>
    elims.filter((e) => e.kind === kind && e.place === place).length
  return {
    sessions: sessions.length,
    trainingMin: Math.round(sessions.reduce((sum, s) => sum + s.actualSec, 0) / 60),
    activityMin: Math.round(acts.reduce((sum, a) => sum + a.durationMin, 0)),
    peeOutside: count('xixi', 'fora'),
    peeInside: count('xixi', 'dentro'),
    pooOutside: count('coco', 'fora'),
    pooInside: count('coco', 'dentro'),
    accidents: elims.filter((e) => e.place === 'dentro').length,
  }
}

/**
 * Dias seguidos sem acidente dentro de casa, contando o dia de hoje.
 * - Acidente hoje -> 0.
 * - Último acidente ontem -> 1 (hoje).
 * - Nunca teve acidente -> dias desde o primeiro registro (inclusive); sem registros -> 0.
 */
export function accidentFreeStreak(eliminations: Elimination[], now: Date): number {
  const alive = eliminations.filter((e) => e.deletedAt === null && e.at <= now.getTime())
  if (alive.length === 0) return 0
  const accidents = alive.filter((e) => e.place === 'dentro')
  if (accidents.length === 0) {
    const first = Math.min(...alive.map((e) => e.at))
    return daysBetween(first, now) + 1
  }
  const last = Math.max(...accidents.map((e) => e.at))
  return daysBetween(last, now)
}

/** Melhor sequência já registrada (para mostrar recorde). */
export function bestAccidentFreeStreak(eliminations: Elimination[], now: Date): number {
  const alive = eliminations.filter((e) => e.deletedAt === null && e.at <= now.getTime())
  if (alive.length === 0) return 0
  const first = startOfDay(Math.min(...alive.map((e) => e.at)))
  const accidentDays = new Set(alive.filter((e) => e.place === 'dentro').map((e) => dayKey(e.at)))
  let best = 0
  let cur = 0
  for (let d = first; d.getTime() <= now.getTime(); d = addDays(d, 1)) {
    if (accidentDays.has(dayKey(d))) cur = 0
    else best = Math.max(best, ++cur)
  }
  return best
}
