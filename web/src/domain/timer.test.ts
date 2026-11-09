import { describe, expect, it } from 'vitest'
import {
  elapsedMs,
  hitRate,
  initialTimer,
  remainingMs,
  showEasierHint,
  timerEvents,
  timerReducer as r,
  type TimerState,
} from './timer'

const MIN = 60_000
const start = (durationMs = 5 * MIN, now = 0) => r(initialTimer, { type: 'start', now, durationMs })

describe('timer', () => {
  it('conta o tempo pelo relógio, não por ticks', () => {
    const s = start()
    expect(remainingMs(s, 60_000)).toBe(4 * MIN)
  })

  it('pausa e retoma sem perder tempo', () => {
    let s = start()
    s = r(s, { type: 'pause', now: 60_000 })
    expect(remainingMs(s, 500_000)).toBe(4 * MIN) // parado
    s = r(s, { type: 'resume', now: 120_000 })
    expect(remainingMs(s, 180_000)).toBe(3 * MIN)
    expect(elapsedMs(s, 180_000)).toBe(2 * MIN) // 1 min antes + 1 min depois da pausa
  })

  it('avisa uma vez aos 30 s do fim e depois termina', () => {
    let s = start(MIN)
    let prev = s
    s = r(s, { type: 'tick', now: 29_000 })
    expect(timerEvents(prev, s)).toEqual([])
    prev = s
    s = r(s, { type: 'tick', now: 31_000 })
    expect(timerEvents(prev, s)).toEqual(['warning'])
    prev = s
    s = r(s, { type: 'tick', now: 40_000 })
    expect(timerEvents(prev, s)).toEqual([])
    prev = s
    s = r(s, { type: 'tick', now: 61_000 })
    expect(s.status).toBe('finished')
    expect(timerEvents(prev, s)).toEqual(['end'])
    expect(elapsedMs(s, 999_999)).toBe(MIN)
  })

  it('se o celular "dormiu" e passou do fim, só dispara o fim', () => {
    const s0 = start(MIN)
    const s1 = r(s0, { type: 'tick', now: 5 * MIN })
    expect(timerEvents(s0, s1)).toEqual(['end'])
  })

  it('encerrar antes do tempo não toca o som de fim', () => {
    const s0 = start()
    const s1 = r(s0, { type: 'finish', now: 2 * MIN })
    expect(s1.status).toBe('finished')
    expect(s1.endedEarly).toBe(true)
    expect(timerEvents(s0, s1)).toEqual([])
    expect(elapsedMs(s1, 10 * MIN)).toBe(2 * MIN)
  })

  it('encerrar enquanto pausado desconta a pausa', () => {
    let s = start()
    s = r(s, { type: 'pause', now: MIN })
    s = r(s, { type: 'finish', now: 3 * MIN })
    expect(elapsedMs(s, 10 * MIN)).toBe(MIN)
  })

  it('placar e taxa de acerto', () => {
    let s: TimerState = start()
    expect(hitRate(s)).toBeNull()
    s = r(s, { type: 'hit' })
    s = r(s, { type: 'hit' })
    s = r(s, { type: 'click' })
    s = r(s, { type: 'miss' })
    expect(s.hits).toBe(3)
    expect(s.clicks).toBe(1)
    expect(hitRate(s)).toBe(0.75)
  })

  it('mostra a dica após 3 erros seguidos e some com um acerto', () => {
    let s = start()
    s = r(s, { type: 'miss' })
    s = r(s, { type: 'miss' })
    expect(showEasierHint(s)).toBe(false)
    s = r(s, { type: 'miss' })
    expect(showEasierHint(s)).toBe(true)
    s = r(s, { type: 'hit' })
    expect(showEasierHint(s)).toBe(false)
  })

  it('ainda aceita o acerto final depois que o tempo acabou', () => {
    let s = r(start(MIN), { type: 'tick', now: 2 * MIN })
    s = r(s, { type: 'hit' })
    expect(s.hits).toBe(1)
  })

  it('desfazer não deixa negativo', () => {
    let s = start()
    s = r(s, { type: 'undo', kind: 'miss' })
    expect(s.misses).toBe(0)
  })

  it('não conta nada antes de começar', () => {
    expect(r(initialTimer, { type: 'hit' }).hits).toBe(0)
  })
})
