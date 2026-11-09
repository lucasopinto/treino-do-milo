// Máquina de estados do timer de sessão. Pura: recebe `now` em cada ação,
// então funciona igual em testes e não "atrasa" quando o celular desacelera a aba.

export const WARNING_MS = 30_000
export const ERROR_STREAK_HINT = 3

export type TimerStatus = 'idle' | 'running' | 'paused' | 'finished'

export interface TimerState {
  status: TimerStatus
  durationMs: number
  startedAt: number | null
  /** Quando roda: horário em que acaba. */
  endAt: number | null
  /** Quando pausado/encerrado: quanto faltava. */
  remainingMs: number
  /** Tempo pausado acumulado (para calcular a duração real). */
  pausedTotalMs: number
  pausedAt: number | null
  finishedAt: number | null
  warned: boolean
  hits: number
  misses: number
  clicks: number
  errorStreak: number
  /** Encerrado antes do tempo pelo usuário. */
  endedEarly: boolean
}

export type TimerAction =
  | { type: 'start'; now: number; durationMs: number }
  | { type: 'pause'; now: number }
  | { type: 'resume'; now: number }
  | { type: 'tick'; now: number }
  | { type: 'finish'; now: number }
  | { type: 'hit' }
  | { type: 'miss' }
  | { type: 'click' }
  | { type: 'undo'; kind: 'hit' | 'miss' }
  | { type: 'reset' }

export const initialTimer: TimerState = {
  status: 'idle',
  durationMs: 0,
  startedAt: null,
  endAt: null,
  remainingMs: 0,
  pausedTotalMs: 0,
  pausedAt: null,
  finishedAt: null,
  warned: false,
  hits: 0,
  misses: 0,
  clicks: 0,
  errorStreak: 0,
  endedEarly: false,
}

export function remainingMs(s: TimerState, now: number): number {
  if (s.status === 'running' && s.endAt !== null) return Math.max(0, s.endAt - now)
  return s.remainingMs
}

/** Duração real treinada (sem as pausas), em ms. */
export function elapsedMs(s: TimerState, now: number): number {
  if (s.startedAt === null) return 0
  const end = s.finishedAt ?? (s.status === 'paused' && s.pausedAt !== null ? s.pausedAt : now)
  return Math.max(0, end - s.startedAt - s.pausedTotalMs)
}

export function hitRate(s: Pick<TimerState, 'hits' | 'misses'>): number | null {
  const total = s.hits + s.misses
  return total === 0 ? null : s.hits / total
}

export function showEasierHint(s: TimerState): boolean {
  return s.errorStreak >= ERROR_STREAK_HINT
}

export function timerReducer(s: TimerState, a: TimerAction): TimerState {
  switch (a.type) {
    case 'start':
      return {
        ...initialTimer,
        status: 'running',
        durationMs: a.durationMs,
        startedAt: a.now,
        endAt: a.now + a.durationMs,
        remainingMs: a.durationMs,
        warned: a.durationMs <= WARNING_MS, // sessões curtíssimas não avisam
      }
    case 'pause':
      if (s.status !== 'running') return s
      return { ...s, status: 'paused', remainingMs: remainingMs(s, a.now), endAt: null, pausedAt: a.now }
    case 'resume':
      if (s.status !== 'paused') return s
      return {
        ...s,
        status: 'running',
        endAt: a.now + s.remainingMs,
        pausedTotalMs: s.pausedTotalMs + (s.pausedAt !== null ? a.now - s.pausedAt : 0),
        pausedAt: null,
      }
    case 'tick': {
      if (s.status !== 'running') return s
      const left = remainingMs(s, a.now)
      if (left <= 0) {
        return { ...s, status: 'finished', remainingMs: 0, endAt: null, finishedAt: s.endAt ?? a.now, warned: true }
      }
      if (!s.warned && left <= WARNING_MS) return { ...s, warned: true, remainingMs: left }
      return s
    }
    case 'finish': {
      if (s.status === 'idle' || s.status === 'finished') return s
      const pausedExtra = s.status === 'paused' && s.pausedAt !== null ? a.now - s.pausedAt : 0
      return {
        ...s,
        status: 'finished',
        remainingMs: remainingMs(s, a.now),
        endAt: null,
        pausedTotalMs: s.pausedTotalMs + pausedExtra,
        pausedAt: null,
        finishedAt: a.now,
        endedEarly: true,
      }
    }
    case 'hit':
      if (s.status === 'idle') return s
      return { ...s, hits: s.hits + 1, errorStreak: 0 }
    case 'click':
      // Cada clique do clicker conta como acerto.
      if (s.status === 'idle') return s
      return { ...s, hits: s.hits + 1, clicks: s.clicks + 1, errorStreak: 0 }
    case 'miss':
      if (s.status === 'idle') return s
      return { ...s, misses: s.misses + 1, errorStreak: s.errorStreak + 1 }
    case 'undo':
      if (a.kind === 'hit' && s.hits > 0) return { ...s, hits: s.hits - 1 }
      if (a.kind === 'miss' && s.misses > 0)
        return { ...s, misses: s.misses - 1, errorStreak: Math.max(0, s.errorStreak - 1) }
      return s
    case 'reset':
      return initialTimer
  }
}

/** Eventos para tocar som/vibrar, comparando o estado antes e depois. */
export function timerEvents(prev: TimerState, next: TimerState): ('warning' | 'end')[] {
  const ev: ('warning' | 'end')[] = []
  if (!prev.warned && next.warned && next.status === 'running') ev.push('warning')
  if (prev.status === 'running' && next.status === 'finished' && !next.endedEarly) ev.push('end')
  return ev
}
