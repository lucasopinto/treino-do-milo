import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// AudioContext de mentira: dá para "congelar" o relógio, como o iOS faz quando derruba o som.
class FakeAudioContext {
  static created: FakeAudioContext[] = []
  state: 'running' | 'suspended' | 'interrupted' | 'closed' = 'running'
  sampleRate = 44100
  frozen = false
  private base = performance.now()
  closed = false
  started = 0
  constructor() {
    FakeAudioContext.created.push(this)
  }
  get currentTime() {
    return this.frozen ? 0 : (performance.now() - this.base) / 1000
  }
  get destination() {
    return {}
  }
  resume() {
    return Promise.resolve()
  }
  close() {
    this.closed = true
    this.state = 'closed'
    return Promise.resolve()
  }
  createBuffer(_ch: number, len: number) {
    return { getChannelData: () => new Float32Array(len) }
  }
  createBufferSource() {
    return { buffer: null, connect: () => {}, start: () => (this.started += 1), stop: () => {} }
  }
  createBiquadFilter() {
    return { type: '', frequency: { value: 0 }, Q: { value: 0 }, connect: () => {} }
  }
  createGain() {
    return { gain: { setValueAtTime: () => {}, exponentialRampToValueAtTime: () => {} }, connect: () => {} }
  }
  createOscillator() {
    return { type: '', frequency: { setValueAtTime: () => {} }, connect: () => {}, start: () => {}, stop: () => {} }
  }
}

const docListeners: Record<string, () => void> = {}
let audio: typeof import('./audio')

beforeEach(async () => {
  vi.useFakeTimers({ toFake: ['performance'] })
  FakeAudioContext.created = []
  vi.stubGlobal('window', { AudioContext: FakeAudioContext, addEventListener: () => {} })
  vi.stubGlobal('document', {
    visibilityState: 'visible',
    addEventListener: (type: string, fn: () => void) => (docListeners[type] = fn),
  })
  vi.stubGlobal('navigator', { audioSession: { type: 'auto' } })
  vi.resetModules()
  audio = await import('./audio')
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('áudio do clicker no celular', () => {
  it('no primeiro toque cria o áudio e pede para tocar mesmo no modo silencioso', () => {
    expect(audio.audioHealthy()).toBe(false)
    audio.ensureAudio()
    expect(FakeAudioContext.created).toHaveLength(1)
    expect(audio.audioHealthy()).toBe(true)
    expect((navigator as unknown as { audioSession: { type: string } }).audioSession.type).toBe('playback')
  })

  it('áudio funcionando não é recriado a cada toque', () => {
    audio.ensureAudio()
    vi.advanceTimersByTime(5000)
    audio.ensureAudio()
    vi.advanceTimersByTime(60_000)
    audio.ensureAudio()
    expect(FakeAudioContext.created).toHaveLength(1)
  })

  it('quando o relógio do áudio para ("running" mas mudo), recria no próximo toque', () => {
    audio.ensureAudio()
    vi.advanceTimersByTime(2000)
    expect(audio.audioHealthy()).toBe(true)
    FakeAudioContext.created[0].frozen = true
    vi.advanceTimersByTime(2000)
    expect(audio.audioHealthy()).toBe(false)
    audio.ensureAudio()
    expect(FakeAudioContext.created).toHaveLength(2)
    expect(FakeAudioContext.created[0].closed).toBe(true)
    expect(audio.audioHealthy()).toBe(true)
  })

  it('depois de a tela bloquear (app no fundo), recria o áudio no próximo toque', () => {
    audio.ensureAudio()
    vi.advanceTimersByTime(2000)
    ;(document as unknown as { visibilityState: string }).visibilityState = 'hidden'
    docListeners.visibilitychange()
    expect(audio.audioHealthy()).toBe(false)
    audio.ensureAudio()
    expect(FakeAudioContext.created).toHaveLength(2)
  })

  it('áudio suspenso pelo sistema também é recriado', () => {
    audio.ensureAudio()
    vi.advanceTimersByTime(2000)
    FakeAudioContext.created[0].state = 'interrupted'
    audio.ensureAudio()
    expect(FakeAudioContext.created).toHaveLength(2)
  })
})
