import { useMemo, useState } from 'react'
import { Droplet, Footprints, Timer, Trash2 } from 'lucide-react'
import { Card, Empty, Field, PageHeader } from '../../components/ui'
import { useToast } from '../../components/Toast'
import { useActivities, useEliminations, useSessions } from '../../hooks/useData'
import { useTrainer, useTrainerName } from '../../hooks/useTrainer'
import { restore, softDelete, type DeletableTable } from '../../db/repo'
import { buildTimeline, DEFAULT_FILTERS, type TimelineEvent, type TimelineFilters } from '../../domain/timeline'
import { dayKey, formatHM, formatLongDate, relativeDayLabel } from '../../domain/dates'
import { sessionRate } from '../../domain/progress'
import { SKILLS, getSkill } from '../../content/skills'
import { eliminationLabel } from '../xixi/EliminationList'

const PAGE = 60

export function HistoricoPage() {
  const now = useMemo(() => new Date(), [])
  const [f, setF] = useState<TimelineFilters>(DEFAULT_FILTERS)
  const [limit, setLimit] = useState(PAGE)
  const since = f.days > 0 ? now.getTime() - f.days * 86_400_000 : 0
  const sessions = useSessions(since)
  const eliminations = useEliminations(since)
  const activities = useActivities(since)
  const { trainers } = useTrainer()
  const name = useTrainerName()
  const toast = useToast()

  const events = useMemo(
    () => buildTimeline({ sessions: sessions ?? [], eliminations: eliminations ?? [], activities: activities ?? [] }, f, now),
    [sessions, eliminations, activities, f, now],
  )
  const loading = !sessions || !eliminations || !activities
  const shown = events.slice(0, limit)

  const set = <K extends keyof TimelineFilters>(k: K, v: TimelineFilters[K]) => {
    setF((old) => ({ ...old, [k]: v, ...(k === 'skillId' && v !== 'todos' ? { type: 'sessao' as const } : {}) }))
    setLimit(PAGE)
  }

  function remove(ev: TimelineEvent) {
    const table: DeletableTable = ev.type === 'sessao' ? 'sessions' : ev.type === 'eliminacao' ? 'eliminations' : 'activities'
    void softDelete(table, ev.id)
    toast('Registro apagado.', { tone: 'info', action: { label: 'Desfazer', onClick: () => void restore(table, ev.id) } })
  }

  let lastDay = ''
  return (
    <>
      <PageHeader title="Histórico" subtitle={loading ? 'Carregando…' : `${events.length} registros`} />
      <Card className="mb-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Tipo">
            <select value={f.type} onChange={(e) => set('type', e.target.value as TimelineFilters['type'])}>
              <option value="todos">Tudo</option>
              <option value="sessao">Sessões de treino</option>
              <option value="eliminacao">Xixi e cocô</option>
              <option value="atividade">Atividade física</option>
            </select>
          </Field>
          <Field label="Período">
            <select value={f.days} onChange={(e) => set('days', Number(e.target.value))}>
              <option value={7}>7 dias</option>
              <option value={30}>30 dias</option>
              <option value={90}>3 meses</option>
              <option value={0}>Tudo</option>
            </select>
          </Field>
          <Field label="Comando">
            <select value={f.skillId} onChange={(e) => set('skillId', e.target.value as TimelineFilters['skillId'])}>
              <option value="todos">Todos</option>
              {SKILLS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Pessoa">
            <select value={f.trainerId} onChange={(e) => set('trainerId', e.target.value)}>
              <option value="todos">Todos</option>
              {trainers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </Card>

      {!loading && events.length === 0 && <Empty>Nada encontrado com esses filtros.</Empty>}

      <ol className="flex flex-col">
        {shown.map((ev) => {
          const k = dayKey(ev.at)
          const header = k !== lastDay
          lastDay = k
          return (
            <li key={ev.id}>
              {header && (
                <h2 className="sticky top-0 z-10 bg-stone-100 py-2 text-sm font-bold uppercase tracking-wide text-stone-600 dark:bg-stone-950 dark:text-stone-400">
                  {relativeDayLabel(ev.at, now)} · {formatLongDate(ev.at)}
                </h2>
              )}
              <Row ev={ev} who={name(ev.trainerId)} onDelete={() => remove(ev)} />
            </li>
          )
        })}
      </ol>
      {events.length > limit && (
        <button
          type="button"
          onClick={() => setLimit((l) => l + PAGE)}
          className="mt-3 min-h-12 w-full rounded-xl bg-white font-semibold ring-1 ring-stone-300 dark:bg-stone-800 dark:ring-stone-700"
        >
          Mostrar mais ({events.length - limit})
        </button>
      )}
    </>
  )
}

function Row({ ev, who, onDelete }: { ev: TimelineEvent; who: string; onDelete: () => void }) {
  let icon = <Timer aria-hidden />
  let title = ''
  let detail = ''
  let tone = 'bg-brand-100 text-brand-800 dark:bg-brand-900 dark:text-brand-100'
  if (ev.session) {
    const s = ev.session
    const rate = sessionRate(s)
    title = `${getSkill(s.skillId).name} · ${rate === null ? '–' : `${Math.round(rate * 100)}%`}`
    detail = `Nível ${s.levelIndex + 1} · ${s.hits} acertos, ${s.misses} erros · ${Math.round(s.actualSec / 60)} min`
  } else if (ev.elimination) {
    const e = ev.elimination
    icon = <Droplet aria-hidden />
    title = eliminationLabel(e)
    detail = [e.room, e.note].filter(Boolean).join(' · ')
    tone =
      e.place === 'fora'
        ? 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200'
        : 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200'
  } else if (ev.activity) {
    const a = ev.activity
    icon = <Footprints aria-hidden />
    title = `${a.kind === 'passeio' ? 'Passeio' : 'Brincadeira'} · ${a.durationMin} min`
    detail = a.source === 'cronometro' ? 'Cronômetro' : 'Manual'
    tone = 'bg-sky-100 text-sky-800 dark:bg-sky-950 dark:text-sky-200'
  }
  return (
    <div className="flex items-center gap-3 border-b border-stone-200 py-2 dark:border-stone-800">
      <span className="w-12 shrink-0 font-bold tabular">{formatHM(ev.at)}</span>
      <span className={`grid size-10 shrink-0 place-items-center rounded-full ${tone}`}>{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold">{title}</span>
        <span className="block truncate text-sm text-stone-600 dark:text-stone-400">{[detail, who].filter(Boolean).join(' · ')}</span>
      </span>
      <button
        type="button"
        aria-label={`Apagar: ${title}`}
        onClick={onDelete}
        className="grid size-12 shrink-0 place-items-center rounded-xl text-stone-500 active:bg-stone-200 dark:active:bg-stone-800"
      >
        <Trash2 aria-hidden size={20} />
      </button>
    </div>
  )
}
