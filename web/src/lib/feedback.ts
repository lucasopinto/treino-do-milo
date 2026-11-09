import { playCue } from './audio'
import { vibrate } from './haptics'

/** Retorno imediato de que a ação foi registrada: som curto + vibração. */
export function feedbackOk(): void {
  playCue('ok')
  vibrate(40)
}

export function feedbackSoft(): void {
  vibrate(20)
}
