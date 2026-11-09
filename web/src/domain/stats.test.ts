import { describe, expect, it } from 'vitest'
import { accidentHotspots, eliminationsByDay, periodBuckets, rateBySkill, statsByPeriod, trainerComparison } from './stats'
import { completeStreak, lastDays } from './checklist'
import { mergeRecords } from './merge'
import { activity, dt, elim, session } from './test-helpers'
import type { ChecklistDay } from './types'

describe('xixi: últimas 4 semanas', () => {
  it('gera 28 dias com taxa de acerto lá fora', () => {
    const days = eliminationsByDay([elim(dt(9, 7)), elim(dt(9, 9)), elim(dt(9, 12), 'dentro'), elim(dt(9, 18))], dt(9, 20))
    expect(days).toHaveLength(28)
    const today = days[27]!
    expect(today).toMatchObject({ outside: 3, inside: 1, outsideRate: 75 })
    expect(days[0]!.outsideRate).toBeNull()
  })

  it('aponta os horários com mais acidentes', () => {
    const list = [elim(dt(1, 14, 10), 'dentro'), elim(dt(2, 14, 50), 'dentro'), elim(dt(3, 9), 'dentro'), elim(dt(3, 14), 'fora')]
    const hot = accidentHotspots(list)
    expect(hot[0]).toMatchObject({ hour: 14, count: 2, label: '14h–15h' })
    expect(hot[1]).toMatchObject({ hour: 9, count: 1 })
    expect(hot).toHaveLength(2)
  })
})

describe('períodos', () => {
  it('semanas começam na segunda-feira', () => {
    const b = periodBuckets(dt(11, 10), 'semana', 2) // 11/11/2026 é quarta
    expect(new Date(b[1]!.start)).toEqual(new Date(2026, 10, 9))
    expect(new Date(b[0]!.start)).toEqual(new Date(2026, 10, 2))
  })

  it('meses atravessam o ano', () => {
    const b = periodBuckets(new Date(2027, 0, 15), 'mes', 3)
    expect(new Date(b[0]!.start)).toEqual(new Date(2026, 10, 1))
    expect(new Date(b[2]!.end)).toEqual(new Date(2027, 1, 1))
  })

  it('agrega sessões, acerto, acidentes e atividade', () => {
    const b = periodBuckets(dt(11, 10), 'semana', 1)
    const [w] = statsByPeriod(
      b,
      {
        sessions: [session({ at: dt(9), hits: 6, misses: 4 }), session({ at: dt(10), hits: 9, misses: 1 }), session({ at: dt(2) })],
        eliminations: [elim(dt(9)), elim(dt(10), 'dentro')],
        activities: [activity(dt(9), 40), activity(dt(10), 50), activity(dt(11), 60)],
      },
      dt(11, 10),
    )
    expect(w).toMatchObject({ sessions: 2, hitRate: 75, accidents: 1, outsideRate: 50, activityMin: 150, activityPerDay: 50 })
  })
})

describe('comparativos', () => {
  it('taxa por comando', () => {
    const r = rateBySkill([session({ hits: 8, misses: 2 }), session({ hits: 2, misses: 8 }), session({ skillId: 'aqui', hits: 1, misses: 0 })])
    expect(r.find((x) => x.skillId === 'senta')).toMatchObject({ sessions: 2, rate: 50 })
    expect(r.find((x) => x.skillId === 'aqui')).toMatchObject({ rate: 100 })
  })

  it('Lucas x Pai', () => {
    const trainers = [
      { id: 'lucas', name: 'Lucas' },
      { id: 'pai', name: 'Pai' },
    ]
    const r = trainerComparison(trainers, {
      sessions: [session({ trainerId: 'pai', hits: 9, misses: 1 }), session({ trainerId: 'lucas' })],
      eliminations: [elim(dt(9), 'fora', 'xixi', 'pai'), elim(dt(9), 'dentro', 'xixi', 'pai')],
      activities: [activity(dt(9), 30, 'pai')],
    })
    expect(r[1]).toMatchObject({ name: 'Pai', sessions: 1, hitRate: 90, eliminations: 2, outsideRate: 50, activityMin: 30 })
    expect(r[0]).toMatchObject({ name: 'Lucas', sessions: 1, eliminations: 0, outsideRate: null })
  })
})

describe('checklist', () => {
  const day = (id: string, all: boolean): ChecklistDay => ({
    id,
    createdAt: 0,
    updatedAt: 0,
    deletedAt: null,
    deviceId: 'x',
    items: { comida: true, passeio: true, brincadeira: all, carinho: true },
  })

  it('sequência de dias completos; hoje incompleto não zera', () => {
    const days = [day('2026-11-06', true), day('2026-11-07', true), day('2026-11-08', true), day('2026-11-09', false)]
    expect(completeStreak(days, dt(9))).toBe(3)
  })

  it('hoje completo entra na conta', () => {
    expect(completeStreak([day('2026-11-08', true), day('2026-11-09', true)], dt(9))).toBe(2)
  })

  it('histórico dos últimos dias', () => {
    const r = lastDays([day('2026-11-09', false)], dt(9), 7)
    expect(r).toHaveLength(7)
    expect(r[6]).toMatchObject({ key: '2026-11-09', count: 3, complete: false })
    expect(r[0]!.count).toBe(0)
  })
})

describe('mesclar backups', () => {
  const rec = (id: string, updatedAt: number, deviceId = 'a') => ({
    id,
    createdAt: 0,
    updatedAt,
    deletedAt: null as number | null,
    deviceId,
    v: updatedAt,
  })

  it('o mais recente vence; novos são adicionados', () => {
    const r = mergeRecords([rec('1', 10), rec('2', 50)], [rec('1', 20), rec('2', 40), rec('3', 1)])
    expect(r.toWrite.map((x) => `${x.id}@${x.updatedAt}`)).toEqual(['1@20', '3@1'])
    expect(r).toMatchObject({ added: 1, updated: 1, unchanged: 1 })
  })

  it('empate é decidido pelo deviceId, igual nos dois lados', () => {
    const r1 = mergeRecords([rec('1', 10, 'a')], [rec('1', 10, 'b')])
    const r2 = mergeRecords([rec('1', 10, 'b')], [rec('1', 10, 'a')])
    expect(r1.updated).toBe(1)
    expect(r2.unchanged).toBe(1)
  })

  it('exclusão mais recente se propaga', () => {
    const deleted = { ...rec('1', 30), deletedAt: 30 }
    expect(mergeRecords([rec('1', 10)], [deleted]).toWrite[0]!.deletedAt).toBe(30)
  })
})
