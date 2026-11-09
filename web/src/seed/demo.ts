// Dados de exemplo (4 semanas) para ver os gráficos funcionando.
// Todos marcados com deviceId 'demo', para poderem ser removidos depois sem tocar nos dados reais.
import { db } from '../db/db'
import { addDays, atTime, dayKey, startOfDay } from '../domain/dates'
import { DEFAULT_SETTINGS } from '../domain/defaults'
import type { Activity, ChecklistDay, Elimination, SkillId, TrainingSession } from '../domain/types'

export const DEMO_DEVICE = 'demo'

/** Gerador pseudoaleatório com semente: os mesmos dados toda vez. */
function rng(seed: number) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

let n = 0
const rec = (at: number) => ({ id: `demo-${++n}`, createdAt: at, updatedAt: at, deletedAt: null, deviceId: DEMO_DEVICE })

export function buildDemo(now = new Date(), days = 28) {
  const rand = rng(42)
  const between = (a: number, b: number) => a + Math.floor(rand() * (b - a + 1))
  const trainers = ['lucas', 'pai']
  const skills: SkillId[] = ['senta', 'aqui', 'atencao', 'deixa', 'espera', 'pata']
  const sessions: TrainingSession[] = []
  const eliminations: Elimination[] = []
  const activities: Activity[] = []
  const checklist: ChecklistDay[] = []

  for (let i = days; i >= 0; i--) {
    const day = addDays(startOfDay(now), -i)
    const progress = 1 - i / days // 0 no começo, 1 hoje
    const isToday = i === 0
    const until = isToday ? now.getTime() : Infinity
    const who = () => trainers[between(0, 1)]!

    // Xixi nas saídas programadas
    for (const o of DEFAULT_SETTINGS.outingTimes) {
      const at = atTime(day, o.time)!.getTime() + between(-8, 12) * 60_000
      if (at > until) continue
      if (rand() < 0.92) eliminations.push({ ...rec(at), kind: 'xixi', place: 'fora', room: null, at, note: null, trainerId: who() })
    }
    // Cocô depois das refeições
    for (const t of ['08:10', '18:40']) {
      const at = atTime(day, t)!.getTime() + between(0, 25) * 60_000
      if (at <= until && rand() < 0.85)
        eliminations.push({ ...rec(at), kind: 'coco', place: 'fora', room: null, at, note: null, trainerId: who() })
    }
    // Acidentes: mais no começo, concentrados à tarde e à noite
    const accidentChance = 0.75 * (1 - progress) + 0.05
    for (const [hour, weight] of [
      [15, 1],
      [20, 0.7],
      [10, 0.3],
    ] as const) {
      if (rand() < accidentChance * weight) {
        const at = day.getTime() + hour * 3_600_000 + between(0, 50) * 60_000
        if (at > until) continue
        const rooms = ['Sala', 'Cozinha', 'Corredor']
        eliminations.push({
          ...rec(at),
          kind: rand() < 0.85 ? 'xixi' : 'coco',
          place: 'dentro',
          room: rooms[between(0, 2)]!,
          at,
          note: rand() < 0.3 ? 'Logo depois de beber água' : null,
          trainerId: who(),
        })
      }
    }

    // Sessões de treino: 2 a 3 por dia, acerto melhorando com o tempo
    const nSessions = between(2, 3)
    for (let k = 0; k < nSessions; k++) {
      const at = day.getTime() + [9.5, 16, 19.5][k]! * 3_600_000 + between(0, 30) * 60_000
      if (at > until) continue
      const skillId = skills[(i + k) % skills.length]!
      const attempts = between(8, 16)
      const base = skillId === 'pata' ? 0.45 : 0.55
      const rate = Math.min(0.97, base + progress * 0.4 + (rand() - 0.5) * 0.15)
      const hits = Math.round(attempts * rate)
      const planned = [300, 420, 600][between(0, 2)]!
      sessions.push({
        ...rec(at),
        skillId,
        levelIndex: 0,
        trainerId: who(),
        startedAt: at,
        endedAt: at + planned * 1000,
        plannedSec: planned,
        actualSec: planned - between(0, 40),
        hits,
        misses: attempts - hits,
        clicks: rand() < 0.5 ? hits : 0,
      })
    }

    // Atividade: 2 passeios e 1 brincadeira
    for (const [h, kind, min, max] of [
      [7, 'passeio', 20, 35],
      [18.5, 'passeio', 20, 40],
      [12.5, 'brincadeira', 8, 20],
    ] as const) {
      const at = day.getTime() + h * 3_600_000
      if (at > until || rand() < 0.1) continue
      activities.push({ ...rec(at), kind, startedAt: at, durationMin: between(min, max), source: rand() < 0.5 ? 'cronometro' : 'manual', note: null, trainerId: who() })
    }

    if (!isToday) {
      const on = () => rand() < 0.55 + progress * 0.4
      checklist.push({ ...rec(day.getTime()), id: dayKey(day), items: { comida: on(), passeio: on(), brincadeira: on(), carinho: on() } })
    }
  }
  return { sessions, eliminations, activities, checklist }
}

export async function loadDemo(): Promise<void> {
  n = 0
  const d = buildDemo()
  await db.transaction('rw', [db.sessions, db.eliminations, db.activities, db.checklist], async () => {
    await db.sessions.bulkPut(d.sessions)
    await db.eliminations.bulkPut(d.eliminations)
    await db.activities.bulkPut(d.activities)
    // Não sobrescreve dias do checklist que já têm dados reais.
    const existing = new Set((await db.checklist.toArray()).map((c) => c.id))
    await db.checklist.bulkPut(d.checklist.filter((c) => !existing.has(c.id)))
  })
}

export async function removeDemo(): Promise<number> {
  let removed = 0
  await db.transaction('rw', [db.sessions, db.eliminations, db.activities, db.checklist], async () => {
    for (const name of ['sessions', 'eliminations', 'activities', 'checklist'] as const) {
      const table = db.table<{ id: string; deviceId: string }, string>(name)
      removed += await table.filter((r) => r.deviceId === DEMO_DEVICE).delete()
    }
  })
  return removed
}

export async function hasDemo(): Promise<boolean> {
  return (await db.sessions.filter((s) => s.deviceId === DEMO_DEVICE).count()) > 0
}
