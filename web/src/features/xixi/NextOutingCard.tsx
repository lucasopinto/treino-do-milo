import { Link } from 'react-router'
import { DoorOpen } from 'lucide-react'
import { useSettings } from '../../hooks/useData'
import { formatClock, formatDurationText, formatHM, daysBetween } from '../../domain/dates'
import { nextOuting } from '../../domain/schedule'

export function NextOutingCard({ now, linked = true }: { now: Date; linked?: boolean }) {
  const settings = useSettings()
  const next = nextOuting(settings.outingTimes, now)
  const content = !next ? (
    <span className="text-lg">Nenhum horário de saída configurado.</span>
  ) : (
    <>
      <span className="block text-sm font-semibold uppercase tracking-wide opacity-90">Próxima saída de xixi</span>
      <span className="mt-1 flex items-baseline justify-between gap-2">
        <span className="text-xl font-bold">
          {next.outing.label} · {formatHM(next.at)}
          {daysBetween(now, next.at) === 1 && <span className="font-normal"> (amanhã)</span>}
        </span>
      </span>
      <span className="mt-1 block text-4xl font-bold tabular" aria-live="off">
        {next.at.getTime() - now.getTime() < 3_600_000
          ? formatClock(next.at.getTime() - now.getTime())
          : `em ${formatDurationText(next.at.getTime() - now.getTime())}`}
      </span>
    </>
  )
  const cls = 'flex items-center gap-4 rounded-3xl bg-sky-800 p-4 text-white shadow-sm'
  const inner = (
    <>
      <DoorOpen aria-hidden size={40} className="shrink-0 opacity-90" />
      <span className="min-w-0 flex-1">{content}</span>
    </>
  )
  return linked ? (
    <Link to="/xixi" className={`${cls} active:bg-sky-900`} aria-label={next ? `Próxima saída: ${next.outing.label} às ${formatHM(next.at)}. Abrir xixi e cocô.` : 'Abrir xixi e cocô'}>
      {inner}
    </Link>
  ) : (
    <div className={cls}>{inner}</div>
  )
}
