import { describe, expect, it } from 'vitest'
import { dueOutings, nextOuting, outingsFromMeals } from './schedule'
import { dt } from './test-helpers'
import type { OutingTime } from './types'

const outings: OutingTime[] = [
  { id: 'b', time: '12:30', label: 'Meio do dia' },
  { id: 'a', time: '06:45', label: 'Ao acordar' },
  { id: 'c', time: '22:30', label: 'Antes de dormir' },
  { id: 'x', time: 'lixo', label: 'Inválido' },
]

describe('nextOuting', () => {
  it('pega a próxima saída do dia, mesmo fora de ordem na lista', () => {
    const r = nextOuting(outings, dt(9, 8, 0))!
    expect(r.outing.id).toBe('b')
    expect(r.at).toEqual(dt(9, 12, 30))
  })

  it('no horário exato, já considera a seguinte', () => {
    expect(nextOuting(outings, dt(9, 12, 30))!.outing.id).toBe('c')
  })

  it('depois da última do dia, devolve a primeira de amanhã', () => {
    const r = nextOuting(outings, dt(9, 23, 0))!
    expect(r.outing.id).toBe('a')
    expect(r.at).toEqual(dt(10, 6, 45))
  })

  it('sem horários válidos, devolve null', () => {
    expect(nextOuting([{ id: 'x', time: '25:00', label: '' }], dt(9))).toBeNull()
  })
})

describe('dueOutings', () => {
  it('dispara as saídas que caíram entre a última checagem e agora', () => {
    const r = dueOutings(outings, dt(9, 12, 29), dt(9, 12, 31))
    expect(r.map((o) => o.outing.id)).toEqual(['b'])
  })

  it('não dispara de novo na checagem seguinte', () => {
    expect(dueOutings(outings, dt(9, 12, 31), dt(9, 12, 32))).toEqual([])
  })

  it('ignora lembretes atrasados demais (app reaberto horas depois)', () => {
    expect(dueOutings(outings, dt(9, 6, 0), dt(9, 13, 0))).toEqual([])
  })

  it('funciona na virada da meia-noite', () => {
    const late: OutingTime[] = [{ id: 'z', time: '23:58', label: 'Tarde' }]
    const r = dueOutings(late, new Date(2026, 10, 9, 23, 57), new Date(2026, 10, 10, 0, 2))
    expect(r).toHaveLength(1)
    expect(r[0]!.at).toEqual(new Date(2026, 10, 9, 23, 58))
  })
})

describe('outingsFromMeals', () => {
  it('sugere saída 20 min depois de cada refeição', () => {
    expect(outingsFromMeals(['07:30', '18:50', 'x'])).toEqual(['07:50', '19:10'])
  })
})

describe('agenda noutro fuso (pai em Portugal, celular no Brasil)', () => {
  const LISBOA = 'Europe/Lisbon'
  const SP = 'America/Sao_Paulo'
  const noite = [{ id: 'd', time: '22:30', label: 'Antes de dormir' }]

  it('em Lisboa já passa das 22h: a saída das 22:30 de lá é daqui a poucos minutos', () => {
    // 22:10 em Lisboa = 19:10 em São Paulo (novembro: Lisboa UTC+0, São Paulo UTC−3).
    const now = new Date(Date.UTC(2026, 10, 9, 22, 10))
    const r = nextOuting(noite, now, LISBOA)!
    expect(r.at.getTime() - now.getTime()).toBe(20 * 60_000)
    expect(r.tomorrow).toBe(false)
    // No fuso do Brasil, a mesma agenda ainda está a 3h20.
    expect(nextOuting(noite, now, SP)!.at.getTime() - now.getTime()).toBe(200 * 60_000)
  })

  it('lembrete dispara às 22:30 de Lisboa, não às 22:30 do Brasil', () => {
    const lisboa2231 = new Date(Date.UTC(2026, 10, 9, 22, 31))
    expect(dueOutings(noite, new Date(lisboa2231.getTime() - 120_000), lisboa2231, undefined, LISBOA)).toHaveLength(1)
    expect(dueOutings(noite, new Date(lisboa2231.getTime() - 120_000), lisboa2231, undefined, SP)).toHaveLength(0)
  })

  it('depois da última saída de Lisboa, a próxima é amanhã cedo no horário de lá', () => {
    const now = new Date(Date.UTC(2026, 10, 9, 23, 0)) // 23:00 em Lisboa
    const r = nextOuting([{ id: 'a', time: '07:00', label: 'Manhã' }], now, LISBOA)!
    expect(r.tomorrow).toBe(true)
    expect(r.at.toISOString()).toBe('2026-11-10T07:00:00.000Z')
  })

  it('respeita o horário de verão de Portugal', () => {
    const now = new Date(Date.UTC(2026, 6, 1, 12, 0)) // julho: Lisboa UTC+1
    const r = nextOuting([{ id: 'a', time: '22:30', label: '' }], now, LISBOA)!
    expect(r.at.toISOString()).toBe('2026-07-01T21:30:00.000Z')
  })
})
