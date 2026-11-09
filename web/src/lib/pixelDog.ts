// O Milo em pixel art, de frente, no estilo dos "sprites" de jogo: feito a partir de uma foto dele.
// Fox terrier de pelo curto tricolor: cabeça preta com "sobrancelhas", bochechas e focinho
// castanhos, queixo branco, orelhas pretas dobradas, peito e patas brancos, mancha preta nas
// costas com uma pinta castanha e o rabinho cortado em pé, aparecendo atrás do corpo.
//
// Os quadros são gerados por código (sem arquivos de imagem): funciona offline.

export const DOG_W = 24
export const DOG_H = 24

export const DOG_COLORS = {
  white: '#fafaf9',
  shade: '#d6d3d1',
  black: '#1c1917',
  tan: '#b8662a',
  tongue: '#f472b6',
  motion: '#a8a29e',
  crease: '#57534e',
} as const

export type Pixel = string | null
export type Frame = Pixel[][]

export interface Pose {
  /** Rabinho: −1 para a esquerda, 0 em pé, 1 para a direita. */
  tail: -1 | 0 | 1
  /** "Respiração" dos jogos: corpo e cabeça descem 1 pixel. */
  bob?: boolean
  /** Língua de fora, ofegante de alegria. */
  tongue?: boolean
  /** Olhos fechados (piscando). */
  blink?: boolean
}

// Desenho base, de frente. K preto, W branco, S branco na sombra, T castanho, E olho, N nariz,
// G dobra da orelha (separa a orelha preta da cabeça preta).
// O contorno escuro em volta é calculado depois.
const BASE = [
  '........................',
  '........................',
  '.....KK..KKKKKK..KK.....',
  '....KKKGKKKKKKKKGKKK....',
  '....KKKGKKKKKKKKGKKK....',
  '....KKKKTKKKKKKTKKKK....',
  '....KKKTETKKKKTETKKK....',
  '....KKKTTTKKKKTTTKKK....',
  '.....KKTTTTNNTTTTKK.....',
  '.......TTTKTTKTTT.......',
  '........TWWWWWWT........',
  '.........WWWWWW.........',
  '........WWWWWWWWKKKK....',
  '.......WWWWWWWWWKKKK....',
  '.......WWWWWWWWWWWTW....',
  '.......SWWWWWWWWWWWW....',
  '.......SWWWWWWWWWWWW....',
  '.......SWWWWWWWWWSSW....',
  '........WW....WW.SS.....',
  '........WW....WW.SS.....',
  '........WW....WW.SS.....',
  '........WW....WW.SS.....',
  '.......WWWW..WWWWSSS....',
  '........................',
]

const PALETTE: Record<string, string> = {
  K: DOG_COLORS.black,
  W: DOG_COLORS.white,
  S: DOG_COLORS.shade,
  T: DOG_COLORS.tan,
  E: DOG_COLORS.black,
  N: DOG_COLORS.black,
  G: DOG_COLORS.crease,
}

/** Linha a partir da qual estão as pernas (não sobem nem descem na "respiração"). */
const LEGS_FROM = 18

// Rabinho atrás do corpo, à direita: base branca, ponta preta. [x, y, cor]
const TAILS: Record<Pose['tail'], [number, number, string][]> = {
  '-1': [
    [19, 11, 'W'],
    [20, 11, 'W'],
    [19, 10, 'W'],
    [20, 10, 'W'],
    [18, 9, 'K'],
    [19, 9, 'K'],
  ],
  '0': [
    [19, 11, 'W'],
    [20, 11, 'W'],
    [20, 10, 'W'],
    [21, 10, 'W'],
    [20, 9, 'K'],
    [21, 9, 'K'],
  ],
  '1': [
    [19, 11, 'W'],
    [20, 11, 'W'],
    [21, 10, 'W'],
    [22, 10, 'W'],
    [22, 9, 'K'],
    [23, 9, 'K'],
  ],
}

export function dogFrame(p: Pose): Frame {
  const g: Frame = Array.from({ length: DOG_H }, () => Array<Pixel>(DOG_W).fill(null))
  const set = (x: number, y: number, c: string) => {
    if (x >= 0 && x < DOG_W && y >= 0 && y < DOG_H) g[y]![x] = c
  }
  const dy = p.bob ? 1 : 0

  // Rabinho primeiro: o corpo fica na frente dele.
  for (const [x, y, k] of TAILS[p.tail]) set(x, y + dy, PALETTE[k]!)

  BASE.forEach((row, y) => {
    for (let x = 0; x < DOG_W; x++) {
      const k = row[x]!
      if (k === '.') continue
      set(x, y >= LEGS_FROM ? y : y + dy, PALETTE[k]!)
    }
  })

  if (p.blink) {
    // Olhos fechados: o castanho em volta vira uma linha escura.
    for (const x of [7, 9, 14, 16]) set(x, 6 + dy, DOG_COLORS.black)
  }
  if (p.tongue) {
    // Boca aberta com a língua para fora.
    for (const x of [11, 12]) {
      set(x, 10 + dy, DOG_COLORS.tongue)
      set(x, 11 + dy, DOG_COLORS.tongue)
    }
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
      if (near) out[y]![x] = DOG_COLORS.black
    }
  }

  // Risquinhos de movimento ao lado do rabinho, como nos jogos.
  if (p.tail !== 0) {
    const mx = p.tail > 0 ? 23 : 17
    for (const y of [8, 10]) if (!out[y + dy]?.[mx]) out[y + dy]![mx] = DOG_COLORS.motion
  }
  return out
}

/**
 * Animação em ciclo, como um personagem parado num jogo: o rabinho abana rápido para os
 * dois lados, o corpo "respira", a língua fica de fora e de vez em quando ele pisca.
 */
export const DOG_TIMELINE: Pose[] = Array.from({ length: 32 }, (_, i) => ({
  tail: ([-1, 0, 1, 0] as const)[i % 4]!,
  bob: Math.floor(i / 4) % 2 === 1,
  tongue: i < 24,
  blink: i === 13 || i === 14 || i === 29,
}))

/** Pose parada (para quem prefere menos movimento). */
export const DOG_STILL: Pose = { tail: 0, tongue: true }
