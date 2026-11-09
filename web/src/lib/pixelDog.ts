// Fox terrier de pelo curto em pixel art (tricolor: branco, sela preta e cabeça castanha,
// rabinho cortado em pé). Os quadros são gerados por código, sem arquivos de imagem:
// funciona offline e cada pose é só um conjunto de parâmetros.

export const DOG_W = 32
export const DOG_H = 24

export const DOG_COLORS = {
  white: '#fafaf9',
  shade: '#d6d3d1',
  black: '#1c1917',
  tan: '#b8662a',
  tanDark: '#7c3f14',
  tongue: '#f472b6',
} as const

export type Pixel = string | null
export type Frame = Pixel[][]

export interface Pose {
  /** Quanto a frente do corpo abaixa (0 = em pé, 4 = agachado, "posição de brincar"). */
  drop: number
  /** Rabinho: −1 para trás, 0 em pé, 1 para frente. */
  tail: -1 | 0 | 1
  /** Língua de fora (feliz). */
  tongue?: boolean
}

const GROUND = 22

export function dogFrame(p: Pose): Frame {
  const g: Frame = Array.from({ length: DOG_H }, () => Array<Pixel>(DOG_W).fill(null))
  const set = (x: number, y: number, c: string) => {
    if (x >= 0 && x < DOG_W && y >= 0 && y < DOG_H) g[y]![x] = c
  }
  // A frente abaixa mais que a traseira: o corpo inclina, o bumbum fica para cima.
  const dropAt = (x: number) => Math.round(p.drop * Math.min(1, Math.max(0, (x - 11) / 10)))
  const C = DOG_COLORS

  // Pernas de trás (não abaixam).
  for (let y = 15; y < GROUND; y++) {
    set(8, y, C.shade)
    set(9, y, C.shade)
    set(10, y, C.white)
    set(11, y, C.white)
  }
  for (const x of [7, 8, 9]) set(x, GROUND, C.shade)
  for (const x of [10, 11, 12]) set(x, GROUND, C.white)

  // Rabinho cortado, em pé, abanando. Base branca, ponta preta.
  const t = p.tail
  set(8, 8, C.white)
  set(9, 8, C.white)
  set(8 + (t > 0 ? 1 : 0), 7, C.white)
  set(9 + (t > 0 ? 1 : 0) + (t < 0 ? -1 : 0), 7, C.white)
  set(8 + t, 6, C.white)
  set(9 + t, 6, C.white)
  set(8 + t, 5, C.black)
  set(9 + t, 5, C.black)

  // Corpo branco, com a barriga um pouco mais escura.
  for (let x = 7; x <= 21; x++) {
    for (let y = 9; y <= 14; y++) set(x, y + dropAt(x), y === 14 ? C.shade : C.white)
  }
  // Sela preta nas costas.
  for (let x = 10; x <= 18; x++) {
    set(x, 9 + dropAt(x), C.black)
    set(x, 10 + dropAt(x), C.black)
    if (x >= 11 && x <= 17) set(x, 11 + dropAt(x), C.black)
  }
  // Peito e pescoço.
  for (let x = 20; x <= 22; x++) for (let y = 10; y <= 15; y++) set(x, y + dropAt(x), C.white)
  for (let x = 20; x <= 23; x++) for (let y = 6; y <= 9; y++) set(x, y + p.drop, C.white)

  // Pernas da frente: em pé vão até o chão; agachado, os antebraços deitam para a frente.
  const legTop = 16 + dropAt(21)
  for (let y = legTop; y < GROUND; y++) {
    set(19, y, C.shade)
    set(20, y, C.shade)
    set(21, y, C.white)
    set(22, y, C.white)
  }
  if (p.drop >= 3) {
    for (let x = 20; x <= 25; x++) set(x, GROUND - 1, x <= 21 ? C.shade : C.white)
    for (let x = 21; x <= 26; x++) set(x, GROUND, C.white)
  } else {
    for (const x of [19, 20]) set(x, GROUND, C.shade)
    for (const x of [21, 22, 23]) set(x, GROUND, C.white)
  }

  // Cabeça castanha, focinho branco comprido, orelha dobrada para a frente.
  const h = p.drop
  for (let x = 22; x <= 26; x++) for (let y = 2; y <= 6; y++) set(x, y + h, C.tan)
  for (let x = 26; x <= 28; x++) set(x, 4 + h, C.tan)
  for (let x = 26; x <= 29; x++) for (let y = 5; y <= 7; y++) set(x, y + h, C.white)
  for (let x = 22; x <= 25; x++) set(x, 7 + h, C.white)
  set(30, 5 + h, C.black) // nariz
  set(30, 6 + h, C.black)
  set(25, 4 + h, C.black) // olho
  for (const [x, y] of [
    [22, 1],
    [23, 1],
    [24, 1],
    [23, 2],
    [24, 2],
    [25, 2],
    [24, 3],
    [25, 3],
  ] as const)
    set(x, y + h, C.tanDark)
  if (p.tongue) {
    set(28, 8 + h, C.tongue)
    set(29, 8 + h, C.tongue)
  }

  // Contorno escuro em volta de tudo (estilo pixel art).
  const out = g.map((row) => row.slice())
  for (let y = 0; y < DOG_H; y++) {
    for (let x = 0; x < DOG_W; x++) {
      if (g[y]![x]) continue
      const near = [
        [x - 1, y],
        [x + 1, y],
        [x, y - 1],
        [x, y + 1],
      ].some(([nx, ny]) => g[ny!]?.[nx!])
      if (near) out[y]![x] = C.black
    }
  }
  return out
}

/** Sequência: abana em pé, agacha, abana agachado (com a língua de fora) e levanta. */
export const DOG_TIMELINE: Pose[] = [
  ...[0, 1, 0, -1, 0, 1, 0, -1].map((tail) => ({ drop: 0, tail: tail as Pose['tail'] })),
  { drop: 1, tail: 0 },
  { drop: 2, tail: 0 },
  { drop: 3, tail: 1 },
  { drop: 4, tail: -1 },
  ...[1, -1, 1, -1, 1, -1, 1, -1, 1, -1].map((tail) => ({ drop: 4, tail: tail as Pose['tail'], tongue: true })),
  { drop: 3, tail: 0 },
  { drop: 2, tail: 0 },
  { drop: 1, tail: 0 },
]

/** Pose parada (para quem prefere menos movimento): agachado, rabinho em pé. */
export const DOG_STILL: Pose = { drop: 4, tail: 0, tongue: true }
