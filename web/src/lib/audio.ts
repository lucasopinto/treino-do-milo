// Sons gerados na hora com a Web Audio API (sem arquivos, funciona offline).
// Um único AudioContext, criado/destravado no primeiro toque, para latência mínima.
import type { SoundType } from '../domain/types'

type AC = typeof AudioContext
let ctx: AudioContext | null = null
let noise: AudioBuffer | null = null
let volume = 0.9
let clickType: SoundType = 'clique'

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!ctx) {
    const Ctor: AC | undefined = window.AudioContext ?? (window as unknown as { webkitAudioContext?: AC }).webkitAudioContext
    if (!Ctor) return null
    try {
      ctx = new Ctor({ latencyHint: 'interactive' })
    } catch {
      return null
    }
  }
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
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

/** Chamar num toque do usuário: navegadores só liberam áudio depois de uma interação. */
export function unlockAudio(): void {
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
