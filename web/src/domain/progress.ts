import { ADVANCE_RATE, ADVANCE_SESSIONS, MIN_ATTEMPTS_PER_SESSION } from './defaults'
import type { SkillId, TrainingSession } from './types'

type SessionLike = Pick<TrainingSession, 'skillId' | 'levelIndex' | 'startedAt' | 'hits' | 'misses' | 'deletedAt'>

export function sessionRate(s: Pick<TrainingSession, 'hits' | 'misses'>): number | null {
  const total = s.hits + s.misses
  return total === 0 ? null : s.hits / total
}

/** A sessão tem tentativas suficientes para contar no critério de avanço? */
export function qualifies(s: Pick<TrainingSession, 'hits' | 'misses'>): boolean {
  return s.hits + s.misses >= MIN_ATTEMPTS_PER_SESSION
}

export function isGoodSession(s: Pick<TrainingSession, 'hits' | 'misses'>): boolean {
  return qualifies(s) && (sessionRate(s) ?? 0) >= ADVANCE_RATE
}

/** Sessões do comando no nível atual, desde a última troca de nível, em ordem. */
export function sessionsAtLevel<T extends SessionLike>(
  sessions: T[],
  skillId: SkillId,
  levelIndex: number,
  levelChangedAt = 0,
): T[] {
  return sessions
    .filter(
      (s) =>
        s.deletedAt === null && s.skillId === skillId && s.levelIndex === levelIndex && s.startedAt >= levelChangedAt,
    )
    .sort((a, b) => a.startedAt - b.startedAt)
}

/**
 * Quantas sessões boas seguidas no fim da lista (≥80% com pelo menos 5 tentativas).
 * Sessões com poucas tentativas são ignoradas: não contam nem quebram a sequência.
 */
export function goodStreak(levelSessions: Pick<TrainingSession, 'hits' | 'misses'>[]): number {
  let streak = 0
  for (let i = levelSessions.length - 1; i >= 0; i--) {
    const s = levelSessions[i]!
    if (!qualifies(s)) continue
    if (isGoodSession(s)) streak++
    else break
  }
  return streak
}

export function isFirm(levelIndex: number, levelCount: number): boolean {
  return levelIndex >= levelCount - 1
}

export function shouldSuggestAdvance(levelIndex: number, levelCount: number, streak: number): boolean {
  return !isFirm(levelIndex, levelCount) && streak >= ADVANCE_SESSIONS
}

/**
 * Progresso total do comando (0..1). Chegar ao último nível ("Firme") = 100%.
 * Dentro de cada nível, cada sessão boa seguida soma um terço do passo.
 */
export function skillProgressValue(levelIndex: number, levelCount: number, streak: number): number {
  if (levelCount <= 1 || isFirm(levelIndex, levelCount)) return 1
  const within = Math.min(streak, ADVANCE_SESSIONS) / ADVANCE_SESSIONS
  return (levelIndex + within) / (levelCount - 1)
}

export interface SkillStatus {
  skillId: SkillId
  levelIndex: number
  levelCount: number
  streak: number
  progress: number
  firm: boolean
  suggestAdvance: boolean
  levelSessions: number
  lastRate: number | null
}

export function skillStatus(
  skillId: SkillId,
  levelCount: number,
  sessions: SessionLike[],
  levelIndex = 0,
  levelChangedAt = 0,
): SkillStatus {
  const lvl = sessionsAtLevel(sessions, skillId, levelIndex, levelChangedAt)
  const streak = goodStreak(lvl)
  const last = lvl[lvl.length - 1]
  return {
    skillId,
    levelIndex,
    levelCount,
    streak,
    progress: skillProgressValue(levelIndex, levelCount, streak),
    firm: isFirm(levelIndex, levelCount),
    suggestAdvance: shouldSuggestAdvance(levelIndex, levelCount, streak),
    levelSessions: lvl.length,
    lastRate: last ? sessionRate(last) : null,
  }
}

export type TrickState = 'firme' | 'treinando' | 'sugerido' | 'bloqueado'

/**
 * Regra dos truques: só sugerir o próximo quando o anterior estiver "firme".
 * - O primeiro truque não firme da ordem é o "sugerido" (ou "treinando", se já tem sessões).
 * - Os seguintes ficam "bloqueados" (ainda podem ser treinados, mas o app não sugere).
 */
export function trickStates(
  order: SkillId[],
  firmOf: (id: SkillId) => boolean,
  hasSessions: (id: SkillId) => boolean,
): Record<string, TrickState> {
  const result: Record<string, TrickState> = {}
  let blocked = false
  for (const id of order) {
    if (blocked) {
      result[id] = 'bloqueado'
    } else if (firmOf(id)) {
      result[id] = 'firme'
    } else {
      result[id] = hasSessions(id) ? 'treinando' : 'sugerido'
      blocked = true
    }
  }
  return result
}
