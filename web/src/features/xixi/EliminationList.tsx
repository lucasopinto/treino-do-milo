import { useState } from 'react'
import { Pencil } from 'lucide-react'
import { Button, Field, Segmented, Sheet } from '../../components/ui'
import { useToast } from '../../components/Toast'
import { restore, softDelete, updateElimination } from '../../db/repo'
import { useTrainerName } from '../../hooks/useTrainer'
import { formatHM } from '../../domain/dates'
import { ROOMS } from '../../domain/defaults'
import { feedbackOk } from '../../lib/feedback'
import { timeInputToEpoch } from './EliminationSheet'
import type { Elimination } from '../../domain/types'

export function eliminationLabel(e: Pick<Elimination, 'kind' | 'place'>): string {
  return `${e.kind === 'xixi' ? 'Xixi' : 'Cocô'} ${e.place === 'fora' ? 'lá fora' : 'dentro de casa'}`
}

export function EliminationList({ items }: { items: Elimination[] }) {
  const name = useTrainerName()
  const [editing, setEditing] = useState<Elimination | null>(null)
  return (
    <>
      <ul className="divide-y divide-stone-200 dark:divide-stone-800">
        {[...items].reverse().map((e) => (
          <li key={e.id} className="flex items-center gap-3 py-2">
            <span className="w-14 shrink-0 font-bold tabular">{formatHM(e.at)}</span>
            <span aria-hidden className="text-2xl">{e.kind === 'xixi' ? '💧' : '💩'}</span>
            <span className="min-w-0 flex-1">
              <span className={`block font-semibold ${e.place === 'dentro' ? 'text-red-700 dark:text-red-400' : ''}`}>
                {eliminationLabel(e)}
              </span>
              <span className="block truncate text-sm text-stone-600 dark:text-stone-400">
                {[e.room, e.note, name(e.trainerId)].filter(Boolean).join(' · ')}
              </span>
            </span>
            <button
              type="button"
              aria-label={`Editar ${eliminationLabel(e)} das ${formatHM(e.at)}`}
              onClick={() => setEditing(e)}
              className="grid size-12 shrink-0 place-items-center rounded-xl text-stone-600 active:bg-stone-200 dark:text-stone-300 dark:active:bg-stone-800"
            >
              <Pencil aria-hidden size={20} />
            </button>
          </li>
        ))}
      </ul>
      <Sheet open={editing !== null} onClose={() => setEditing(null)} title="Editar registro">
        {editing && <EditForm item={editing} onDone={() => setEditing(null)} />}
      </Sheet>
    </>
  )
}

function EditForm({ item, onDone }: { item: Elimination; onDone: () => void }) {
  const toast = useToast()
  const [kind, setKind] = useState(item.kind)
  const [place, setPlace] = useState(item.place)
  const [room, setRoom] = useState(item.room ?? '')
  const [time, setTime] = useState(formatHM(item.at))
  const [note, setNote] = useState(item.note ?? '')

  async function save() {
    const at = new Date(item.at)
    const base = timeInputToEpoch(time, new Date(at.getFullYear(), at.getMonth(), at.getDate(), 23, 59))
    await updateElimination(item.id, {
      kind,
      place,
      room: place === 'dentro' ? room || null : null,
      at: base,
      note: note.trim() || null,
    })
    feedbackOk()
    onDone()
  }

  async function remove() {
    await softDelete('eliminations', item.id)
    toast('Registro apagado.', { tone: 'info', action: { label: 'Desfazer', onClick: () => void restore('eliminations', item.id) } })
    onDone()
  }

  return (
    <div className="flex flex-col gap-4">
      <Segmented label="Tipo" value={kind} onChange={setKind} options={[{ value: 'xixi', label: 'Xixi' }, { value: 'coco', label: 'Cocô' }]} />
      <Segmented label="Local" value={place} onChange={setPlace} options={[{ value: 'fora', label: 'Lá fora' }, { value: 'dentro', label: 'Dentro de casa' }]} />
      {place === 'dentro' && (
        <Field label="Cômodo">
          <select value={room} onChange={(e) => setRoom(e.target.value)}>
            <option value="">Não informado</option>
            {ROOMS.map((r) => (
              <option key={r}>{r}</option>
            ))}
          </select>
        </Field>
      )}
      <Field label="Horário">
        <input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
      </Field>
      <Field label="Observação">
        <input type="text" value={note} onChange={(e) => setNote(e.target.value)} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Button tone="red" size="lg" onClick={() => void remove()}>
          Apagar
        </Button>
        <Button size="lg" onClick={() => void save()}>
          Salvar
        </Button>
      </div>
    </div>
  )
}
