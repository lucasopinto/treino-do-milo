import { parseHM } from './dates'
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

// ---------- Horários num fuso (ex.: a agenda do pai é no horário de Portugal) ----------

/** Fuso deste aparelho, ex.: "America/Sao_Paulo". */
export function localTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/Sao_Paulo'
  } catch {
    return 'America/Sao_Paulo'
  }
}

const partsFmt = new Map<string, Intl.DateTimeFormat>()

/** Data e hora "de parede" de um instante no fuso `tz`. */
export function wallTime(ms: number, tz: string): { y: number; m: number; d: number; h: number; min: number } {
  let f = partsFmt.get(tz)
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      hourCycle: 'h23',
    })
    partsFmt.set(tz, f)
  }
  const p: Record<string, number> = {}
  for (const part of f.formatToParts(ms)) if (part.type !== 'literal') p[part.type] = Number(part.value)
  return { y: p.year!, m: p.month!, d: p.day!, h: p.hour! % 24, min: p.minute! }
}

/** Instante em que, no fuso `tz`, é dia y-m-d às h:min (o dia pode "transbordar", ex.: d + 1). */
export function zonedTime(y: number, m: number, d: number, h: number, min: number, tz: string): number {
  const asUtc = Date.UTC(y, m - 1, d, h, min)
  const offsetAt = (t: number) => {
    const w = wallTime(t, tz)
    return Date.UTC(w.y, w.m - 1, w.d, w.h, w.min) - Math.floor(t / 60_000) * 60_000
  }
  let t = asUtc - offsetAt(asUtc)
  const again = asUtc - offsetAt(t) // acerta perto da troca de horário de verão
  if (again !== t) t = again
  return t
}

/** Instante do horário 'HH:MM' no dia (de parede, no fuso `tz`) de `base` + `dayOffset`. */
function occurrence(base: number, dayOffset: number, hm: string, tz: string): number | null {
  const mins = parseHM(hm)
  if (mins === null) return null
  const w = wallTime(base, tz)
  return zonedTime(w.y, w.m, w.d + dayOffset, Math.floor(mins / 60), mins % 60, tz)
}

/**
 * Próxima saída programada a partir de `now`, com os horários no fuso `tz`
 * (padrão: o deste celular). Se todas as de hoje já passaram, devolve a primeira de amanhã.
 */
export function nextOuting(outings: OutingTime[], now: Date, tz: string = localTimeZone()): (OutingOccurrence & { tomorrow: boolean }) | null {
  const sorted = sortOutings(outings)
  if (sorted.length === 0) return null
  for (const outing of sorted) {
    const t = occurrence(now.getTime(), 0, outing.time, tz)!
    if (t > now.getTime()) return { outing, at: new Date(t), tomorrow: false }
  }
  const first = sorted[0]!
  return { outing: first, at: new Date(occurrence(now.getTime(), 1, first.time, tz)!), tomorrow: true }
}

/**
 * Saídas cujo horário (no fuso `tz`) caiu no intervalo (lastCheck, now] e que ainda não estão
 * atrasadas demais (para não disparar lembretes velhos quando o app é reaberto).
 */
export function dueOutings(
  outings: OutingTime[],
  lastCheck: Date,
  now: Date,
  maxLateMs = 10 * 60_000,
  tz: string = localTimeZone(),
): OutingOccurrence[] {
  if (now.getTime() <= lastCheck.getTime()) return []
  const result: OutingOccurrence[] = []
  // Considera ontem e hoje para cobrir a virada da meia-noite.
  for (const dayOffset of [-1, 0]) {
    for (const outing of sortOutings(outings)) {
      const t = occurrence(now.getTime(), dayOffset, outing.time, tz)!
      if (t > lastCheck.getTime() && t <= now.getTime() && now.getTime() - t <= maxLateMs) {
        result.push({ outing, at: new Date(t) })
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
