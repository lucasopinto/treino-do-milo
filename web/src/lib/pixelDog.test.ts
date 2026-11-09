import { describe, expect, it } from 'vitest'
import { DOG_COLORS, DOG_H, DOG_TIMELINE, DOG_W, dogFrame, type Frame } from './pixelDog'

const colorsIn = (f: Frame) => new Set(f.flat().filter(Boolean))
const firstRowWith = (f: Frame, color: string) => f.findIndex((row) => row.includes(color))
const diff = (a: Frame, b: Frame) => a.flat().filter((c, i) => c !== b.flat()[i]).length

describe('fox terrier em pixel art', () => {
  it('todos os quadros têm o mesmo tamanho', () => {
    for (const p of DOG_TIMELINE) {
      const f = dogFrame(p)
      expect(f).toHaveLength(DOG_H)
      for (const row of f) expect(row).toHaveLength(DOG_W)
    }
  })

  it('é tricolor como o Milo: branco, preto e castanho', () => {
    const c = colorsIn(dogFrame({ drop: 0, tail: 0 }))
    expect(c).toContain(DOG_COLORS.white)
    expect(c).toContain(DOG_COLORS.black)
    expect(c).toContain(DOG_COLORS.tan)
  })

  it('abana o rabinho: só o rabo muda entre os quadros', () => {
    const a = dogFrame({ drop: 0, tail: 1 })
    const b = dogFrame({ drop: 0, tail: -1 })
    const changed = diff(a, b)
    expect(changed).toBeGreaterThan(0)
    expect(changed).toBeLessThan(20) // pouca coisa: o corpo fica parado
  })

  it('agachado, a cabeça desce e o rabo continua em pé', () => {
    const up = dogFrame({ drop: 0, tail: 0 })
    const down = dogFrame({ drop: 4, tail: 0 })
    expect(firstRowWith(down, DOG_COLORS.tan)).toBe(firstRowWith(up, DOG_COLORS.tan) + 4)
    // Ponta preta do rabinho no mesmo lugar (a traseira fica para cima).
    expect(down[5]![8]).toBe(DOG_COLORS.black)
  })

  it('a animação agacha e volta a ficar em pé', () => {
    expect(DOG_TIMELINE[0]!.drop).toBe(0)
    expect(Math.max(...DOG_TIMELINE.map((p) => p.drop))).toBe(4)
    expect(DOG_TIMELINE.some((p) => p.drop === 4 && p.tongue)).toBe(true)
  })
})
