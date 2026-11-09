import { createContext, useContext, useState, type ReactNode } from 'react'
import { readLocal, writeLocal } from '../lib/storage'
import { useSettings } from './useData'
import type { Trainer } from '../domain/types'

interface TrainerCtx {
  trainer: Trainer
  trainers: Trainer[]
  setTrainerId: (id: string) => void
}

const Ctx = createContext<TrainerCtx | null>(null)

export function TrainerProvider({ children }: { children: ReactNode }) {
  const settings = useSettings()
  const [id, setId] = useState(() => readLocal('milo.trainer') ?? 'lucas')
  const trainers = settings.trainers
  const trainer = trainers.find((t) => t.id === id) ?? trainers[0] ?? { id: 'lucas', name: 'Lucas' }
  const setTrainerId = (next: string) => {
    setId(next)
    writeLocal('milo.trainer', next)
  }
  return <Ctx.Provider value={{ trainer, trainers, setTrainerId }}>{children}</Ctx.Provider>
}

export function useTrainer(): TrainerCtx {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useTrainer fora do TrainerProvider')
  return ctx
}

export function useTrainerName(): (id: string) => string {
  const { trainers } = useTrainer()
  return (id) => trainers.find((t) => t.id === id)?.name ?? id
}
