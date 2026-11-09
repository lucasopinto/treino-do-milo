// Utilidades de data no horário local do aparelho.

export const MINUTE = 60_000
export const HOUR = 60 * MINUTE
export const DAY = 24 * HOUR

const pad = (n: number) => String(n).padStart(2, '0')

/** 'AAAA-MM-DD' no fuso local. */
export function dayKey(d: Date | number): string {
  const x = new Date(d)
  return `${x.getFullYear()}-${pad(x.getMonth() + 1)}-${pad(x.getDate())}`
}

export function parseDayKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y ?? 1970, (m ?? 1) - 1, d ?? 1)
}

export function startOfDay(d: Date | number): Date {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x
}

/** Soma dias de calendário (seguro com horário de verão). */
export function addDays(d: Date | number, n: number): Date {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}

/** Segunda-feira da semana de `d`, à meia-noite. */
export function startOfWeek(d: Date | number): Date {
  const x = startOfDay(d)
  const dow = (x.getDay() + 6) % 7 // 0 = segunda
  return addDays(x, -dow)
}

export function startOfMonth(d: Date | number): Date {
  const x = startOfDay(d)
  x.setDate(1)
  return x
}

/** Diferença em dias de calendário entre duas datas (b - a). */
export function daysBetween(a: Date | number, b: Date | number): number {
  return Math.round((startOfDay(b).getTime() - startOfDay(a).getTime()) / DAY)
}

/** 'HH:MM' -> minutos desde a meia-noite. Retorna null se inválido. */
export function parseHM(hm: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hm.trim())
  if (!m) return null
  const h = Number(m[1])
  const min = Number(m[2])
  if (h > 23 || min > 59) return null
  return h * 60 + min
}

export function formatHM(d: Date | number): string {
  const x = new Date(d)
  return `${pad(x.getHours())}:${pad(x.getMinutes())}`
}

/** Data em que o horário 'HH:MM' acontece no dia de `base`. */
export function atTime(base: Date | number, hm: string): Date | null {
  const mins = parseHM(hm)
  if (mins === null) return null
  const x = startOfDay(base)
  x.setHours(Math.floor(mins / 60), mins % 60, 0, 0)
  return x
}

/** 125000 ms -> '02:05'; acima de 1h -> '1:02:05'. */
export function formatClock(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`
}

/** Texto curto de duração: '1 h 20 min', '45 min', 'menos de 1 min'. */
export function formatDurationText(ms: number): string {
  const totalMin = Math.floor(ms / MINUTE)
  if (totalMin < 1) return 'menos de 1 min'
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  if (h === 0) return `${m} min`
  return m === 0 ? `${h} h` : `${h} h ${m} min`
}

const longDateFmt = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })
const shortDateFmt = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit' })
const dayMonthFmt = new Intl.DateTimeFormat('pt-BR', { day: 'numeric', month: 'short' })

/** 'segunda-feira, 9 de novembro' */
export function formatLongDate(d: Date | number): string {
  const s = longDateFmt.format(new Date(d))
  return s.charAt(0).toUpperCase() + s.slice(1)
}

/** '09/11' */
export function formatShortDate(d: Date | number): string {
  return shortDateFmt.format(new Date(d))
}

/** '9 de nov.' */
export function formatDayMonth(d: Date | number): string {
  return dayMonthFmt.format(new Date(d))
}

/** 'Hoje', 'Ontem' ou '09/11'. */
export function relativeDayLabel(d: Date | number, now: Date | number): string {
  const diff = daysBetween(d, now)
  if (diff === 0) return 'Hoje'
  if (diff === 1) return 'Ontem'
  return formatShortDate(d)
}
