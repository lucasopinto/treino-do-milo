// Ficha do cachorro: idade a partir da data de nascimento e pesagens.
import type { DogWeight } from './types'

/** Idade por extenso: "3 semanas", "5 meses", "1 ano e 2 meses", "3 anos". */
export function ageText(birthDate: string | null | undefined, now: Date = new Date()): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(birthDate ?? '')
  if (!m) return null
  const birth = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
  if (birth.getTime() > now.getTime()) return null
  let months = (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth())
  if (now.getDate() < birth.getDate()) months -= 1
  if (months < 1) {
    const weeks = Math.floor((now.getTime() - birth.getTime()) / (7 * 86_400_000))
    if (weeks < 1) return 'recém-nascido'
    return weeks === 1 ? '1 semana' : `${weeks} semanas`
  }
  const years = Math.floor(months / 12)
  const rest = months % 12
  const y = years === 1 ? '1 ano' : `${years} anos`
  const mo = rest === 1 ? '1 mês' : `${rest} meses`
  if (years === 0) return mo
  return rest === 0 ? y : `${y} e ${mo}`
}

/** Pesagem mais recente. */
export function latestWeight(weights: DogWeight[] | undefined): DogWeight | null {
  if (!weights?.length) return null
  return weights.reduce((a, b) => (b.at > a.at ? b : a))
}

/** "7,4 kg" */
export function formatKg(kg: number): string {
  return `${kg.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} kg`
}

/** Aceita "7,4" ou "7.4". Peso razoável para um cachorro: de 0,1 a 120 kg. */
export function parseKg(text: string): number | null {
  const n = Number(text.trim().replace(',', '.'))
  if (!Number.isFinite(n) || n < 0.1 || n > 120) return null
  return Math.round(n * 100) / 100
}
