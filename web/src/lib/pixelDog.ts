// O Milo em pixel art, de frente, num estilo de RPG em pixel art com sombreado ("HD-2D"):
// várias tonalidades por cor, luz vindo de cima à esquerda, contorno escuro quente e sombra no
// chão. Desenho próprio, feito a partir de uma foto do Milo (fox terrier de pelo curto tricolor):
// cabeça preta com sobrancelhas, bochechas e focinho castanhos, queixo branco, orelhas pretas
// dobradas, peito e patas brancos, mancha preta nas costas com uma pinta castanha e o rabinho
// cortado em pé atrás do corpo.
//
// Os quadros são gerados por código (sem arquivos de imagem): funciona offline.

export const DOG_W = 32
export const DOG_H = 32

export const DOG_COLORS = {
  outline: '#1b1412',
  black: '#2a2422',
  blackLight: '#4a403b',
  white: '#f4f1ea',
  whiteShade: '#cfc8bb',
  whiteDeep: '#a39b8e',
  tan: '#b8662a',
  tanShade: '#8a4519',
  tanLight: '#d68a46',
  eye: '#120d0c',
  glint: '#fdf6e3',
  tongue: '#e2687c',
  tongueShade: '#b8475a',
  crease: '#5a4f49',
  shadow: 'rgba(0,0,0,0.28)',
  motion: '#a8a29e',
} as const

export type Pixel = string | null
export type Frame = Pixel[][]

export interface Pose {
  /** Rabinho: −1 e 1 para os lados, 0 em pé. */
  tail: -1 | 0 | 1
  /** Respiração: corpo e cabeça descem 1 pixel (as patas ficam no chão). */
  bob?: boolean
  /** Língua de fora, ofegante de alegria. */
  tongue?: boolean
  /** Olhos fechados. */
  blink?: boolean
  /** Orelha esquerda mexendo. */
  ear?: boolean
}

const C = DOG_COLORS
/** A partir desta linha ficam as patas (não sobem nem descem na respiração). */
const LEGS_FROM = 24

export function dogFrame(p: Pose): Frame {
  const g: Frame = Array.from({ length: DOG_H }, () => Array<Pixel>(DOG_W).fill(null))
  const dy = p.bob ? 1 : 0
  /** Pinta um pixel; acima das patas, acompanha a respiração. */
  const px = (x: number, y: number, c: string) => {
    const yy = y >= LEGS_FROM ? y : y + dy
    if (x >= 0 && x < DOG_W && yy >= 0 && yy < DOG_H) g[yy]![x] = c
  }
  const rect = (x0: number, y0: number, x1: number, y1: number, c: string) => {
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) px(x, y, c)
  }

  // ---------- Rabinho (atrás do corpo): base branca, ponta preta ----------
  const tx = 26 + p.tail
  rect(25, 13, 26, 14, C.white)
  px(26, 12, C.white)
  px(tx, 11, C.white)
  px(tx + 1, 11, C.whiteShade)
  px(tx, 10, C.black)
  px(tx + 1, 10, C.black)
  px(tx, 9, C.blackLight)

  // ---------- Corpo atrás do peito (o Milo está um pouco de lado) ----------
  rect(19, 14, 27, 23, C.white)
  rect(19, 14, 27, 17, C.black) // mancha preta nas costas
  rect(20, 14, 25, 14, C.blackLight) // brilho da luz nas costas
  rect(23, 18, 26, 18, C.black)
  px(25, 19, C.tanShade) // pinta castanha
  px(26, 19, C.tan)
  rect(26, 20, 27, 23, C.whiteShade)
  rect(19, 22, 25, 23, C.whiteShade)
  // Pata de trás.
  rect(24, 24, 26, 28, C.whiteShade)
  px(26, 26, C.whiteDeep)
  px(26, 27, C.whiteDeep)
  rect(23, 29, 27, 29, C.whiteShade)

  // ---------- Peito e pescoço ----------
  rect(10, 13, 21, 23, C.white)
  rect(9, 15, 9, 22, C.white)
  rect(20, 15, 21, 23, C.whiteShade)
  rect(10, 22, 19, 23, C.whiteShade)
  px(9, 22, C.whiteShade)
  rect(14, 21, 16, 21, C.whiteShade) // pelo do peito

  // ---------- Patas da frente ----------
  rect(11, 24, 13, 28, C.white)
  rect(13, 24, 13, 28, C.whiteShade)
  rect(17, 24, 19, 28, C.white)
  rect(19, 24, 19, 28, C.whiteDeep)
  rect(10, 29, 14, 29, C.white)
  rect(16, 29, 20, 29, C.white)
  px(12, 29, C.whiteShade) // dedinhos
  px(18, 29, C.whiteShade)
  px(14, 29, C.whiteShade)
  px(20, 29, C.whiteShade)

  // ---------- Cabeça preta ----------
  rect(11, 3, 20, 3, C.black)
  rect(10, 4, 21, 4, C.black)
  rect(9, 5, 22, 11, C.black)
  rect(10, 12, 21, 12, C.black)
  rect(11, 13, 20, 13, C.black)
  rect(12, 3, 18, 3, C.blackLight) // brilho no alto da cabeça
  rect(11, 4, 13, 4, C.blackLight)

  // Orelhas pretas dobradas para a frente (a esquerda mexe de vez em quando).
  const e = p.ear ? -1 : 0
  for (const [x, y] of [
    [7, 3],
    [8, 3],
    [6, 4],
    [7, 4],
    [8, 4],
    [9, 4],
    [6, 5],
    [7, 5],
    [8, 5],
    [7, 6],
    [8, 6],
    [8, 7],
  ] as const)
    px(x, y + (y <= 4 ? e : 0), C.black)
  px(7, 3 + e, C.blackLight)
  for (const [x, y] of [
    [23, 3],
    [24, 3],
    [22, 4],
    [23, 4],
    [24, 4],
    [25, 4],
    [23, 5],
    [24, 5],
    [25, 5],
    [23, 6],
    [24, 6],
    [23, 7],
  ] as const)
    px(x, y, C.black)
  // Dobra da orelha (separa a orelha da cabeça).
  for (const [x, y] of [
    [9, 5],
    [9, 6],
    [9, 7],
    [22, 5],
    [22, 6],
    [22, 7],
  ] as const)
    px(x, y, C.crease)

  // Sobrancelhas castanhas.
  rect(11, 6, 12, 6, C.tan)
  rect(19, 6, 20, 6, C.tan)
  px(11, 6, C.tanLight)
  px(19, 6, C.tanLight)

  // Olhos (2×2 com brilho), ou fechados.
  if (p.blink) {
    rect(11, 8, 13, 8, C.eye)
    rect(18, 8, 20, 8, C.eye)
  } else {
    rect(12, 7, 13, 8, C.eye)
    rect(18, 7, 19, 8, C.eye)
    px(12, 7, C.glint)
    px(18, 7, C.glint)
  }

  // Bochechas castanhas.
  rect(10, 9, 13, 11, C.tan)
  rect(18, 9, 21, 11, C.tan)
  rect(10, 11, 13, 11, C.tanShade)
  rect(18, 11, 21, 11, C.tanShade)
  px(10, 9, C.tanLight)

  // Focinho: ponte preta, focinho castanho, nariz, queixo branco.
  rect(14, 8, 17, 9, C.black)
  px(15, 8, C.blackLight)
  rect(13, 10, 18, 12, C.tan)
  rect(14, 10, 17, 10, C.tanLight)
  rect(13, 12, 18, 12, C.tanShade)
  rect(15, 10, 16, 11, C.eye) // nariz
  px(15, 10, C.blackLight)
  rect(13, 13, 18, 13, C.white) // queixo
  rect(17, 13, 18, 13, C.whiteShade)

  if (p.tongue) {
    rect(15, 13, 16, 14, C.tongue)
    px(16, 14, C.tongueShade)
    px(15, 15, C.tongue)
    px(16, 15, C.tongueShade)
  }

  // ---------- Contorno escuro (só onde encosta no vazio) ----------
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
      if (near) out[y]![x] = C.outline
    }
  }

  // Risquinhos de movimento ao lado do rabinho.
  if (p.tail !== 0) {
    const mx = p.tail > 0 ? 30 : 23
    for (const y of [8, 10]) if (!out[y + dy]?.[mx]) out[y + dy]![mx] = C.motion
  }

  // Sombra no chão (por baixo de tudo).
  for (let x = 8; x <= 29; x++) {
    const edge = x <= 9 || x >= 28
    for (const y of edge ? [30] : [30, 31]) if (!out[y]![x]) out[y]![x] = C.shadow
  }
  return out
}

/**
 * Animação "parado" de personagem de RPG, em ciclo: rabinho abanando rápido, respiração lenta,
 * língua de fora acompanhando a respiração, piscadas e a orelha mexendo de vez em quando.
 */
export const DOG_TIMELINE: Pose[] = Array.from({ length: 48 }, (_, i) => ({
  tail: ([-1, 0, 1, 0] as const)[i % 4]!,
  bob: Math.floor(i / 6) % 2 === 1,
  tongue: i < 36,
  blink: i === 20 || i === 21 || i === 44,
  ear: i >= 30 && i <= 32,
}))

/** Pose parada (para quem prefere menos movimento). */
export const DOG_STILL: Pose = { tail: 0, tongue: true }
