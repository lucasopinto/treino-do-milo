import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// AudioContext de mentira: dá para "congelar" o relógio, como o iOS faz quando derruba o som,
// e disparar 'statechange' (ex.: 'interrupted' numa ligação).
class FakeAudioContext {
  static created: FakeAudioContext[] = []
  state: 'running' | 'suspended' | 'interrupted' | 'closed' = 'running'
  sampleRate = 44100
  frozen = false
  private base = performance.now()
  private listeners: Record<string, (() => void)[]> = {}
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
  addEventListener(type: string, fn: () => void) {
    ;(this.listeners[type] ??= []).push(fn)
  }
  /** Simula o sistema mudando o estado do áudio. */
  setState(state: FakeAudioContext['state']) {
    this.state = state
    for (const fn of this.listeners.statechange ?? []) fn()
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
const store = new Map<string, string>()
let audio: typeof import('./audio')

const session = () => (navigator as unknown as { audioSession: { type: string } }).audioSession.type

/** Carrega o módulo de áudio de novo, como ao abrir o app. */
async function openApp() {
  vi.resetModules()
  audio = await import('./audio')
}

beforeEach(async () => {
  vi.useFakeTimers({ toFake: ['performance'] })
  FakeAudioContext.created = []
  store.clear()
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  })
  vi.stubGlobal('window', { AudioContext: FakeAudioContext, addEventListener: () => {} })
  vi.stubGlobal('document', {
    visibilityState: 'visible',
    addEventListener: (type: string, fn: () => void) => (docListeners[type] = fn),
  })
  vi.stubGlobal('navigator', { audioSession: { type: 'auto' } })
  await openApp()
})

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('áudio do clicker no celular', () => {
  it('no primeiro toque cria o áudio no modo que toca mesmo no silencioso', () => {
    expect(audio.audioHealthy()).toBe(false)
    audio.ensureAudio()
    expect(FakeAudioContext.created).toHaveLength(1)
    expect(audio.audioHealthy()).toBe(true)
    expect(session()).toBe('playback')
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
    FakeAudioContext.created[0]!.frozen = true
    vi.advanceTimersByTime(2000)
    expect(audio.audioHealthy()).toBe(false)
    audio.ensureAudio()
    expect(FakeAudioContext.created).toHaveLength(2)
    expect(FakeAudioContext.created[0]!.closed).toBe(true)
    expect(audio.audioHealthy()).toBe(true)
  })

  it('depois de a tela bloquear (app no fundo), recria o áudio no próximo toque', () => {
    audio.ensureAudio()
    vi.advanceTimersByTime(2000)
    ;(document as unknown as { visibilityState: string }).visibilityState = 'hidden'
    docListeners.visibilitychange!()
    expect(audio.audioHealthy()).toBe(false)
    audio.ensureAudio()
    expect(FakeAudioContext.created).toHaveLength(2)
  })
})

describe('opção "tocar no silencioso" (iPhone)', () => {
  it('sem valor salvo, começa LIGADA (o clicker é ouvido no silencioso)', () => {
    expect(store.has('milo.playInSilentMode')).toBe(false)
    expect(audio.getPlayInSilentMode()).toBe(true)
    // Já ao abrir o app, a sessão fica no modo que toca no silencioso.
    expect(session()).toBe('playback')
  })

  it('quem desligou continua com ela desligada ao abrir o app de novo', async () => {
    audio.setPlayInSilentMode(false)
    expect(store.get('milo.playInSilentMode')).toBe('0')
    ;(navigator as unknown as { audioSession: { type: string } }).audioSession.type = 'auto'
    await openApp()
    expect(audio.getPlayInSilentMode()).toBe(false)
    expect(session()).toBe('ambient')
  })

  it('quem ligou continua com ela ligada', async () => {
    store.set('milo.playInSilentMode', '1')
    await openApp()
    expect(audio.getPlayInSilentMode()).toBe(true)
    expect(session()).toBe('playback')
  })

  it('trocar a opção marca o áudio como velho e ele é recriado no próximo toque, já com a sessão nova', () => {
    audio.ensureAudio()
    vi.advanceTimersByTime(2000)
    expect(audio.audioHealthy()).toBe(true)

    audio.setPlayInSilentMode(false)
    expect(session()).toBe('ambient')
    expect(audio.audioHealthy()).toBe(false) // stale
    audio.ensureAudio()
    expect(FakeAudioContext.created).toHaveLength(2)
    expect(FakeAudioContext.created[0]!.closed).toBe(true)
    expect(audio.audioHealthy()).toBe(true)
  })

  it('escolher a mesma opção de novo não recria o áudio à toa', () => {
    audio.ensureAudio()
    vi.advanceTimersByTime(2000)
    audio.setPlayInSilentMode(true) // já estava ligada
    audio.ensureAudio()
    expect(FakeAudioContext.created).toHaveLength(1)
  })

  it('avisa as telas quando a opção muda', () => {
    const fn = vi.fn()
    const off = audio.onPlayInSilentModeChange(fn)
    audio.setPlayInSilentMode(false)
    off()
    audio.setPlayInSilentMode(true)
    expect(fn).toHaveBeenCalledTimes(1)
  })
})

describe('interrupções do iOS (ligação, Siri, alarme)', () => {
  it("estado 'interrupted' conta como velho: recria no próximo toque", () => {
    audio.ensureAudio()
    vi.advanceTimersByTime(2000)
    FakeAudioContext.created[0]!.setState('interrupted')
    expect(audio.audioDiagnostics().stale).toBe(true)
    audio.ensureAudio()
    expect(FakeAudioContext.created).toHaveLength(2)
    expect(audio.audioHealthy()).toBe(true)
  })

  it("'interrupted' logo depois de criar o áudio também recria (não só pede para continuar)", () => {
    audio.ensureAudio()
    vi.advanceTimersByTime(200) // menos de 1 s
    FakeAudioContext.created[0]!.setState('interrupted')
    audio.ensureAudio()
    expect(FakeAudioContext.created).toHaveLength(2)
  })

  it("mesmo sem o evento, um áudio 'interrupted' não é considerado saudável", () => {
    audio.ensureAudio()
    vi.advanceTimersByTime(2000)
    FakeAudioContext.created[0]!.state = 'interrupted'
    expect(audio.audioHealthy()).toBe(false)
    audio.ensureAudio()
    expect(FakeAudioContext.created).toHaveLength(2)
  })
})

describe('diagnóstico', () => {
  it('mostra sessão, estado, saúde, stale, criação e último erro', () => {
    let d = audio.audioDiagnostics()
    expect(d).toMatchObject({ audioSession: 'playback', playInSilentMode: true, contextState: null, healthy: false, createdAt: null, lastError: null })
    audio.ensureAudio()
    d = audio.audioDiagnostics()
    expect(d.contextState).toBe('running')
    expect(d.healthy).toBe(true)
    expect(d.stale).toBe(false)
    expect(typeof d.createdAt).toBe('number')
  })

  it('guarda o último erro de áudio', async () => {
    vi.stubGlobal('window', {
      AudioContext: class {
        constructor() {
          throw new Error('não pode')
        }
      },
      addEventListener: () => {},
    })
    await openApp()
    audio.ensureAudio()
    expect(audio.audioDiagnostics().lastError).toMatchObject({ where: 'criar AudioContext', message: 'Error: não pode' })
  })
})
