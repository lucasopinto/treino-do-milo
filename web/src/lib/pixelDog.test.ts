import { describe, expect, it } from 'vitest'
import { DOG_COLORS, DOG_H, DOG_TIMELINE, DOG_W, dogFrame, type Frame } from './pixelDog'

const colorsIn = (f: Frame) => new Set(f.flat().filter(Boolean))
const firstRowWith = (f: Frame, color: string) => f.findIndex((row) => row.includes(color))
const diff = (a: Frame, b: Frame) => a.flat().filter((c, i) => c !== b.flat()[i]).length

describe('Milo em pixel art', () => {
  it('todos os quadros têm o mesmo tamanho', () => {
    for (const p of DOG_TIMELINE) {
      const f = dogFrame(p)
      expect(f).toHaveLength(DOG_H)
      for (const row of f) expect(row).toHaveLength(DOG_W)
    }
  })

  it('é tricolor como o Milo: branco, preto e castanho', () => {
    const c = colorsIn(dogFrame({ tail: 0 }))
    expect(c).toContain(DOG_COLORS.white)
    expect(c).toContain(DOG_COLORS.black)
    expect(c).toContain(DOG_COLORS.tan)
  })

  it('abana o rabinho: entre um lado e outro, só o rabo (e os risquinhos) mudam', () => {
    const changed = diff(dogFrame({ tail: 1 }), dogFrame({ tail: -1 }))
    expect(changed).toBeGreaterThan(0)
    expect(changed).toBeLessThan(25)
  })

  it('na "respiração", a cabeça desce 1 pixel e as patas ficam no chão', () => {
    const up = dogFrame({ tail: 0 })
    const down = dogFrame({ tail: 0, bob: true })
    expect(firstRowWith(down, DOG_COLORS.tan)).toBe(firstRowWith(up, DOG_COLORS.tan) + 1)
    expect(down[DOG_H - 2]).toEqual(up[DOG_H - 2]) // linha das patas
  })

  it('pisca e põe a língua de fora', () => {
    expect(colorsIn(dogFrame({ tail: 0, tongue: true }))).toContain(DOG_COLORS.tongue)
    expect(diff(dogFrame({ tail: 0 }), dogFrame({ tail: 0, blink: true }))).toBeGreaterThan(0)
    expect(DOG_TIMELINE.some((p) => p.blink)).toBe(true)
    expect(new Set(DOG_TIMELINE.map((p) => p.tail))).toEqual(new Set([-1, 0, 1]))
  })
})
