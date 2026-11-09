import { useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { Scale, Trash2 } from 'lucide-react'
import { Button, Sheet } from '../../components/ui'
import { useToast } from '../../components/Toast'
import { db } from '../../db/db'
import { addDogWeight, defaultSettings, removeDogWeight, updateSettings } from '../../db/repo'
import { ageText, formatKg, parseKg } from '../../domain/dogProfile'
import { DEFAULT_SETTINGS } from '../../domain/defaults'
import { dayKey } from '../../domain/dates'
import { feedbackOk } from '../../lib/feedback'
import type { Settings } from '../../domain/types'

/** Ficha do cachorro: raça, nascimento (idade) e pesagens. Abre ao tocar no Milo animado do Painel. */
export function DogProfileSheet({ open, onClose, dogName }: { open: boolean; onClose: () => void; dogName: string }) {
  return (
    <Sheet open={open} onClose={onClose} title={`Ficha do ${dogName}`}>
      {open && <Body onClose={onClose} />}
    </Sheet>
  )
}

function Body({ onClose }: { onClose: () => void }) {
  // Espera as configurações salvas antes de preencher o formulário (senão começa com o padrão).
  const saved = useLiveQuery(() => db.settings.get('settings').then((s) => s ?? null), [])
  if (saved === undefined) return <p className="p-4 text-center text-stone-500">Carregando…</p>
  return <Form settings={saved ?? defaultSettings()} onClose={onClose} />
}

function Form({ settings, onClose }: { settings: Settings; onClose: () => void }) {
  const toast = useToast()
  const [breed, setBreed] = useState(settings.dogBreed ?? DEFAULT_SETTINGS.dogBreed ?? '')
  const [birth, setBirth] = useState(settings.dogBirthDate ?? '')
  const [kgText, setKgText] = useState('')
  const weights = [...(settings.dogWeights ?? [])].sort((a, b) => b.at - a.at)
  const age = ageText(birth)

  async function save() {
    await updateSettings({ dogBreed: breed.trim(), dogBirthDate: birth || null })
    feedbackOk()
    toast('Ficha salva.')
    onClose()
  }

  async function addWeight() {
    const kg = parseKg(kgText)
    if (kg === null) {
      toast('Digite o peso em kg, por exemplo 7,4.', { tone: 'info' })
      return
    }
    await addDogWeight(kg)
    setKgText('')
    feedbackOk()
    toast(`Peso registrado: ${formatKg(kg)}.`)
  }

  return (
    <div className="flex flex-col gap-4">
      <label className="flex flex-col gap-1">
        <span className="font-semibold">Raça</span>
        <input type="text" value={breed} onChange={(e) => setBreed(e.target.value)} maxLength={60} placeholder="Ex.: Fox terrier de pelo curto" />
      </label>

      <label className="flex flex-col gap-1">
        <span className="font-semibold">Nascimento</span>
        <input type="date" value={birth} max={dayKey(Date.now())} onChange={(e) => setBirth(e.target.value)} />
        <span className="text-sm text-stone-600 dark:text-stone-400">{age ? `Idade: ${age}` : 'Escolha a data para ver a idade.'}</span>
      </label>

      <Button size="lg" onClick={() => void save()}>
        Salvar ficha
      </Button>

      <div className="flex flex-col gap-2 border-t border-stone-200 pt-4 dark:border-stone-700">
        <span className="font-semibold">Peso</span>
        <div className="flex gap-2">
          <input
            type="text"
            inputMode="decimal"
            aria-label="Peso em kg"
            placeholder="kg, ex.: 7,4"
            value={kgText}
            onChange={(e) => setKgText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && void addWeight()}
            className="min-w-0 flex-1"
          />
          <Button tone="green" icon={<Scale aria-hidden size={20} />} onClick={() => void addWeight()}>
            Registrar
          </Button>
        </div>
        {weights.length === 0 ? (
          <p className="text-stone-600 dark:text-stone-400">Nenhuma pesagem ainda.</p>
        ) : (
          <ul className="flex flex-col gap-1">
            {weights.slice(0, 8).map((w, i) => {
              const prev = weights[i + 1]
              const diff = prev ? Math.round((w.kg - prev.kg) * 100) / 100 : null
              return (
                <li key={w.id} className="flex items-center justify-between gap-2 rounded-xl bg-stone-100 px-3 py-2 dark:bg-stone-800">
                  <span>
                    <span className="font-bold tabular">{formatKg(w.kg)}</span>
                    {diff !== null && diff !== 0 && (
                      <span className="ml-2 text-sm text-stone-600 dark:text-stone-400">
                        {diff > 0 ? '+' : '−'}
                        {formatKg(Math.abs(diff))}
                      </span>
                    )}
                    <span className="block text-sm text-stone-600 dark:text-stone-400">{new Date(w.at).toLocaleDateString('pt-BR')}</span>
                  </span>
                  <button
                    type="button"
                    aria-label={`Apagar pesagem de ${formatKg(w.kg)}`}
                    onClick={() => void removeDogWeight(w.id)}
                    className="grid size-12 shrink-0 place-items-center rounded-xl text-red-700 active:bg-red-100 dark:text-red-400 dark:active:bg-red-950"
                  >
                    <Trash2 aria-hidden />
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
