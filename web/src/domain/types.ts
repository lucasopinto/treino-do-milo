// Tipos de domínio. Todo registro gravado tem os campos de BaseRecord,
// que permitem mesclar backups agora e sincronizar entre celulares na Fase 2.

export interface BaseRecord {
  id: string
  createdAt: number // epoch ms
  updatedAt: number // epoch ms; o mais recente vence em conflitos
  deletedAt: number | null // exclusão lógica
  deviceId: string
}

export type SkillId =
  | 'atencao'
  | 'senta'
  | 'deixa'
  | 'aqui'
  | 'espera'
  | 'pata'
  | 'toca-aqui'
  | 'reverencia'
  | 'rolar'
  | 'bang'

export interface TrainingSession extends BaseRecord {
  skillId: SkillId
  levelIndex: number // nível em que o cão estava quando treinou
  trainerId: string
  startedAt: number
  endedAt: number
  plannedSec: number
  actualSec: number
  hits: number
  misses: number
  clicks: number
}

export type EliminationKind = 'xixi' | 'coco'
export type EliminationPlace = 'fora' | 'dentro'

export interface Elimination extends BaseRecord {
  kind: EliminationKind
  place: EliminationPlace
  room: string | null
  at: number
  note: string | null
  trainerId: string
}

export type ActivityKind = 'passeio' | 'brincadeira'

export interface Activity extends BaseRecord {
  kind: ActivityKind
  startedAt: number
  durationMin: number
  source: 'cronometro' | 'manual'
  note: string | null
  trainerId: string
}

export type ChecklistItemId = 'comida' | 'passeio' | 'brincadeira' | 'carinho'

/** id = data local no formato AAAA-MM-DD */
export interface ChecklistDay extends BaseRecord {
  items: Record<ChecklistItemId, boolean>
}

export interface LevelChange {
  levelIndex: number
  at: number
  trainerId: string
}

/** id = SkillId */
export interface SkillProgress extends BaseRecord {
  levelIndex: number
  levelChangedAt: number
  history: LevelChange[]
}

export interface Trainer {
  id: string
  name: string
}

export interface OutingTime {
  id: string
  time: string // HH:MM
  label: string
}

export type SoundType = 'clique' | 'madeira' | 'bip'

/** id = 'settings' (registro único) */
export interface Settings extends BaseRecord {
  dogName: string
  dogPhoto: string | null // data URL JPEG pequena
  trainers: Trainer[]
  mealTimes: string[] // HH:MM
  outingTimes: OutingTime[]
  activityGoalMin: number
  soundType: SoundType
  volume: number // 0..1
  remindersEnabled: boolean
}
