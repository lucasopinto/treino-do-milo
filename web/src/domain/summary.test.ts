import { describe, expect, it } from 'vitest'
import { accidentFreeStreak, bestAccidentFreeStreak, daySummary } from './summary'
import { activity, dt, elim, session } from './test-helpers'

describe('daySummary', () => {
  it('conta só o que é do dia e ignora excluídos', () => {
    const deleted = { ...elim(dt(9, 9), 'dentro'), deletedAt: 1 }
    const r = daySummary(dt(9), {
      sessions: [session({ at: dt(9, 8), actualSec: 420 }), session({ at: dt(8, 8) })],
      eliminations: [elim(dt(9, 7)), elim(dt(9, 10), 'dentro'), elim(dt(9, 11), 'fora', 'coco'), deleted, elim(dt(8, 7), 'dentro')],
      activities: [activity(dt(9, 7), 30), activity(dt(9, 18), 25), activity(dt(8, 7), 60)],
    })
    expect(r).toMatchObject({
      sessions: 1,
      trainingMin: 7,
      activityMin: 55,
      peeOutside: 1,
      peeInside: 1,
      pooOutside: 1,
      pooInside: 0,
      accidents: 1,
    })
  })
})

describe('accidentFreeStreak', () => {
  const now = dt(9, 20)

  it('sem registros = 0', () => {
    expect(accidentFreeStreak([], now)).toBe(0)
  })

  it('acidente hoje = 0', () => {
    expect(accidentFreeStreak([elim(dt(9, 8), 'dentro')], now)).toBe(0)
  })

  it('último acidente ontem = 1', () => {
    expect(accidentFreeStreak([elim(dt(8, 22), 'dentro'), elim(dt(9, 7))], now)).toBe(1)
  })

  it('último acidente há 5 dias = 5', () => {
    expect(accidentFreeStreak([elim(dt(1, 8), 'dentro'), elim(dt(4, 8), 'dentro'), elim(dt(9, 7))], now)).toBe(5)
  })

  it('nunca teve acidente = dias desde o primeiro registro, contando hoje', () => {
    expect(accidentFreeStreak([elim(dt(7, 8)), elim(dt(9, 8))], now)).toBe(3)
  })

  it('acidente excluído não conta', () => {
    const deleted = { ...elim(dt(9, 8), 'dentro'), deletedAt: 1 }
    expect(accidentFreeStreak([elim(dt(8, 8)), deleted], now)).toBe(2)
  })
})

describe('bestAccidentFreeStreak', () => {
  it('acha a maior sequência', () => {
    const list = [elim(dt(1, 8)), elim(dt(2, 8), 'dentro'), elim(dt(7, 8), 'dentro'), elim(dt(9, 8))]
    // dias 3,4,5,6 = 4 seguidos; depois 8,9 = 2
    expect(bestAccidentFreeStreak(list, dt(9, 20))).toBe(4)
  })
})
