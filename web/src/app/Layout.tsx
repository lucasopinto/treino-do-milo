import { useEffect } from 'react'
import { Outlet, ScrollRestoration } from 'react-router'
import { BottomNav } from './BottomNav'
import { ReminderWatcher } from '../features/xixi/ReminderWatcher'
import { ActiveSessionPill } from '../features/sessao/ActiveSessionPill'
import { useSettings } from '../hooks/useData'
import { audioReady, configureAudio, unlockAudio } from '../lib/audio'
import { startSyncLoop, useSyncStatus } from '../sync/controller'
import { refreshPushSubscription } from '../sync/push'
import { useToast } from '../components/Toast'

export function Layout() {
  const settings = useSettings()
  const sync = useSyncStatus()
  const toast = useToast()

  useEffect(() => {
    void refreshPushSubscription()
    return startSyncLoop()
  }, [])

  useEffect(() => {
    if (sync.lastPulled > 0) toast(sync.lastPulled === 1 ? '1 registro novo do outro celular.' : `${sync.lastPulled} registros novos do outro celular.`, { tone: 'info' })
  }, [sync.lastSyncAt]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => configureAudio(settings.soundType, settings.volume), [settings.soundType, settings.volume])

  useEffect(() => {
    // Navegadores só liberam som num toque de verdade. No celular, `pointerdown` não conta:
    // contam `pointerup`, `touchend`, `click` e `keydown`. Fica ouvindo sempre (não só uma vez),
    // porque o iOS volta a suspender o som quando o app vai para o fundo.
    const events = ['pointerup', 'touchend', 'click', 'keydown'] as const
    const unlock = () => {
      if (!audioReady()) unlockAudio()
    }
    for (const e of events) window.addEventListener(e, unlock, { capture: true, passive: true })
    return () => {
      for (const e of events) window.removeEventListener(e, unlock, { capture: true })
    }
  }, [])

  return (
    <>
      <main className="mx-auto w-full max-w-lg px-4 pb-32 pt-safe">
        <Outlet />
      </main>
      <BottomNav />
      <ActiveSessionPill />
      <ReminderWatcher />
      <ScrollRestoration />
    </>
  )
}
