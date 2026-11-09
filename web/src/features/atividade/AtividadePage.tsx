import { useState } from 'react'
import { Play, Square, Trash2, X } from 'lucide-react'
import { Button, Card, Empty, Field, PageHeader, ProgressRing, Segmented } from '../../components/ui'
import { useToast } from '../../components/Toast'
import { TrainerSelector } from '../../components/TrainerSelector'
import { useActivities, useSettings } from '../../hooks/useData'
import { useNow } from '../../hooks/useNow'
import { useTrainer, useTrainerName } from '../../hooks/useTrainer'
import { addActivity, restore, softDelete } from '../../db/repo'
import { dayKey, formatClock, formatHM, startOfDay } from '../../domain/dates'
import { feedbackOk } from '../../lib/feedback'
import { readLocalJson, writeLocalJson } from '../../lib/storage'
import { timeInputToEpoch } from '../xixi/EliminationSheet'
import type { ActivityKind } from '../../domain/types'

const KIND_OPTIONS: { value: ActivityKind; label: string }[] = [
  { value: 'passeio', label: 'Passeio' },
  { value: 'brincadeira', label: 'Brincadeira' },
]
const kindLabel = (k: ActivityKind) => (k === 'passeio' ? 'Passeio' : 'Brincadeira')

interface RunningTimer {
  kind: ActivityKind
  startedAt: number
}
const TIMER_KEY = 'milo.activityTimer'

export function AtividadePage() {
  const now = useNow(1000)
  const settings = useSettings()
  const { trainer } = useTrainer()
  const name = useTrainerName()
  const toast = useToast()
  const todayStart = startOfDay(now).getTime()
  const today = (useActivities(todayStart) ?? []).filter((a) => dayKey(a.startedAt) === dayKey(now))
  const total = Math.round(today.reduce((n, a) => n + a.durationMin, 0))
  const goal = settings.activityGoalMin

  // Cronômetro guardado no aparelho: continua contando se o app fechar.
  const [running, setRunning] = useState<RunningTimer | null>(() => readLocalJson<RunningTimer>(TIMER_KEY))
  const [kind, setKind] = useState<ActivityKind>(running?.kind ?? 'passeio')

  function start() {
    const t = { kind, startedAt: Date.now() }
    setRunning(t)
    writeLocalJson(TIMER_KEY, t)
    feedbackOk()
  }

  function clearTimer() {
    setRunning(null)
    writeLocalJson(TIMER_KEY, null)
  }

  async function stop() {
    if (!running) return
    const minutes = Math.max(1, Math.round((Date.now() - running.startedAt) / 60_000))
    await save(running.kind, minutes, running.startedAt, 'cronometro')
    clearTimer()
  }

  async function save(k: ActivityKind, minutes: number, startedAt: number, source: 'cronometro' | 'manual') {
    const rec = await addActivity({ kind: k, durationMin: minutes, startedAt, source, note: null, trainerId: trainer.id })
    feedbackOk()
    toast(
      k === 'brincadeira'
        ? `${minutes} min de brincadeira. Agora leve para fazer xixi!`
        : `${minutes} min de passeio registrados.`,
      { action: { label: 'Desfazer', onClick: () => void softDelete('activities', rec.id) } },
    )
  }

  return (
    <>
      <PageHeader title="Atividade física" subtitle={`Meta: ${goal} min por dia`} right={<TrainerSelector />} />
      <div className="flex flex-col gap-4">
        <Card className="flex items-center gap-4">
          <ProgressRing value={total / goal} size={140} label={`${total} de ${goal} minutos hoje`}>
            <span>
              <span className="block text-4xl font-bold tabular">{total}</span>
              <span className="block text-sm text-stone-600 dark:text-stone-400">de {goal} min</span>
            </span>
          </ProgressRing>
          <p className="text-lg">
            {total >= goal ? (
              <strong className="text-green-700 dark:text-green-400">Meta do dia batida!</strong>
            ) : (
              <>
                Faltam <strong className="tabular">{goal - total} min</strong> hoje.
              </>
            )}
          </p>
        </Card>

        <Card>
          <h2 className="mb-3 text-lg font-bold">Cronômetro</h2>
          {running ? (
            <div className="flex flex-col items-center gap-3">
              <p className="font-semibold">{kindLabel(running.kind)} desde {formatHM(running.startedAt)}</p>
              <p className="text-7xl font-bold tabular" role="timer">
                {formatClock(now.getTime() - running.startedAt)}
              </p>
              <div className="grid w-full grid-cols-[1fr_auto] gap-3">
                <Button tone="brand" size="lg" icon={<Square aria-hidden />} onClick={() => void stop()}>
                  Parar e salvar
                </Button>
                <Button
                  tone="neutral"
                  size="lg"
                  aria-label="Descartar cronômetro"
                  icon={<X aria-hidden />}
                  onClick={() => window.confirm('Descartar este cronômetro sem salvar?') && clearTimer()}
                />
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <Segmented label="Tipo de atividade" value={kind} onChange={setKind} options={KIND_OPTIONS} />
              <Button size="xl" icon={<Play aria-hidden size={32} />} onClick={start}>
                Começar {kindLabel(kind).toLowerCase()}
              </Button>
            </div>
          )}
        </Card>

        <ManualEntry onSave={save} />

        <Card>
          <h2 className="mb-2 text-lg font-bold">Hoje</h2>
          {today.length === 0 ? (
            <Empty>Nenhuma atividade registrada hoje.</Empty>
          ) : (
            <ul className="divide-y divide-stone-200 dark:divide-stone-800">
              {[...today].reverse().map((a) => (
                <li key={a.id} className="flex items-center gap-3 py-2">
                  <span className="w-14 shrink-0 font-bold tabular">{formatHM(a.startedAt)}</span>
                  <span className="flex-1">
                    <span className="block font-semibold">
                      {kindLabel(a.kind)} · {a.durationMin} min
                    </span>
                    <span className="block text-sm text-stone-600 dark:text-stone-400">
                      {a.source === 'cronometro' ? 'Cronômetro' : 'Manual'} · {name(a.trainerId)}
                    </span>
                  </span>
                  <button
                    type="button"
                    aria-label={`Apagar ${kindLabel(a.kind)} das ${formatHM(a.startedAt)}`}
                    onClick={() => {
                      void softDelete('activities', a.id)
                      toast('Atividade apagada.', { tone: 'info', action: { label: 'Desfazer', onClick: () => void restore('activities', a.id) } })
                    }}
                    className="grid size-12 shrink-0 place-items-center rounded-xl text-stone-600 active:bg-stone-200 dark:text-stone-300 dark:active:bg-stone-800"
                  >
                    <Trash2 aria-hidden size={20} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  )
}

const QUICK_MIN = [10, 15, 20, 30, 45, 60]

function ManualEntry({
  onSave,
}: {
  onSave: (k: ActivityKind, minutes: number, startedAt: number, source: 'manual') => Promise<void>
}) {
  const [kind, setKind] = useState<ActivityKind>('passeio')
  const [minutes, setMinutes] = useState(20)
  const [time, setTime] = useState<string | null>(null)

  return (
    <Card>
      <h2 className="mb-3 text-lg font-bold">Registrar sem cronômetro</h2>
      <div className="flex flex-col gap-3">
        <Segmented label="Tipo de atividade" value={kind} onChange={setKind} options={KIND_OPTIONS} />
        <div role="radiogroup" aria-label="Minutos" className="grid grid-cols-3 gap-2">
          {QUICK_MIN.map((m) => (
            <button
              key={m}
              type="button"
              role="radio"
              aria-checked={minutes === m}
              onClick={() => setMinutes(m)}
              className={`min-h-12 rounded-xl font-bold ring-1 ${
                minutes === m ? 'bg-brand-700 text-white ring-brand-700' : 'bg-white ring-stone-300 dark:bg-stone-800 dark:ring-stone-600'
              }`}
            >
              {m} min
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Minutos">
            <input type="number" inputMode="numeric" min={1} max={300} value={minutes} onChange={(e) => setMinutes(Number(e.target.value))} />
          </Field>
          <Field label="Começou às">
            <input type="time" value={time ?? formatHM(Date.now() - minutes * 60_000)} onChange={(e) => setTime(e.target.value)} />
          </Field>
        </div>
        <Button
          size="lg"
          disabled={!minutes || minutes < 1}
          onClick={() => {
            const startedAt = time ? timeInputToEpoch(time) : Date.now() - minutes * 60_000
            void onSave(kind, Math.round(minutes), startedAt, 'manual').then(() => setTime(null))
          }}
        >
          Salvar {minutes} min
        </Button>
      </div>
    </Card>
  )
}
