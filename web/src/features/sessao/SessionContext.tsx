import { createContext, useCallback, useContext, useEffect, useReducer, useRef, type ReactNode } from 'react'
import { initialTimer, timerEvents, timerReducer, type TimerAction, type TimerState } from '../../domain/timer'
import { playCue } from '../../lib/audio'
import { vibrate } from '../../lib/haptics'
import { readLocalJson, writeLocalJson } from '../../lib/storage'
import type { SkillId } from '../../domain/types'

/** Sessão em andamento: timer + qual comando e nível. */
export interface ActiveSession {
  timer: TimerState
  skillId: SkillId | null
  levelIndex: number
  plannedSec: number
}

type Action =
  | TimerAction
  | { type: 'setup'; skillId: SkillId; levelIndex: number; plannedSec: number; now: number }

const STORAGE_KEY = 'milo.activeSession'
const empty: ActiveSession = { timer: initialTimer, skillId: null, levelIndex: 0, plannedSec: 300 }

function reducer(s: ActiveSession, a: Action): ActiveSession {
  if (a.type === 'setup') {
    return {
      skillId: a.skillId,
      levelIndex: a.levelIndex,
      plannedSec: a.plannedSec,
      timer: timerReducer(initialTimer, { type: 'start', now: a.now, durationMs: a.plannedSec * 1000 }),
    }
  }
  if (a.type === 'reset') return empty
  const timer = timerReducer(s.timer, a)
  return timer === s.timer ? s : { ...s, timer }
}

interface Ctx {
  session: ActiveSession
  dispatch: (a: Action) => void
  isActive: boolean
}

const SessionCtx = createContext<Ctx | null>(null)

export function SessionProvider({ children }: { children: ReactNode }) {
  // Recupera a sessão se o app foi recarregado no meio dela.
  const [session, rawDispatch] = useReducer(reducer, undefined, () => readLocalJson<ActiveSession>(STORAGE_KEY) ?? empty)
  const prev = useRef(session.timer)

  const dispatch = useCallback((a: Action) => rawDispatch(a), [])

  // Relógio da sessão.
  useEffect(() => {
    if (session.timer.status !== 'running') return
    const id = window.setInterval(() => rawDispatch({ type: 'tick', now: Date.now() }), 250)
    const onVisible = () => rawDispatch({ type: 'tick', now: Date.now() })
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [session.timer.status])

  // Sons e vibração nos avisos; salva para sobreviver a um recarregamento.
  useEffect(() => {
    for (const ev of timerEvents(prev.current, session.timer)) {
      if (ev === 'warning') {
        playCue('aviso')
        vibrate([200, 100, 200])
      } else {
        playCue('fim')
        vibrate([500, 150, 500, 150, 700])
      }
    }
    prev.current = session.timer
    writeLocalJson(STORAGE_KEY, session.timer.status === 'idle' ? null : session)
  }, [session])

  const isActive = session.timer.status === 'running' || session.timer.status === 'paused'
  return <SessionCtx.Provider value={{ session, dispatch, isActive }}>{children}</SessionCtx.Provider>
}

export function useActiveSession(): Ctx {
  const ctx = useContext(SessionCtx)
  if (!ctx) throw new Error('useActiveSession fora do SessionProvider')
  return ctx
}
