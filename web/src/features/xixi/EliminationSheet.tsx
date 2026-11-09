import { useState } from 'react'
import { Clock, Sparkles } from 'lucide-react'
import { Button, Field, Sheet } from '../../components/ui'
import { useToast } from '../../components/Toast'
import { addElimination, softDelete } from '../../db/repo'
import { useTrainer } from '../../hooks/useTrainer'
import { ROOMS } from '../../domain/defaults'
import { formatHM } from '../../domain/dates'
import { feedbackOk } from '../../lib/feedback'
import type { EliminationKind } from '../../domain/types'

/** Converte 'HH:MM' de hoje em epoch; se o horário é "no futuro", assume ontem. */
export function timeInputToEpoch(hm: string, now = new Date()): number {
  const [h, m] = hm.split(':').map(Number)
  const d = new Date(now)
  d.setHours(h ?? 0, m ?? 0, 0, 0)
  if (d.getTime() > now.getTime() + 60_000) d.setDate(d.getDate() - 1)
  return d.getTime()
}

export function AccidentTip() {
  return (
    <p className="flex gap-3 rounded-2xl bg-amber-100 p-4 text-base font-medium text-amber-950 dark:bg-amber-950 dark:text-amber-100">
      <Sparkles aria-hidden className="mt-0.5 shrink-0" />
      <span>
        Limpe com <strong>produto enzimático</strong>. Não brigue depois: ele não liga a bronca ao xixi.
      </span>
    </p>
  )
}

/**
 * Grade com os 4 botões. "Lá fora" registra na hora (1 toque).
 * "Dentro de casa" abre o formulário curto com cômodo e lembrete de limpeza.
 */
export function EliminationQuickGrid({ onDone }: { onDone?: () => void }) {
  const toast = useToast()
  const { trainer } = useTrainer()
  const [accident, setAccident] = useState<EliminationKind | null>(null)
  const [customTime, setCustomTime] = useState<string | null>(null)

  const at = () => (customTime ? timeInputToEpoch(customTime) : Date.now())

  async function registerOutside(kind: EliminationKind) {
    const rec = await addElimination({ kind, place: 'fora', room: null, at: at(), note: null, trainerId: trainer.id })
    feedbackOk()
    toast(kind === 'xixi' ? 'Xixi lá fora! Petisco agora, em até 3 segundos.' : 'Cocô lá fora! Petisco agora.', {
      action: { label: 'Desfazer', onClick: () => void softDelete('eliminations', rec.id) },
    })
    setCustomTime(null)
    onDone?.()
  }

  if (accident) {
    return (
      <AccidentForm
        kind={accident}
        initialTime={customTime ?? formatHM(new Date())}
        onCancel={() => setAccident(null)}
        onSaved={() => {
          setAccident(null)
          setCustomTime(null)
          onDone?.()
        }}
      />
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-3">
        <Button tone="green" size="xl" onClick={() => void registerOutside('xixi')} className="flex-col !gap-1">
          <span className="text-3xl" aria-hidden>💧</span>
          Xixi lá fora
        </Button>
        <Button tone="green" size="xl" onClick={() => void registerOutside('coco')} className="flex-col !gap-1">
          <span className="text-3xl" aria-hidden>💩</span>
          Cocô lá fora
        </Button>
        <Button tone="neutral" size="lg" onClick={() => setAccident('xixi')}>
          Xixi dentro de casa
        </Button>
        <Button tone="neutral" size="lg" onClick={() => setAccident('coco')}>
          Cocô dentro de casa
        </Button>
      </div>
      {customTime === null ? (
        <Button tone="ghost" icon={<Clock aria-hidden size={20} />} onClick={() => setCustomTime(formatHM(new Date()))}>
          Horário: agora (mudar)
        </Button>
      ) : (
        <Field label="Horário do registro">
          <input type="time" value={customTime} onChange={(e) => setCustomTime(e.target.value)} />
        </Field>
      )}
    </div>
  )
}

function AccidentForm({
  kind,
  initialTime,
  onCancel,
  onSaved,
}: {
  kind: EliminationKind
  initialTime: string
  onCancel: () => void
  onSaved: () => void
}) {
  const toast = useToast()
  const { trainer } = useTrainer()
  const [room, setRoom] = useState<string | null>(null)
  const [time, setTime] = useState(initialTime)
  const [note, setNote] = useState('')

  async function save() {
    const rec = await addElimination({
      kind,
      place: 'dentro',
      room,
      at: timeInputToEpoch(time),
      note: note.trim() || null,
      trainerId: trainer.id,
    })
    feedbackOk()
    toast('Registrado. Amanhã ajuste a agenda se repetir no mesmo horário.', {
      tone: 'info',
      action: { label: 'Desfazer', onClick: () => void softDelete('eliminations', rec.id) },
    })
    onSaved()
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-lg font-semibold">{kind === 'xixi' ? 'Xixi' : 'Cocô'} dentro de casa</p>
      <AccidentTip />
      <fieldset>
        <legend className="mb-2 font-semibold">Onde foi?</legend>
        <div className="flex flex-wrap gap-2">
          {ROOMS.map((r) => (
            <button
              key={r}
              type="button"
              aria-pressed={room === r}
              onClick={() => setRoom(room === r ? null : r)}
              className={`min-h-12 rounded-full px-4 font-semibold ring-1 transition ${
                room === r
                  ? 'bg-brand-700 text-white ring-brand-700'
                  : 'bg-white ring-stone-300 dark:bg-stone-800 dark:ring-stone-600'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </fieldset>
      <Field label="Horário">
        <input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
      </Field>
      <Field label="Observação (opcional)">
        <input type="text" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ex.: logo depois de beber água" />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Button tone="neutral" size="lg" onClick={onCancel}>
          Voltar
        </Button>
        <Button tone="brand" size="lg" onClick={() => void save()}>
          Salvar
        </Button>
      </div>
    </div>
  )
}

export function EliminationSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Sheet open={open} onClose={onClose} title="Registrar xixi ou cocô">
      <EliminationQuickGrid onDone={onClose} />
    </Sheet>
  )
}
