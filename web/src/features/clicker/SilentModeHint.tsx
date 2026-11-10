import { useState } from 'react'
import { BellOff } from 'lucide-react'
import { Sheet } from '../../components/ui'
import { isIOS } from '../../lib/pwa'
import { SoundSettings } from './SoundSettings'
import { usePlayInSilentMode } from './usePlayInSilentMode'

/**
 * No iPhone, com a opção "tocar no silencioso" desligada, o clicker fica mudo se a chave de
 * silêncio estiver ligada. Mostra uma linha discreta com atalho para as opções de som.
 */
export function SilentModeHint() {
  const on = usePlayInSilentMode()
  const [open, setOpen] = useState(false)
  if (!isIOS() || on) return null
  return (
    <>
      <p className="flex items-start gap-2 text-sm text-stone-600 dark:text-stone-400">
        <BellOff aria-hidden size={16} className="mt-0.5 shrink-0" />
        <span>
          Sem som? Com o iPhone no silencioso, ligue{' '}
          <button type="button" onClick={() => setOpen(true)} className="font-semibold text-brand-700 underline dark:text-brand-400">
            'Tocar no silencioso'
          </button>{' '}
          nas opções de som.
        </span>
      </p>
      <Sheet open={open} onClose={() => setOpen(false)} title="Som do clicker">
        {open && <SoundSettings />}
      </Sheet>
    </>
  )
}
