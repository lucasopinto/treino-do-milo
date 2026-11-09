// Vibração: Android sim; iPhone não suporta (a função simplesmente não faz nada).
export function vibrate(pattern: number | number[]): void {
  try {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) navigator.vibrate(pattern)
  } catch {
    /* ignora */
  }
}

export const canVibrate = () => typeof navigator !== 'undefined' && 'vibrate' in navigator
