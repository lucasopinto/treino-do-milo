import { describe, expect, it } from 'vitest'
import { goodStreak, isGoodSession, sessionsAtLevel, skillProgressValue, skillStatus, trickStates } from './progress'
import { dt, session } from './test-helpers'
import type { SkillId } from './types'

const good = (day: number, extra = {}) => session({ at: dt(day), hits: 8, misses: 2, ...extra }) // 80%
const bad = (day: number, extra = {}) => session({ at: dt(day), hits: 5, misses: 5, ...extra }) // 50%
const tiny = (day: number, extra = {}) => session({ at: dt(day), hits: 3, misses: 0, ...extra }) // só 3 tentativas

describe('critério de avanço', () => {
  it('80% exatos com 5+ tentativas é sessão boa', () => {
    expect(isGoodSession({ hits: 4, misses: 1 })).toBe(true)
    expect(isGoodSession({ hits: 3, misses: 1 })).toBe(false) // 75% e só 4 tentativas
    expect(isGoodSession({ hits: 4, misses: 0 })).toBe(false) // 100% mas só 4 tentativas
  })

  it('conta só a sequência final de sessões boas', () => {
    expect(goodStreak([good(1), bad(2), good(3), good(4)])).toBe(2)
  })

  it('sessões com poucas tentativas não contam nem quebram a sequência', () => {
    expect(goodStreak([good(1), tiny(2), good(3), tiny(4), good(5)])).toBe(3)
  })

  it('3 sessões boas seguidas sugerem avançar', () => {
    const st = skillStatus('senta', 4, [bad(1), good(2), good(3), good(4)])
    expect(st.streak).toBe(3)
    expect(st.suggestAdvance).toBe(true)
  })

  it('no nível final (Firme) não sugere avançar', () => {
    const list = [good(2), good(3), good(4)].map((s) => ({ ...s, levelIndex: 3 }))
    const st = skillStatus('senta', 4, list, 3)
    expect(st.firm).toBe(true)
    expect(st.suggestAdvance).toBe(false)
    expect(st.progress).toBe(1)
  })

  it('só considera sessões do nível atual e depois da troca de nível', () => {
    const list = [good(1, { levelIndex: 0 }), good(2, { levelIndex: 1 }), good(3, { levelIndex: 1 }), good(9, { skillId: 'aqui' })]
    expect(sessionsAtLevel(list, 'senta', 1)).toHaveLength(2)
    expect(sessionsAtLevel(list, 'senta', 1, dt(3).getTime())).toHaveLength(1)
  })

  it('ignora sessões excluídas', () => {
    const st = skillStatus('senta', 4, [good(1), good(2), { ...good(3), deletedAt: 1 }])
    expect(st.streak).toBe(2)
  })
})

describe('barra de progresso', () => {
  it('cresce um terço do passo por sessão boa', () => {
    expect(skillProgressValue(0, 4, 0)).toBe(0)
    expect(skillProgressValue(0, 4, 3)).toBeCloseTo(1 / 3)
    expect(skillProgressValue(1, 4, 0)).toBeCloseTo(1 / 3)
    expect(skillProgressValue(2, 4, 1)).toBeCloseTo((2 + 1 / 3) / 3)
    expect(skillProgressValue(3, 4, 0)).toBe(1)
  })

  it('não passa do passo mesmo com muitas sessões boas', () => {
    expect(skillProgressValue(0, 4, 10)).toBeCloseTo(1 / 3)
  })
})

describe('regra dos truques', () => {
  const order: SkillId[] = ['pata', 'toca-aqui', 'reverencia', 'rolar', 'bang']

  it('no começo, só o primeiro é sugerido', () => {
    const r = trickStates(order, () => false, () => false)
    expect(r).toEqual({ pata: 'sugerido', 'toca-aqui': 'bloqueado', reverencia: 'bloqueado', rolar: 'bloqueado', bang: 'bloqueado' })
  })

  it('o próximo só é sugerido quando o anterior fica firme', () => {
    const firm = new Set<SkillId>(['pata'])
    const r = trickStates(order, (id) => firm.has(id), (id) => id === 'toca-aqui')
    expect(r.pata).toBe('firme')
    expect(r['toca-aqui']).toBe('treinando')
    expect(r.reverencia).toBe('bloqueado')
  })

  it('um truque firme depois de um não firme continua bloqueado na sugestão', () => {
    const firm = new Set<SkillId>(['reverencia'])
    const r = trickStates(order, (id) => firm.has(id), () => false)
    expect(r.pata).toBe('sugerido')
    expect(r.reverencia).toBe('bloqueado')
  })
})
