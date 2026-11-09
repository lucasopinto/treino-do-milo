import { describe, expect, it } from 'vitest'
import { buildTimeline, DEFAULT_FILTERS } from './timeline'
import { activity, dt, elim, session } from './test-helpers'

const data = {
  sessions: [session({ at: dt(9, 8), skillId: 'senta' }), session({ at: dt(9, 9), skillId: 'aqui', trainerId: 'pai' }), session({ at: dt(1, 9) })],
  eliminations: [elim(dt(9, 7), 'fora', 'xixi', 'pai'), { ...elim(dt(9, 10)), deletedAt: 5 }],
  activities: [activity(dt(9, 18), 30)],
}
const now = dt(9, 20)

describe('linha do tempo', () => {
  it('ordena do mais recente e esconde excluídos', () => {
    const r = buildTimeline(data, { ...DEFAULT_FILTERS, days: 0 }, now)
    expect(r.map((e) => e.type)).toEqual(['atividade', 'sessao', 'sessao', 'eliminacao', 'sessao'])
  })

  it('filtra por período', () => {
    expect(buildTimeline(data, { ...DEFAULT_FILTERS, days: 7 }, now)).toHaveLength(4)
  })

  it('filtra por tipo, comando e pessoa', () => {
    expect(buildTimeline(data, { ...DEFAULT_FILTERS, type: 'eliminacao' }, now)).toHaveLength(1)
    expect(buildTimeline(data, { ...DEFAULT_FILTERS, skillId: 'aqui' }, now).map((e) => e.skillId)).toEqual(['aqui'])
    expect(buildTimeline(data, { ...DEFAULT_FILTERS, trainerId: 'pai' }, now)).toHaveLength(2)
  })
})
