import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { Check, Lock, Pause, Play, Plus, Square, Undo2, X, Lightbulb, Star } from 'lucide-react'
import { Button, Card, PageHeader, Segmented } from '../../components/ui'
import { useToast } from '../../components/Toast'
import { TrainerSelector } from '../../components/TrainerSelector'
import { useActiveSession } from './SessionContext'
import { ClickerButton } from '../clicker/ClickerButton'
import { useSkillsOverview } from '../../hooks/useSkills'
import { useTrainer } from '../../hooks/useTrainer'
import { useNow } from '../../hooks/useNow'
import { useWakeLock } from '../../hooks/useWakeLock'
import { addSession } from '../../db/repo'
import { getSkill, LEVEL_STAGES, METHOD_BASICS, SKILLS } from '../../content/skills'
import { elapsedMs, hitRate, remainingMs, showEasierHint, WARNING_MS } from '../../domain/timer'
import { formatClock } from '../../domain/dates'
import { feedbackOk, feedbackSoft } from '../../lib/feedback'
import { playCue } from '../../lib/audio'
import { vibrate } from '../../lib/haptics'
import type { SkillId } from '../../domain/types'

export function TreinoPage() {
  const { session } = useActiveSession()
  if (session.timer.status === 'idle' || !session.skillId) return <SessionSetup />
  if (session.timer.status === 'finished') return <SessionFinished />
  return <SessionRunning />
}

// ---------------------------------------------------------------------------
// Escolha do comando e da duração

const DURATIONS = [
  { value: 5, label: '5 min' },
  { value: 7, label: '7 min' },
  { value: 10, label: '10 min' },
  { value: 0, label: 'Outro' },
]

function SessionSetup() {
  const { dispatch } = useActiveSession()
  const overview = useSkillsOverview()
  const [params] = useSearchParams()
  const [skillId, setSkillId] = useState<SkillId>((params.get('comando') as SkillId) || 'senta')
  const [minutes, setMinutes] = useState(5)
  const [custom, setCustom] = useState(8)
  const plannedMin = minutes === 0 ? Math.max(1, Math.min(30, custom)) : minutes
  const st = overview.status[skillId]
  const skill = getSkill(skillId)

  function start() {
    dispatch({ type: 'setup', skillId, levelIndex: st.levelIndex, plannedSec: plannedMin * 60, now: Date.now() })
    feedbackOk()
  }

  return (
    <>
      <PageHeader title="Treino" subtitle="Escolha o que treinar e o tempo." right={<TrainerSelector />} />
      <div className="flex flex-col gap-5">
        <SkillPicker value={skillId} onChange={setSkillId} />

        <section aria-label="Duração">
          <h2 className="mb-2 text-lg font-bold">Duração</h2>
          <Segmented label="Duração da sessão" value={minutes} onChange={setMinutes} options={DURATIONS} />
          {minutes === 0 && (
            <label className="mt-3 flex items-center gap-3">
              <span className="font-semibold">Minutos:</span>
              <input
                type="number"
                inputMode="numeric"
                min={1}
                max={30}
                value={custom}
                onChange={(e) => setCustom(Number(e.target.value))}
                className="w-24"
              />
            </label>
          )}
        </section>

        <Card className="!bg-brand-50 !ring-brand-200 dark:!bg-brand-900/30 dark:!ring-brand-900">
          <p className="font-bold">
            {skill.name} · Nível {st.levelIndex + 1}: {skill.levels[st.levelIndex]?.name}
          </p>
          <p className="mt-1 text-stone-700 dark:text-stone-300">{skill.levels[st.levelIndex]?.success}</p>
        </Card>

        <Button size="xl" icon={<Play aria-hidden size={32} />} onClick={start}>
          Começar {plannedMin} min
        </Button>

        <details className="rounded-2xl bg-white p-4 ring-1 ring-stone-200 dark:bg-stone-900 dark:ring-stone-800">
          <summary className="min-h-12 cursor-pointer content-center text-lg font-bold">Lembrete do método</summary>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {METHOD_BASICS.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </details>
      </div>
    </>
  )
}

function SkillPicker({ value, onChange }: { value: SkillId; onChange: (id: SkillId) => void }) {
  const { status, tricks } = useSkillsOverview()
  const group = (kind: 'comando' | 'truque') => SKILLS.filter((s) => s.kind === kind)

  return (
    <div className="flex flex-col gap-4">
      {(['comando', 'truque'] as const).map((kind) => (
        <section key={kind} aria-label={kind === 'comando' ? 'Comandos' : 'Truques'}>
          <h2 className="mb-2 text-lg font-bold">{kind === 'comando' ? 'Comandos' : 'Truques'}</h2>
          <div role="radiogroup" className="grid grid-cols-2 gap-2">
            {group(kind).map((s) => {
              const st = status[s.id]
              const trick = tricks[s.id]
              const selected = value === s.id
              const locked = trick === 'bloqueado'
              return (
                <button
                  key={s.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => {
                    onChange(s.id)
                    feedbackSoft()
                  }}
                  className={`flex min-h-16 flex-col items-start justify-center rounded-2xl px-3 py-2 text-left ring-2 transition ${
                    selected
                      ? 'bg-brand-700 text-white ring-brand-700'
                      : 'bg-white ring-stone-200 dark:bg-stone-900 dark:ring-stone-800'
                  } ${locked && !selected ? 'opacity-60' : ''}`}
                >
                  <span className="flex items-center gap-1 font-bold leading-tight">
                    {locked && <Lock aria-label="ainda não sugerido" size={14} />}
                    {trick === 'sugerido' || trick === 'treinando' ? <Star aria-label="sugerido agora" size={14} /> : null}
                    {s.name}
                  </span>
                  <span className={`text-sm ${selected ? 'text-brand-100' : 'text-stone-600 dark:text-stone-400'}`}>
                    {st.firm ? 'Firme ✓' : `Nível ${st.levelIndex + 1} · ${LEVEL_STAGES[st.levelIndex]}`}
                  </span>
                </button>
              )
            })}
          </div>
          {kind === 'truque' && (
            <p className="mt-2 text-sm text-stone-600 dark:text-stone-400">
              <Star aria-hidden size={14} className="inline" /> Truque da vez. <Lock aria-hidden size={14} className="inline" /> Espera o anterior ficar firme.
            </p>
          )}
        </section>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Sessão em andamento

function SessionRunning() {
  const { session, dispatch } = useActiveSession()
  const now = useNow(250)
  const { timer } = session
  const skill = getSkill(session.skillId!)
  const left = remainingMs(timer, now.getTime())
  const rate = hitRate(timer)
  const hint = showEasierHint(timer)
  const paused = timer.status === 'paused'
  const lastSeconds = left <= WARNING_MS
  const { supported: wlSupported, locked } = useWakeLock(true)
  const [lastAction, setLastAction] = useState<'hit' | 'miss' | null>(null)

  function hit() {
    dispatch({ type: 'hit' })
    setLastAction('hit')
    playCue('ok')
    vibrate(30)
  }
  function miss() {
    dispatch({ type: 'miss' })
    setLastAction('miss')
    vibrate([20, 40, 20])
  }

  return (
    <div className="flex flex-col gap-4 pt-4">
      <header className="flex items-start justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold">{skill.name}</h1>
          <p className="text-stone-600 dark:text-stone-400">
            Nível {session.levelIndex + 1}: {skill.levels[session.levelIndex]?.name}
          </p>
        </div>
        {wlSupported && (
          <span className="rounded-full bg-stone-200 px-3 py-1 text-xs font-semibold dark:bg-stone-800" title="Tela acesa">
            {locked ? 'Tela acesa' : 'Tela pode apagar'}
          </span>
        )}
      </header>

      <div
        role="timer"
        aria-live="off"
        className={`rounded-3xl py-4 text-center transition ${lastSeconds ? 'bg-amber-200 text-amber-950 dark:bg-amber-900 dark:text-amber-50' : 'bg-white dark:bg-stone-900'}`}
      >
        <p className={`text-8xl font-bold leading-none tabular ${paused ? 'animate-pulse opacity-60' : ''}`}>
          {formatClock(left)}
        </p>
        <p className="mt-2 font-semibold">
          {paused ? 'Pausado' : lastSeconds ? 'Últimos 30 segundos: prepare um acerto fácil' : 'Restante'}
        </p>
      </div>

      <dl className="grid grid-cols-3 gap-2 text-center" aria-live="polite">
        <Score label="Acertos" value={timer.hits} className="text-green-700 dark:text-green-400" />
        <Score label="Erros" value={timer.misses} className="text-red-700 dark:text-red-400" />
        <Score label="Taxa" value={rate === null ? '–' : `${Math.round(rate * 100)}%`} />
      </dl>

      {/* Espaço fixo: a dica aparece sem empurrar os botões (evita toque errado). */}
      <p
        role={hint ? 'alert' : undefined}
        className={`flex min-h-16 items-center gap-3 rounded-2xl px-4 text-lg font-bold ${
          hint
            ? 'bg-amber-200 text-amber-950 dark:bg-amber-900 dark:text-amber-50'
            : 'bg-stone-200/60 text-base font-medium text-stone-600 dark:bg-stone-800/60 dark:text-stone-400'
        }`}
      >
        <Lightbulb aria-hidden className="shrink-0" />
        {hint ? 'Facilite e volte um passo.' : 'Diga "isso!" no instante do acerto, depois o petisco.'}
      </p>

      <div className="grid grid-cols-2 gap-3">
        <Button tone="green" size="xl" icon={<Check aria-hidden size={32} />} onClick={hit}>
          Acerto
        </Button>
        <Button tone="red" size="xl" icon={<X aria-hidden size={32} />} onClick={miss}>
          Erro
        </Button>
      </div>

      <ClickerButton size="compact" label="Clicker" hint="cada clique conta como acerto" onClick={() => dispatch({ type: 'click' })} />

      <div className="grid grid-cols-3 gap-2">
        <Button
          tone="neutral"
          disabled={!lastAction}
          icon={<Undo2 aria-hidden size={20} />}
          onClick={() => {
            if (lastAction) dispatch({ type: 'undo', kind: lastAction })
            setLastAction(null)
          }}
        >
          Desfazer
        </Button>
        {paused ? (
          <Button tone="neutral" icon={<Play aria-hidden size={20} />} onClick={() => dispatch({ type: 'resume', now: Date.now() })}>
            Retomar
          </Button>
        ) : (
          <Button tone="neutral" icon={<Pause aria-hidden size={20} />} onClick={() => dispatch({ type: 'pause', now: Date.now() })}>
            Pausar
          </Button>
        )}
        <Button tone="neutral" icon={<Square aria-hidden size={18} />} onClick={() => dispatch({ type: 'finish', now: Date.now() })}>
          Encerrar
        </Button>
      </div>
    </div>
  )
}

function Score({ label, value, className = '' }: { label: string; value: string | number; className?: string }) {
  return (
    <div className="rounded-2xl bg-white py-2 dark:bg-stone-900">
      <dt className="text-sm text-stone-600 dark:text-stone-400">{label}</dt>
      <dd className={`text-4xl font-bold tabular ${className}`}>{value}</dd>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Fim da sessão

function SessionFinished() {
  const { session, dispatch } = useActiveSession()
  const { trainer } = useTrainer()
  const toast = useToast()
  const navigate = useNavigate()
  const { timer } = session
  const skill = getSkill(session.skillId!)
  const rate = hitRate(timer)
  const [saving, setSaving] = useState(false)
  const actualSec = Math.round(elapsedMs(timer, Date.now()) / 1000)
  useWakeLock(true)

  // Lembrete sonoro ao abrir a tela de fim (se o tempo acabou, o som de fim já tocou).
  useEffect(() => {
    if (timer.endedEarly) vibrate(80)
  }, [timer.endedEarly])

  async function save() {
    setSaving(true)
    await addSession({
      skillId: session.skillId!,
      levelIndex: session.levelIndex,
      trainerId: trainer.id,
      startedAt: timer.startedAt ?? Date.now(),
      endedAt: timer.finishedAt ?? Date.now(),
      plannedSec: session.plannedSec,
      actualSec,
      hits: timer.hits,
      misses: timer.misses,
      clicks: timer.clicks,
    })
    feedbackOk()
    toast(`Sessão salva: ${timer.hits} acertos, ${timer.misses} erros.`)
    dispatch({ type: 'reset' })
    navigate(`/progresso/${session.skillId}`)
  }

  return (
    <div className="flex flex-col gap-4 pt-4">
      <h1 className="text-2xl font-bold">Fim da sessão</h1>

      <p className="rounded-3xl bg-green-700 p-5 text-xl font-bold text-white">
        Termine com um acerto: peça um comando que ele já sabe.
      </p>

      <Button tone="green" size="lg" icon={<Plus aria-hidden />} onClick={() => { dispatch({ type: 'hit' }); playCue('ok'); vibrate(30) }}>
        Marcar acerto final
      </Button>

      <Card>
        <p className="text-lg font-bold">{skill.name}</p>
        <p className="text-stone-600 dark:text-stone-400">
          Nível {session.levelIndex + 1} · {formatClock(actualSec * 1000)} de treino · por {trainer.name}
        </p>
        <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
          <Score label="Acertos" value={timer.hits} className="text-green-700 dark:text-green-400" />
          <Score label="Erros" value={timer.misses} className="text-red-700 dark:text-red-400" />
          <Score label="Taxa" value={rate === null ? '–' : `${Math.round(rate * 100)}%`} />
        </dl>
        {timer.hits + timer.misses < 5 && (
          <p className="mt-3 text-sm text-stone-600 dark:text-stone-400">
            Com menos de 5 tentativas, a sessão fica no histórico mas não conta para avançar de nível.
          </p>
        )}
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <Button
          tone="neutral"
          size="lg"
          onClick={() => {
            if (window.confirm('Descartar esta sessão sem salvar?')) dispatch({ type: 'reset' })
          }}
        >
          Descartar
        </Button>
        <Button size="lg" disabled={saving} onClick={() => void save()}>
          Salvar sessão
        </Button>
      </div>
    </div>
  )
}
