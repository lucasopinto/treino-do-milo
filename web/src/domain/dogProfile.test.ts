import { describe, expect, it } from 'vitest'
import { ageText, formatKg, latestWeight, parseKg } from './dogProfile'

const at = (y: number, m: number, d: number) => new Date(y, m - 1, d, 12)

describe('ficha do cachorro', () => {
  it('idade por extenso', () => {
    expect(ageText('2025-08-09', at(2026, 11, 9))).toBe('1 ano e 3 meses')
    expect(ageText('2025-11-09', at(2026, 11, 9))).toBe('1 ano')
    expect(ageText('2024-11-10', at(2026, 11, 9))).toBe('1 ano e 11 meses')
    expect(ageText('2026-06-01', at(2026, 11, 9))).toBe('5 meses')
    expect(ageText('2026-10-20', at(2026, 11, 9))).toBe('2 semanas')
    expect(ageText('2026-10-09', at(2026, 11, 9))).toBe('1 mês')
  })

  it('sem data ou data no futuro: sem idade', () => {
    expect(ageText(null)).toBeNull()
    expect(ageText('2030-01-01', at(2026, 11, 9))).toBeNull()
  })

  it('peso: aceita vírgula ou ponto e recusa valores absurdos', () => {
    expect(parseKg('7,4')).toBe(7.4)
    expect(parseKg('7.45')).toBe(7.45)
    expect(parseKg('0')).toBeNull()
    expect(parseKg('abc')).toBeNull()
    expect(formatKg(7.4)).toBe('7,4 kg')
  })

  it('pesagem mais recente', () => {
    expect(latestWeight([])).toBeNull()
    expect(latestWeight([{ id: 'a', at: 1, kg: 6 }, { id: 'b', at: 3, kg: 7 }, { id: 'c', at: 2, kg: 6.5 }])?.kg).toBe(7)
  })
})
