// Sons gerados na hora com a Web Audio API (sem arquivos, funciona offline).
// Um único AudioContext, criado/destravado no primeiro toque, para latência mínima.
import type { SoundType } from '../domain/types'

type AC = typeof AudioContext
let ctx: AudioContext | null = null
let noise: AudioBuffer | null = null
let volume = 0.9
let clickType: SoundType = 'clique'

let createdAt = 0
/** O iOS derrubou o áudio (tela bloqueada, app no fundo): recriar no próximo toque. */
let stale = false
/** Última leitura do relógio do áudio, para notar quando ele para de andar. */
let snap: { wall: number; audio: number } | null = null

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!ctx) {
    const Ctor: AC | undefined = window.AudioContext ?? (window as unknown as { webkitAudioContext?: AC }).webkitAudioContext
    if (!Ctor) return null
    try {
      ctx = new Ctor({ latencyHint: 'interactive' })
      createdAt = performance.now()
      stale = false
      snap = null
    } catch {
      return null
    }
  }
  // 'suspended' antes do primeiro toque; 'interrupted' no iOS depois de ir para o fundo ou de uma ligação.
  if (ctx.state !== 'running') ctx.resume().catch(() => {})
  return ctx
}

/**
 * O som está funcionando de verdade? No iOS, depois de a tela bloquear ou o app ficar
 * parado, o áudio às vezes diz que está 'running' mas fica mudo, com o relógio parado.
 */
export function audioHealthy(): boolean {
  if (!ctx || stale || ctx.state !== 'running') return false
  const wall = performance.now()
  const audio = ctx.currentTime
  if (snap && wall - snap.wall > 300) {
    const wallSec = (wall - snap.wall) / 1000
    if (audio - snap.audio < wallSec * 0.5) {
      stale = true // relógio do áudio parado: áudio "zumbi"
      snap = null
      return false
    }
  }
  snap = { wall, audio }
  return true
}

/**
 * Chamar em todo toque (pointerup/touchend/click/keydown): libera o som e, se o iOS
 * o derrubou, joga fora o áudio velho e cria um novo. É o que "fechar e abrir o app" fazia.
 */
export function ensureAudio(): void {
  if (audioHealthy()) return
  // Recém-criado: ainda pode estar terminando de ligar; só pede para continuar.
  if (ctx && !stale && performance.now() - createdAt < 1000) {
    ctx.resume().catch(() => {})
    return
  }
  if (ctx) {
    ctx.close().catch(() => {})
    ctx = null
    noise = null
  }
  unlockAudio()
}

if (typeof document !== 'undefined') {
  // Tela bloqueada ou app no fundo: o iOS costuma estragar o áudio. Recria no próximo toque.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') stale = true
  })
  window.addEventListener('pagehide', () => {
    stale = true
  })
}

function getNoise(c: AudioContext): AudioBuffer {
  if (!noise) {
    const len = Math.floor(c.sampleRate * 0.03)
    noise = c.createBuffer(1, len, c.sampleRate)
    const data = noise.getChannelData(0)
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1
  }
  return noise
}

let silentEl: HTMLAudioElement | null = null

/**
 * iOS antes do 17 (sem `navigator.audioSession`): a Web Audio fica muda com a chave de
 * silêncio ligada. Tocar um <audio> (mesmo em silêncio) num toque muda a sessão de áudio
 * da página para "mídia", e aí a Web Audio passa a tocar também.
 */
function playSilentMediaElement(): void {
  if (typeof Audio === 'undefined') return
  if (!silentEl) {
    // WAV de 0,1 s de silêncio, gerado na hora (sem arquivo, funciona offline).
    const rate = 8000
    const samples = rate / 10
    const buf = new ArrayBuffer(44 + samples)
    const v = new DataView(buf)
    const str = (o: number, t: string) => [...t].forEach((ch, i) => v.setUint8(o + i, ch.charCodeAt(0)))
    str(0, 'RIFF')
    v.setUint32(4, 36 + samples, true)
    str(8, 'WAVEfmt ')
    v.setUint32(16, 16, true)
    v.setUint16(20, 1, true) // PCM
    v.setUint16(22, 1, true) // mono
    v.setUint32(24, rate, true)
    v.setUint32(28, rate, true)
    v.setUint16(32, 1, true)
    v.setUint16(34, 8, true) // 8 bits
    str(36, 'data')
    v.setUint32(40, samples, true)
    for (let i = 0; i < samples; i++) v.setUint8(44 + i, 128) // 128 = silêncio em 8 bits
    silentEl = new Audio(URL.createObjectURL(new Blob([buf], { type: 'audio/wav' })))
    silentEl.setAttribute('playsinline', '')
    silentEl.preload = 'auto'
  }
  silentEl.play().catch(() => {})
}

/**
 * Chamar num toque do usuário: navegadores só liberam áudio depois de uma interação.
 * Atenção: no celular, `pointerdown` de toque NÃO conta como interação; contam
 * `pointerup`, `touchend`, `click` e `keydown`.
 */
export function unlockAudio(): void {
  // iOS 17+: tocar mesmo com a chave de silêncio ligada (o clicker precisa ser ouvido).
  const nav = navigator as Navigator & { audioSession?: { type: string } }
  if (nav.audioSession) {
    if (nav.audioSession.type !== 'playback') {
      try {
        nav.audioSession.type = 'playback'
      } catch {
        /* navegador sem suporte */
      }
    }
  } else {
    playSilentMediaElement()
  }
  const c = getCtx()
  if (!c) return
  // Toca um som vazio (necessário no iOS).
  const src = c.createBufferSource()
  src.buffer = c.createBuffer(1, 1, c.sampleRate)
  src.connect(c.destination)
  src.start(0)
  getNoise(c)
}

export function configureAudio(type: SoundType, vol: number): void {
  clickType = type
  volume = Math.max(0, Math.min(1, vol))
}

function envGain(c: AudioContext, t: number, peak: number, dur: number): GainNode {
  const g = c.createGain()
  g.gain.setValueAtTime(Math.max(0.0001, peak * volume), t)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  g.connect(c.destination)
  return g
}

function tone(c: AudioContext, t: number, freq: number, dur: number, peak = 0.5, wave: OscillatorType = 'sine') {
  const o = c.createOscillator()
  o.type = wave
  o.frequency.setValueAtTime(freq, t)
  o.connect(envGain(c, t, peak, dur))
  o.start(t)
  o.stop(t + dur + 0.02)
}

/** Som do clicker. Curto e seco para marcar o momento exato. */
export function playClick(type: SoundType = clickType): void {
  const c = getCtx()
  if (!c || volume === 0) return
  const t = c.currentTime
  if (type === 'clique') {
    // Dois estalos rápidos, como a lâmina de metal de um clicker de verdade.
    for (const [offset, peak] of [
      [0, 1],
      [0.018, 0.6],
    ] as const) {
      const src = c.createBufferSource()
      src.buffer = getNoise(c)
      const bp = c.createBiquadFilter()
      bp.type = 'bandpass'
      bp.frequency.value = 3200
      bp.Q.value = 0.9
      src.connect(bp)
      bp.connect(envGain(c, t + offset, peak, 0.012))
      src.start(t + offset)
      src.stop(t + offset + 0.02)
      tone(c, t + offset, 1900, 0.01, peak * 0.35, 'square')
    }
  } else if (type === 'madeira') {
    const o = c.createOscillator()
    o.type = 'triangle'
    o.frequency.setValueAtTime(1250, t)
    o.frequency.exponentialRampToValueAtTime(700, t + 0.05)
    o.connect(envGain(c, t, 0.9, 0.07))
    o.start(t)
    o.stop(t + 0.09)
  } else {
    tone(c, t, 2700, 0.07, 0.5)
  }
}

export type Cue = 'aviso' | 'fim' | 'lembrete' | 'ok' | 'erro'

/** Sinais sonoros para avisos e confirmações. */
export function playCue(cue: Cue): void {
  const c = getCtx()
  if (!c || volume === 0) return
  const t = c.currentTime
  switch (cue) {
    case 'ok':
      tone(c, t, 880, 0.09, 0.35)
      tone(c, t + 0.08, 1320, 0.12, 0.35)
      break
    case 'erro':
      tone(c, t, 330, 0.12, 0.3, 'triangle')
      break
    case 'aviso':
      tone(c, t, 1040, 0.15, 0.5)
      tone(c, t + 0.25, 1040, 0.15, 0.5)
      break
    case 'fim':
      tone(c, t, 784, 0.25, 0.55)
      tone(c, t + 0.3, 988, 0.25, 0.55)
      tone(c, t + 0.6, 1319, 0.5, 0.6)
      break
    case 'lembrete':
      for (let i = 0; i < 3; i++) {
        tone(c, t + i * 0.45, 1175, 0.15, 0.55)
        tone(c, t + i * 0.45 + 0.17, 1568, 0.2, 0.55)
      }
      break
  }
}
