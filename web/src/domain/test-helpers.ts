import type { Activity, Elimination, TrainingSession } from './types'

let seq = 0
const base = () => ({ id: `t${++seq}`, createdAt: 0, updatedAt: 0, deletedAt: null, deviceId: 'teste' })

/** Data local: dt(9, 8, 30) = 9 de novembro de 2026, 08:30 */
export const dt = (day: number, h = 12, m = 0) => new Date(2026, 10, day, h, m)

export function elim(at: Date, place: Elimination['place'] = 'fora', kind: Elimination['kind'] = 'xixi', trainerId = 'lucas'): Elimination {
  return { ...base(), kind, place, room: null, at: at.getTime(), note: null, trainerId }
}

export function session(p: Partial<TrainingSession> & { at?: Date } = {}): TrainingSession {
  const startedAt = (p.at ?? dt(9)).getTime()
  return {
    ...base(),
    skillId: 'senta',
    levelIndex: 0,
    trainerId: 'lucas',
    startedAt,
    endedAt: startedAt + 300_000,
    plannedSec: 300,
    actualSec: 300,
    hits: 8,
    misses: 2,
    clicks: 0,
    ...p,
  }
}

export function activity(at: Date, durationMin: number, trainerId = 'lucas'): Activity {
  return { ...base(), kind: 'passeio', startedAt: at.getTime(), durationMin, source: 'manual', note: null, trainerId }
}
