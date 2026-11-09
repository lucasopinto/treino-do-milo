import type { Activity, Elimination, SkillId, TrainingSession } from './types'

export type TimelineType = 'sessao' | 'eliminacao' | 'atividade'

export interface TimelineEvent {
  id: string
  type: TimelineType
  at: number
  trainerId: string
  skillId: SkillId | null
  session?: TrainingSession
  elimination?: Elimination
  activity?: Activity
}

export interface TimelineFilters {
  type: 'todos' | TimelineType
  skillId: 'todos' | SkillId
  trainerId: 'todos' | string
  /** Dias para trás; 0 = tudo. */
  days: number
}

export const DEFAULT_FILTERS: TimelineFilters = { type: 'todos', skillId: 'todos', trainerId: 'todos', days: 30 }

/** Junta tudo numa linha do tempo, do mais recente para o mais antigo, aplicando os filtros. */
export function buildTimeline(
  data: { sessions: TrainingSession[]; eliminations: Elimination[]; activities: Activity[] },
  f: TimelineFilters,
  now: Date,
): TimelineEvent[] {
  const since = f.days > 0 ? now.getTime() - f.days * 86_400_000 : 0
  const events: TimelineEvent[] = []
  for (const s of data.sessions)
    events.push({ id: s.id, type: 'sessao', at: s.startedAt, trainerId: s.trainerId, skillId: s.skillId, session: s })
  for (const e of data.eliminations)
    events.push({ id: e.id, type: 'eliminacao', at: e.at, trainerId: e.trainerId, skillId: null, elimination: e })
  for (const a of data.activities)
    events.push({ id: a.id, type: 'atividade', at: a.startedAt, trainerId: a.trainerId, skillId: null, activity: a })

  return events
    .filter((ev) => {
      const rec = ev.session ?? ev.elimination ?? ev.activity
      if (rec?.deletedAt !== null) return false
      if (ev.at < since) return false
      if (f.type !== 'todos' && ev.type !== f.type) return false
      // Filtrar por comando mostra só sessões daquele comando.
      if (f.skillId !== 'todos' && ev.skillId !== f.skillId) return false
      if (f.trainerId !== 'todos' && ev.trainerId !== f.trainerId) return false
      return true
    })
    .sort((a, b) => b.at - a.at)
}
