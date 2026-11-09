import { lazy, Suspense, useState } from 'react'
import { BellOff, BellRing, CalendarClock } from 'lucide-react'
import { Button, Card, Empty, PageHeader } from '../../components/ui'
import { useEliminations } from '../../hooks/useData'
import { useNow } from '../../hooks/useNow'
import { addDays, dayKey, startOfDay } from '../../domain/dates'
import { sortOutings } from '../../domain/schedule'
import { accidentFreeStreak } from '../../domain/summary'
import { notificationPermission, requestNotificationPermission, type PermissionState } from '../../lib/notify'
import { isIOS, isStandalone } from '../../lib/pwa'
import { EliminationQuickGrid } from './EliminationSheet'
import { EliminationList } from './EliminationList'
import { NextOutingCard } from './NextOutingCard'
import { OutingScheduleEditor } from './OutingScheduleEditor'
import { timeZoneName, useProfileSchedule } from '../../sync/schedule'
import { useTrainer } from '../../hooks/useTrainer'
import { localTimeZone } from '../../domain/schedule'

const XixiCharts = lazy(() => import('./XixiCharts'))

export function XixiPage() {
  const { trainer } = useTrainer()
  const schedule = useProfileSchedule(trainer.id)
  const now = useNow(1000)
  const since = addDays(startOfDay(now), -35).getTime()
  const elims = useEliminations(since) ?? []
  const today = elims.filter((e) => dayKey(e.at) === dayKey(now))
  const streak = accidentFreeStreak(elims, now)
  const [editSchedule, setEditSchedule] = useState(false)

  return (
    <>
      <PageHeader
        title="Xixi e cocô"
        subtitle={streak > 0 ? `${streak} ${streak === 1 ? 'dia' : 'dias'} sem acidente` : 'Um dia de cada vez'}
      />
      <div className="flex flex-col gap-4">
        <EliminationQuickGrid />
        <NextOutingCard now={now} linked={false} />
        <NotificationBanner />

        <Card>
          <h2 className="mb-2 text-lg font-bold">Hoje</h2>
          {today.length === 0 ? <Empty>Nenhum registro hoje ainda.</Empty> : <EliminationList items={today} />}
        </Card>

        <Card>
          <div className="mb-2 flex items-center justify-between gap-2">
            <h2 className="text-lg font-bold">
              Agenda de saídas · {trainer.name}
              {schedule.timezone !== localTimeZone() && (
                <span className="block text-sm font-normal text-stone-600 dark:text-stone-400">Hora de {timeZoneName(schedule.timezone)}</span>
              )}
            </h2>
            <Button tone="neutral" icon={<CalendarClock aria-hidden size={20} />} onClick={() => setEditSchedule(true)}>
              Editar
            </Button>
          </div>
          <ul className="grid grid-cols-2 gap-2">
            {sortOutings(schedule.outingTimes).map((o) => (
              <li key={o.id} className="rounded-xl bg-stone-100 px-3 py-2 dark:bg-stone-800">
                <span className="block text-lg font-bold tabular">{o.time}</span>
                <span className="block text-sm text-stone-600 dark:text-stone-400">{o.label}</span>
              </li>
            ))}
          </ul>
        </Card>

        <Suspense fallback={<p className="p-6 text-center text-stone-500">Carregando gráficos…</p>}>
          <XixiCharts eliminations={elims} now={now} />
        </Suspense>
      </div>
      <OutingScheduleEditor open={editSchedule} onClose={() => setEditSchedule(false)} />
    </>
  )
}

export function NotificationBanner() {
  const [perm, setPerm] = useState<PermissionState>(notificationPermission)
  if (perm === 'granted') return null
  if (perm === 'unsupported') {
    if (isIOS() && !isStandalone()) {
      return (
        <p className="rounded-2xl bg-stone-200 p-4 text-sm dark:bg-stone-800">
          No iPhone, os avisos só funcionam com o app instalado: toque em Compartilhar e depois em “Adicionar à Tela de Início”.
        </p>
      )
    }
    return null
  }
  if (perm === 'denied') {
    return (
      <p className="flex gap-3 rounded-2xl bg-stone-200 p-4 text-sm dark:bg-stone-800">
        <BellOff aria-hidden className="shrink-0" />
        Os avisos do sistema estão bloqueados. O app ainda avisa com som e alerta na tela quando estiver aberto.
      </p>
    )
  }
  return (
    <Button tone="sky" size="lg" icon={<BellRing aria-hidden />} onClick={() => void requestNotificationPermission().then(setPerm)}>
      Ativar avisos de saída
    </Button>
  )
}
