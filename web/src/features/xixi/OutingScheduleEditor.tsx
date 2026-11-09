import { useState } from 'react'
import { Plus, Trash2, Wand2 } from 'lucide-react'
import { Button, Sheet } from '../../components/ui'
import { useToast } from '../../components/Toast'
import { useSettings } from '../../hooks/useData'
import { outingsFromMeals, sortOutings } from '../../domain/schedule'
import { newId } from '../../lib/ids'
import { timeZoneName, timeZoneOptions, useProfileSchedule } from '../../sync/schedule'
import { useTrainer } from '../../hooks/useTrainer'
import { feedbackOk } from '../../lib/feedback'
import type { OutingTime } from '../../domain/types'

export function OutingScheduleEditor({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { trainer } = useTrainer()
  return (
    <Sheet open={open} onClose={onClose} title={`Horários de saída · ${trainer.name}`}>
      {open && <EditorBody onClose={onClose} />}
    </Sheet>
  )
}

function EditorBody({ onClose }: { onClose: () => void }) {
  const settings = useSettings()
  const { trainer } = useTrainer()
  const schedule = useProfileSchedule(trainer.id)
  const toast = useToast()
  const [list, setList] = useState<OutingTime[]>(() => sortOutings(schedule.outingTimes))
  const [tz, setTz] = useState(schedule.timezone)

  const change = (id: string, patch: Partial<OutingTime>) =>
    setList((l) => l.map((o) => (o.id === id ? { ...o, ...patch } : o)))

  function fromMeals() {
    const extra = outingsFromMeals(settings.mealTimes)
      .filter((t) => !list.some((o) => o.time === t))
      .map((time) => ({ id: newId(), time, label: 'Depois da refeição' }))
    if (extra.length === 0) {
      toast('Já existe saída depois de cada refeição.', { tone: 'info' })
      return
    }
    setList((l) => sortOutings([...l, ...extra]))
  }

  async function save() {
    const clean = list.filter((o) => o.time).map((o) => ({ ...o, label: o.label.trim() || 'Saída' }))
    await schedule.update({ outingTimes: sortOutings(clean), timezone: tz })
    feedbackOk()
    toast('Agenda salva.')
    onClose()
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="rounded-xl bg-sky-50 p-3 text-sky-900 dark:bg-sky-950 dark:text-sky-100">
        Agenda de <strong>{trainer.name}</strong>. Cada pessoa tem a sua, no horário de onde ela mora. Para editar a de
        outra pessoa, troque o perfil no topo da tela.
      </p>
      <label className="flex flex-col gap-1">
        <span className="font-semibold">Horários no fuso de</span>
        <select value={tz} onChange={(e) => setTz(e.target.value)} className="min-h-12">
          {timeZoneOptions(tz).map((z) => (
            <option key={z} value={z}>
              {timeZoneName(z)}
            </option>
          ))}
        </select>
      </label>
      <p className="text-stone-600 dark:text-stone-400">
        Saídas fixas ajudam o {settings.dogName} a entender a rotina. Lembre também de sair depois de brincar e antes de vocês saírem de casa.
      </p>
      <ul className="flex flex-col gap-2">
        {list.map((o) => (
          <li key={o.id} className="flex items-center gap-2">
            <input
              type="time"
              aria-label={`Horário de ${o.label}`}
              value={o.time}
              onChange={(e) => change(o.id, { time: e.target.value })}
              className="w-32 shrink-0"
            />
            <input
              type="text"
              aria-label="Nome da saída"
              value={o.label}
              onChange={(e) => change(o.id, { label: e.target.value })}
              className="min-w-0 flex-1"
            />
            <button
              type="button"
              aria-label={`Remover ${o.label}`}
              onClick={() => setList((l) => l.filter((x) => x.id !== o.id))}
              className="grid size-12 shrink-0 place-items-center rounded-xl text-red-700 active:bg-red-100 dark:text-red-400 dark:active:bg-red-950"
            >
              <Trash2 aria-hidden />
            </button>
          </li>
        ))}
      </ul>
      <div className="grid grid-cols-2 gap-3">
        <Button
          tone="neutral"
          icon={<Plus aria-hidden size={20} />}
          onClick={() => setList((l) => [...l, { id: newId(), time: '12:00', label: 'Nova saída' }])}
        >
          Adicionar
        </Button>
        <Button tone="neutral" icon={<Wand2 aria-hidden size={20} />} onClick={fromMeals}>
          Após refeições
        </Button>
      </div>
      <Button size="lg" onClick={() => void save()}>
        Salvar agenda
      </Button>
    </div>
  )
}
