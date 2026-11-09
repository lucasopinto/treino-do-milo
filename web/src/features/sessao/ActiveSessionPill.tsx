import { Link, useLocation } from 'react-router'
import { Timer } from 'lucide-react'
import { useActiveSession } from './SessionContext'
import { useNow } from '../../hooks/useNow'
import { remainingMs } from '../../domain/timer'
import { formatClock } from '../../domain/dates'
import { getSkill } from '../../content/skills'

/** Atalho flutuante para voltar à sessão quando o usuário navega para outra tela. */
export function ActiveSessionPill() {
  const { session } = useActiveSession()
  const { pathname } = useLocation()
  const now = useNow(1000)
  const st = session.timer.status
  if (st === 'idle' || pathname === '/treino' || !session.skillId) return null
  const label =
    st === 'finished' ? 'Sessão terminada: salvar' : `${getSkill(session.skillId).name} · ${formatClock(remainingMs(session.timer, now.getTime()))}`
  return (
    <Link
      to="/treino"
      className="fixed inset-x-4 bottom-20 z-40 mx-auto flex min-h-12 max-w-md items-center justify-center gap-2 rounded-full bg-brand-700 px-4 font-bold text-white shadow-lg animate-fade-up pb-safe"
    >
      <Timer aria-hidden size={20} />
      <span className="tabular">{label}</span>
      {st === 'paused' && <span className="font-normal">(pausada)</span>}
    </Link>
  )
}
