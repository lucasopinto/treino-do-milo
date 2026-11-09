import { addDays, dayKey, formatDayMonth, formatShortDate, startOfDay, startOfMonth, startOfWeek } from './dates'
import type { Activity, Elimination, SkillId, Trainer, TrainingSession } from './types'

const alive = <T extends { deletedAt: number | null }>(list: T[]) => list.filter((r) => r.deletedAt === null)

// ---------- Xixi e cocô ----------

export interface EliminationDay {
  key: string
  label: string
  outside: number
  inside: number
  /** % feito fora (0..100) ou null se não houve registro no dia. */
  outsideRate: number | null
}

/** Últimos `days` dias (mais antigo primeiro), para o gráfico de 4 semanas. */
export function eliminationsByDay(eliminations: Elimination[], now: Date, days = 28): EliminationDay[] {
  const map = new Map<string, { outside: number; inside: number }>()
  for (const e of alive(eliminations)) {
    const k = dayKey(e.at)
    const v = map.get(k) ?? { outside: 0, inside: 0 }
    if (e.place === 'fora') v.outside++
    else v.inside++
    map.set(k, v)
  }
  const out: EliminationDay[] = []
  for (let i = days - 1; i >= 0; i--) {
    const d = addDays(now, -i)
    const key = dayKey(d)
    const v = map.get(key) ?? { outside: 0, inside: 0 }
    const total = v.outside + v.inside
    out.push({
      key,
      label: formatShortDate(d),
      outside: v.outside,
      inside: v.inside,
      outsideRate: total === 0 ? null : Math.round((v.outside / total) * 100),
    })
  }
  return out
}

/** Acidentes dentro de casa por hora do dia (0..23). */
export function accidentsByHour(eliminations: Elimination[]): number[] {
  const hours = Array.from({ length: 24 }, () => 0)
  for (const e of alive(eliminations)) {
    if (e.place === 'dentro') hours[new Date(e.at).getHours()]!++
  }
  return hours
}

export interface HourHotspot {
  hour: number
  count: number
  label: string
}

/** Faixas de horário com mais acidentes (só as que tiveram algum), da pior para a melhor. */
export function accidentHotspots(eliminations: Elimination[], top = 3): HourHotspot[] {
  return accidentsByHour(eliminations)
    .map((count, hour) => ({ hour, count, label: `${String(hour).padStart(2, '0')}h–${String((hour + 1) % 24).padStart(2, '0')}h` }))
    .filter((h) => h.count > 0)
    .sort((a, b) => b.count - a.count || a.hour - b.hour)
    .slice(0, top)
}

export function outsideRate(eliminations: Elimination[]): number | null {
  const list = alive(eliminations)
  if (list.length === 0) return null
  return list.filter((e) => e.place === 'fora').length / list.length
}

// ---------- Períodos (semanas e meses) ----------

export type PeriodMode = 'semana' | 'mes'

export interface Bucket {
  start: number
  end: number // exclusivo
  label: string
}

export function periodBuckets(now: Date, mode: PeriodMode, count: number): Bucket[] {
  const out: Bucket[] = []
  if (mode === 'semana') {
    const thisWeek = startOfWeek(now)
    for (let i = count - 1; i >= 0; i--) {
      const start = addDays(thisWeek, -7 * i)
      out.push({ start: start.getTime(), end: addDays(start, 7).getTime(), label: formatDayMonth(start) })
    }
  } else {
    const thisMonth = startOfMonth(now)
    const fmt = new Intl.DateTimeFormat('pt-BR', { month: 'short' })
    for (let i = count - 1; i >= 0; i--) {
      const start = new Date(thisMonth.getFullYear(), thisMonth.getMonth() - i, 1)
      const end = new Date(start.getFullYear(), start.getMonth() + 1, 1)
      out.push({ start: start.getTime(), end: end.getTime(), label: fmt.format(start).replace('.', '') })
    }
  }
  return out
}

export interface PeriodStats {
  label: string
  sessions: number
  trainingMin: number
  hitRate: number | null // 0..100
  accidents: number
  outsideRate: number | null // 0..100
  activityMin: number
  activityPerDay: number
}

export function statsByPeriod(
  buckets: Bucket[],
  data: { sessions: TrainingSession[]; eliminations: Elimination[]; activities: Activity[] },
  now: Date,
): PeriodStats[] {
  const sessions = alive(data.sessions)
  const elims = alive(data.eliminations)
  const acts = alive(data.activities)
  const today = startOfDay(now).getTime()
  return buckets.map((b) => {
    const inB = (t: number) => t >= b.start && t < b.end
    const ss = sessions.filter((s) => inB(s.startedAt))
    const es = elims.filter((e) => inB(e.at))
    const as = acts.filter((a) => inB(a.startedAt))
    const hits = ss.reduce((n, s) => n + s.hits, 0)
    const misses = ss.reduce((n, s) => n + s.misses, 0)
    const activityMin = Math.round(as.reduce((n, a) => n + a.durationMin, 0))
    const outside = es.filter((e) => e.place === 'fora').length
    // Dias decorridos no período (o período atual ainda não acabou).
    const elapsedDays = Math.max(1, Math.round((Math.min(b.end, today + 86_400_000) - b.start) / 86_400_000))
    return {
      label: b.label,
      sessions: ss.length,
      trainingMin: Math.round(ss.reduce((n, s) => n + s.actualSec, 0) / 60),
      hitRate: hits + misses === 0 ? null : Math.round((hits / (hits + misses)) * 100),
      accidents: es.length - outside,
      outsideRate: es.length === 0 ? null : Math.round((outside / es.length) * 100),
      activityMin,
      activityPerDay: Math.round(activityMin / elapsedDays),
    }
  })
}

// ---------- Por comando ----------

export interface SkillRate {
  skillId: SkillId
  sessions: number
  hits: number
  misses: number
  rate: number | null // 0..100
}

export function rateBySkill(sessions: TrainingSession[], sinceMs = 0): SkillRate[] {
  const map = new Map<SkillId, SkillRate>()
  for (const s of alive(sessions)) {
    if (s.startedAt < sinceMs) continue
    const v = map.get(s.skillId) ?? { skillId: s.skillId, sessions: 0, hits: 0, misses: 0, rate: null }
    v.sessions++
    v.hits += s.hits
    v.misses += s.misses
    map.set(s.skillId, v)
  }
  return [...map.values()].map((v) => ({
    ...v,
    rate: v.hits + v.misses === 0 ? null : Math.round((v.hits / (v.hits + v.misses)) * 100),
  }))
}

// ---------- Quem treina ----------

export interface TrainerStats {
  trainerId: string
  name: string
  sessions: number
  trainingMin: number
  hitRate: number | null // 0..100
  eliminations: number
  outsideRate: number | null // 0..100
  activityMin: number
}

export function trainerComparison(
  trainers: Trainer[],
  data: { sessions: TrainingSession[]; eliminations: Elimination[]; activities: Activity[] },
  sinceMs = 0,
): TrainerStats[] {
  return trainers.map((t) => {
    const ss = alive(data.sessions).filter((s) => s.trainerId === t.id && s.startedAt >= sinceMs)
    const es = alive(data.eliminations).filter((e) => e.trainerId === t.id && e.at >= sinceMs)
    const as = alive(data.activities).filter((a) => a.trainerId === t.id && a.startedAt >= sinceMs)
    const hits = ss.reduce((n, s) => n + s.hits, 0)
    const misses = ss.reduce((n, s) => n + s.misses, 0)
    const outside = es.filter((e) => e.place === 'fora').length
    return {
      trainerId: t.id,
      name: t.name,
      sessions: ss.length,
      trainingMin: Math.round(ss.reduce((n, s) => n + s.actualSec, 0) / 60),
      hitRate: hits + misses === 0 ? null : Math.round((hits / (hits + misses)) * 100),
      eliminations: es.length,
      outsideRate: es.length === 0 ? null : Math.round((outside / es.length) * 100),
      activityMin: Math.round(as.reduce((n, a) => n + a.durationMin, 0)),
    }
  })
}
