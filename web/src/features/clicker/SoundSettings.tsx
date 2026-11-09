import { useEffect, useState } from 'react'
import { Volume1, Volume2 } from 'lucide-react'
import { Button, Segmented } from '../../components/ui'
import { updateSettings } from '../../db/repo'
import { useSettings } from '../../hooks/useData'
import { configureAudio, playClick } from '../../lib/audio'
import type { SoundType } from '../../domain/types'

const SOUND_OPTIONS: { value: SoundType; label: string }[] = [
  { value: 'clique', label: 'Clique' },
  { value: 'madeira', label: 'Madeira' },
  { value: 'bip', label: 'Bip' },
]

export function SoundSettings() {
  const settings = useSettings()
  const [volume, setVolume] = useState(settings.volume)

  useEffect(() => setVolume(settings.volume), [settings.volume])

  // Grava o volume só quando o dedo para de mexer.
  useEffect(() => {
    if (volume === settings.volume) return
    const id = window.setTimeout(() => void updateSettings({ volume }), 300)
    return () => window.clearTimeout(id)
  }, [volume, settings.volume])

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="mb-2 font-semibold">Som do clique</p>
        <Segmented
          label="Som do clique"
          value={settings.soundType}
          options={SOUND_OPTIONS}
          onChange={(v) => {
            configureAudio(v, volume)
            playClick(v)
            void updateSettings({ soundType: v })
          }}
        />
      </div>
      <label className="flex flex-col gap-2">
        <span className="font-semibold">Volume: {Math.round(volume * 100)}%</span>
        <span className="flex items-center gap-3">
          <Volume1 aria-hidden className="shrink-0" />
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={volume}
            onChange={(e) => {
              const v = Number(e.target.value)
              setVolume(v)
              configureAudio(settings.soundType, v)
            }}
            className="h-12 flex-1 accent-brand-700 !border-0 !bg-transparent !px-0"
          />
          <Volume2 aria-hidden className="shrink-0" />
        </span>
      </label>
      <Button tone="neutral" onClick={() => playClick()}>
        Testar som
      </Button>
    </div>
  )
}
