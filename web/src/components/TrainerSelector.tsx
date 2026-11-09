import { useTrainer } from '../hooks/useTrainer'
import { feedbackSoft } from '../lib/feedback'

/** Quem está usando o celular agora. Fica gravado em cada registro. */
export function TrainerSelector() {
  const { trainer, trainers, setTrainerId } = useTrainer()
  return (
    <div role="radiogroup" aria-label="Quem está treinando" className="flex gap-1 rounded-full bg-stone-200 p-1 dark:bg-stone-800">
      {trainers.map((t) => {
        const active = t.id === trainer.id
        return (
          <button
            key={t.id}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => {
              setTrainerId(t.id)
              feedbackSoft()
            }}
            className={`min-h-12 min-w-16 rounded-full px-4 font-bold transition ${
              active ? 'bg-brand-700 text-white shadow' : 'text-stone-700 dark:text-stone-300'
            }`}
          >
            {t.name}
          </button>
        )
      })}
    </div>
  )
}
