import { useState } from 'react'
import { RotateCcw, SlidersHorizontal } from 'lucide-react'
import { Button, PageHeader, Sheet } from '../../components/ui'
import { ClickerButton } from './ClickerButton'
import { SoundSettings } from './SoundSettings'
import { SilentModeHint } from './SilentModeHint'
import { useWakeLock } from '../../hooks/useWakeLock'

export function ClickerPage() {
  const [count, setCount] = useState(0)
  const [showSettings, setShowSettings] = useState(false)
  useWakeLock(true)

  return (
    <>
      <PageHeader
        title="Clicker"
        subtitle="Clique no instante exato do acerto, depois o petisco."
        right={
          <Button tone="neutral" aria-label="Som e volume" onClick={() => setShowSettings(true)} icon={<SlidersHorizontal aria-hidden size={20} />}>
            Som
          </Button>
        }
      />
      <div className="flex flex-col items-center gap-6 pt-4">
        <ClickerButton onClick={() => setCount((c) => c + 1)} label="Clique" />
        <SilentModeHint />
        <div className="flex items-center gap-4">
          <p className="text-xl">
            Cliques: <strong className="tabular">{count}</strong>
          </p>
          <Button tone="ghost" icon={<RotateCcw aria-hidden size={20} />} onClick={() => setCount(0)} aria-label="Zerar contador">
            Zerar
          </Button>
        </div>
        <p className="text-center text-sm text-stone-600 dark:text-stone-400">
          Quer contar acertos e erros? Use o clicker dentro de uma sessão, na aba Treino.
        </p>
      </div>
      <Sheet open={showSettings} onClose={() => setShowSettings(false)} title="Som do clicker">
        <SoundSettings />
      </Sheet>
    </>
  )
}
