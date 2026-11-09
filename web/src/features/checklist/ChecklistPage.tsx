import { CheckCircle2, Circle, PartyPopper } from 'lucide-react'
import { Card, PageHeader } from '../../components/ui'
import { useChecklistDays } from '../../hooks/useData'
import { useNow } from '../../hooks/useNow'
import { setChecklistItem } from '../../db/repo'
import { CHECKLIST_ITEMS } from '../../domain/defaults'
import { checkedCount, completeStreak, isComplete, lastDays } from '../../domain/checklist'
import { dayKey, formatShortDate } from '../../domain/dates'
import { feedbackOk, feedbackSoft } from '../../lib/feedback'

export function ChecklistPage() {
  const now = useNow(60_000)
  const days = useChecklistDays() ?? []
  const today = days.find((d) => d.id === dayKey(now))
  const done = checkedCount(today)
  const streak = completeStreak(days, now)
  const history = lastDays(days, now, 28)
  const completeCount = days.filter((d) => isComplete(d)).length

  async function toggle(id: (typeof CHECKLIST_ITEMS)[number]['id']) {
    const next = !today?.items[id]
    await setChecklistItem(dayKey(now), id, next)
    if (next && done + 1 === CHECKLIST_ITEMS.length) feedbackOk()
    else feedbackSoft()
  }

  return (
    <>
      <PageHeader title="Nada é de graça" subtitle="Antes de cada coisa boa, um comando que ele já sabe." />
      <div className="flex flex-col gap-4">
        <ul className="flex flex-col gap-2">
          {CHECKLIST_ITEMS.map((item) => {
            const checked = !!today?.items[item.id]
            return (
              <li key={item.id}>
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={checked}
                  onClick={() => void toggle(item.id)}
                  className={`flex min-h-20 w-full items-center gap-4 rounded-3xl p-4 text-left ring-2 transition active:animate-pop ${
                    checked
                      ? 'bg-green-700 text-white ring-green-700'
                      : 'bg-white ring-stone-200 dark:bg-stone-900 dark:ring-stone-800'
                  }`}
                >
                  {checked ? <CheckCircle2 aria-hidden size={36} className="shrink-0" /> : <Circle aria-hidden size={36} className="shrink-0 text-stone-400" />}
                  <span>
                    <span className="block text-xl font-bold">{item.label}</span>
                    <span className={`block text-sm ${checked ? 'text-green-50' : 'text-stone-600 dark:text-stone-400'}`}>{item.hint}</span>
                  </span>
                </button>
              </li>
            )
          })}
        </ul>

        {done === CHECKLIST_ITEMS.length && (
          <p className="flex items-center gap-3 rounded-3xl bg-green-100 p-4 text-lg font-bold text-green-950 dark:bg-green-950 dark:text-green-100">
            <PartyPopper aria-hidden /> Dia completo!
          </p>
        )}

        <Card>
          <div className="mb-3">
            <h2 className="text-lg font-bold">Últimas 4 semanas</h2>
            <span className="block text-sm text-stone-600 dark:text-stone-400">
              {streak} {streak === 1 ? 'dia seguido' : 'dias seguidos'} · {completeCount} no total
            </span>
          </div>
          <ol className="grid grid-cols-7 gap-1.5" aria-label="Dias completos nas últimas 4 semanas">
            {history.map((d) => (
              <li
                key={d.key}
                title={`${formatShortDate(d.date)}: ${d.count} de 4`}
                aria-label={`${formatShortDate(d.date)}: ${d.count} de 4${d.complete ? ', completo' : ''}`}
                className={`grid aspect-square place-items-center rounded-lg text-xs font-semibold ${
                  d.complete
                    ? 'bg-green-700 text-white'
                    : d.count > 0
                      ? 'bg-green-200 text-green-950 dark:bg-green-950 dark:text-green-200'
                      : 'bg-stone-200 text-stone-600 dark:bg-stone-800 dark:text-stone-400'
                } ${d.key === dayKey(now) ? 'ring-2 ring-brand-600' : ''}`}
              >
                {d.date.getDate()}
              </li>
            ))}
          </ol>
          <p className="mt-3 text-sm text-stone-600 dark:text-stone-400">Verde-escuro: os 4 itens feitos. Verde-claro: parte deles. A lista recomeça todo dia.</p>
        </Card>
      </div>
    </>
  )
}
