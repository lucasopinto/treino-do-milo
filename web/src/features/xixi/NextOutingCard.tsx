import { Link } from 'react-router'
import { DoorOpen } from 'lucide-react'
import { timeZoneName, useProfileSchedule } from '../../sync/schedule'
import { useTrainer } from '../../hooks/useTrainer'
import { formatClock, formatDurationText } from '../../domain/dates'
import { localTimeZone, nextOuting } from '../../domain/schedule'

export function NextOutingCard({ now, linked = true }: { now: Date; linked?: boolean }) {
  const { trainer, trainers } = useTrainer()
  // Perfil sem fuso escolhido (ex.: o celular do pai ainda não respondeu "de quem é"): usa o daqui.
  const noTimezone = !trainer.timezone && trainers.length > 1
  const { outingTimes, timezone } = useProfileSchedule(trainer.id)
  const next = nextOuting(outingTimes, now, timezone)
  // Agenda noutro fuso (ex.: perfil do pai, em Portugal, visto do Brasil): mostra o horário de lá.
  const elsewhere = timezone !== localTimeZone()
  const content = !next ? (
    <span className="text-lg">Nenhum horário de saída configurado.</span>
  ) : (
    <>
      <span className="block text-sm font-semibold uppercase tracking-wide opacity-90">Próxima saída de xixi</span>
      <span className="mt-1 flex items-baseline justify-between gap-2">
        <span className="text-xl font-bold">
          {next.outing.label} · {next.outing.time}
          {next.tomorrow && <span className="font-normal"> (amanhã)</span>}
        </span>
      </span>
      {noTimezone && (
        <span className="mt-1 block rounded-lg bg-white/15 px-2 py-1 text-sm">
          Fuso de {trainer.name} não escolhido: usando o horário daqui. Escolha em Xixi → Agenda → Editar.
        </span>
      )}
      {elsewhere && (
        <span className="block text-sm opacity-90">
          Agenda de {trainer.name} · hora de {timeZoneName(timezone)}
        </span>
      )}
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
    <Link to="/xixi" className={`${cls} active:bg-sky-900`} aria-label={next ? `Próxima saída: ${next.outing.label} às ${next.outing.time}. Abrir xixi e cocô.` : 'Abrir xixi e cocô'}>
      {inner}
    </Link>
  ) : (
    <div className={cls}>{inner}</div>
  )
}
