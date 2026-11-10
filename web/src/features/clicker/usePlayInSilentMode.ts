import { useSyncExternalStore } from 'react'
import { getPlayInSilentMode, onPlayInSilentModeChange } from '../../lib/audio'

/** Opção "tocar no silencioso" (iPhone), atualizada em todas as telas quando muda. */
export function usePlayInSilentMode(): boolean {
  return useSyncExternalStore(onPlayInSilentModeChange, getPlayInSilentMode, () => true)
}
