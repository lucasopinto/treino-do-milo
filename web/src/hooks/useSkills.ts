import { useMemo } from 'react'
import { useSessions, useSkillProgress } from './useData'
import { LEVEL_COUNT, SKILLS, TRICK_ORDER } from '../content/skills'
import { skillStatus, trickStates, type SkillStatus, type TrickState } from '../domain/progress'
import type { SkillId, SkillProgress } from '../domain/types'

export interface SkillsOverview {
  loading: boolean
  status: Record<SkillId, SkillStatus>
  tricks: Record<string, TrickState>
  progressOf: (id: SkillId) => SkillProgress | undefined
}

export function useSkillsOverview(): SkillsOverview {
  const sessions = useSessions(0)
  const progress = useSkillProgress()
  return useMemo(() => {
    const list = sessions ?? []
    const byId = new Map((progress ?? []).map((p) => [p.id, p]))
    const status = {} as Record<SkillId, SkillStatus>
    for (const s of SKILLS) {
      const p = byId.get(s.id)
      status[s.id] = skillStatus(s.id, LEVEL_COUNT, list, p?.levelIndex ?? 0, p?.levelChangedAt ?? 0)
    }
    const tricks = trickStates(
      TRICK_ORDER,
      (id) => status[id].firm,
      (id) => list.some((x) => x.skillId === id),
    )
    return {
      loading: sessions === undefined || progress === undefined,
      status,
      tricks,
      progressOf: (id: SkillId) => byId.get(id),
    }
  }, [sessions, progress])
}
