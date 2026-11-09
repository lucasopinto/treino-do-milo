import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { ChevronRight, Droplet, Footprints, MousePointerClick, Play, type LucideIcon } from 'lucide-react'
import { Card, ProgressRing } from '../../components/ui'
import { DogAvatar } from '../../components/DogAvatar'
import { TrainerSelector } from '../../components/TrainerSelector'
import { useActivities, useChecklistDays, useEliminations, useSessions, useSettings } from '../../hooks/useData'
import { useNow } from '../../hooks/useNow'
import { addDays, dayKey, formatLongDate, startOfDay } from '../../domain/dates'
import { accidentFreeStreak, daySummary } from '../../domain/summary'
import { checkedCount } from '../../domain/checklist'
import { EliminationSheet } from '../xixi/EliminationSheet'
import { NextOutingCard } from '../xixi/NextOutingCard'

export function PainelPage() {
  const now = useNow(1000)
  const settings = useSettings()
  const navigate = useNavigate()
  const todayStart = startOfDay(now).getTime()
  const sessions = useSessions(todayStart) ?? []
  const activities = useActivities(todayStart) ?? []
  // Para a sequência sem acidentes precisamos de mais histórico.
  const elims = useEliminations(addDays(todayStart, -120).getTime()) ?? []
  const checklist = useChecklistDays()?.find((d) => d.id === dayKey(now))
  const summary = daySummary(now, { sessions, eliminations: elims, activities })
  const streak = accidentFreeStreak(elims, now)
  const [xixiOpen, setXixiOpen] = useState(false)

  const hh = String(now.getHours()).padStart(2, '0')
  const mm = String(now.getMinutes()).padStart(2, '0')
  const ss = String(now.getSeconds()).padStart(2, '0')

  return (
    <div className="flex flex-col gap-4 pt-4">
      <header className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <DogAvatar size={48} />
          <h1 className="truncate text-2xl font-bold">{settings.dogName}</h1>
        </div>
        <TrainerSelector />
      </header>

      <section aria-label="Relógio" className="text-center">
        <p className="text-7xl font-bold leading-none tracking-tight tabular" aria-label={`${hh}:${mm}`}>
          {hh}:{mm}
          <span className="text-3xl text-stone-500 dark:text-stone-400">:{ss}</span>
        </p>
        <p className="mt-2 text-lg text-stone-700 dark:text-stone-300">{formatLongDate(now)}</p>
      </section>

      <NextOutingCard now={now} />

      <div className="grid grid-cols-2 gap-3">
        <QuickAction icon={Play} label="Iniciar sessão" tone="bg-brand-700 active:bg-brand-800" onClick={() => navigate('/treino')} />
        <QuickAction icon={Droplet} label="Registrar xixi" tone="bg-green-700 active:bg-green-800" onClick={() => setXixiOpen(true)} />
        <QuickAction icon={Footprints} label="Registrar passeio" tone="bg-sky-700 active:bg-sky-800" onClick={() => navigate('/atividade')} />
        <QuickAction icon={MousePointerClick} label="Clicker" tone="bg-stone-800 active:bg-stone-900 dark:bg-stone-700" onClick={() => navigate('/clicker')} />
      </div>

      <Card>
        <h2 className="mb-3 text-lg font-bold">Resumo de hoje</h2>
        <div className="flex items-center gap-4">
          <Link to="/atividade" aria-label={`Atividade: ${summary.activityMin} de ${settings.activityGoalMin} minutos`}>
            <ProgressRing value={summary.activityMin / settings.activityGoalMin} size={104} stroke={11} label="">
              <span>
                <span className="block text-2xl font-bold tabular">{summary.activityMin}</span>
                <span className="block text-xs text-stone-600 dark:text-stone-400">de {settings.activityGoalMin} min</span>
              </span>
            </ProgressRing>
          </Link>
          <dl className="grid flex-1 grid-cols-2 gap-x-3 gap-y-3">
            <Stat label="Sessões" value={summary.sessions} />
            <Stat label="Sem acidente" value={`${streak} ${streak === 1 ? 'dia' : 'dias'}`} />
            <Stat label="Lá fora" value={summary.peeOutside + summary.pooOutside} good />
            <Stat label="Dentro" value={summary.accidents} bad={summary.accidents > 0} />
          </dl>
        </div>
      </Card>

      <Link
        to="/checklist"
        className="flex min-h-16 items-center gap-3 rounded-3xl bg-white px-4 shadow-sm ring-1 ring-stone-200 active:bg-stone-100 dark:bg-stone-900 dark:ring-stone-800 dark:active:bg-stone-800"
      >
        <span className="flex-1">
          <span className="block font-bold">Nada é de graça</span>
          <span className="block text-sm text-stone-600 dark:text-stone-400">Comando antes de comida, passeio, brincadeira e carinho</span>
        </span>
        <span className="text-xl font-bold tabular">{checkedCount(checklist)}/4</span>
        <ChevronRight aria-hidden />
      </Link>

      <EliminationSheet open={xixiOpen} onClose={() => setXixiOpen(false)} />
    </div>
  )
}

function QuickAction({ icon: Icon, label, tone, onClick }: { icon: LucideIcon; label: string; tone: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-h-28 flex-col items-center justify-center gap-2 rounded-3xl text-lg font-bold text-white shadow-sm transition active:animate-pop ${tone}`}
    >
      <Icon aria-hidden size={36} />
      {label}
    </button>
  )
}

function Stat({ label, value, good, bad }: { label: string; value: string | number; good?: boolean; bad?: boolean }) {
  return (
    <div>
      <dt className="text-sm text-stone-600 dark:text-stone-400">{label}</dt>
      <dd className={`text-2xl font-bold tabular ${good ? 'text-green-700 dark:text-green-400' : ''} ${bad ? 'text-red-700 dark:text-red-400' : ''}`}>
        {value}
      </dd>
    </div>
  )
}
