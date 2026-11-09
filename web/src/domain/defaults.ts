import type { ChecklistItemId, Settings } from './types'

export const DEFAULT_SETTINGS: Omit<Settings, 'createdAt' | 'updatedAt' | 'deletedAt' | 'deviceId'> = {
  id: 'settings',
  dogName: 'Milo',
  dogPhoto: null,
  trainers: [
    { id: 'lucas', name: 'Lucas' },
    { id: 'pai', name: 'Pai' },
  ],
  mealTimes: ['07:30', '18:00'],
  outingTimes: [
    { id: 'acordar', time: '06:45', label: 'Ao acordar' },
    { id: 'cafe', time: '07:50', label: 'Depois do café' },
    { id: 'meio-dia', time: '12:30', label: 'Meio do dia' },
    { id: 'jantar', time: '18:20', label: 'Depois do jantar' },
    { id: 'dormir', time: '22:30', label: 'Antes de dormir' },
  ],
  activityGoalMin: 60,
  soundType: 'clique',
  volume: 0.9,
  remindersEnabled: true,
  dogBreed: 'Fox terrier de pelo curto',
  dogBirthDate: null,
  dogWeights: [],
}

export const CHECKLIST_ITEMS: { id: ChecklistItemId; label: string; hint: string }[] = [
  { id: 'comida', label: 'Antes da comida', hint: 'Peça "senta" e espere. Só então ponha o pote no chão.' },
  { id: 'passeio', label: 'Antes do passeio', hint: '"Espera" na porta. A guia só sai quando ele estiver calmo.' },
  { id: 'brincadeira', label: 'Antes da brincadeira', hint: 'Um comando rápido e a bolinha é o prêmio.' },
  { id: 'carinho', label: 'Antes do carinho', hint: 'Pediu carinho? Peça um "senta" primeiro.' },
]

export const ROOMS = ['Sala', 'Cozinha', 'Quarto', 'Banheiro', 'Corredor', 'Varanda', 'Outro'] as const

export const MIN_ATTEMPTS_PER_SESSION = 5
export const ADVANCE_RATE = 0.8
export const ADVANCE_SESSIONS = 3
