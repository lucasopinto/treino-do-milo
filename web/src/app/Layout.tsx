import { useEffect } from 'react'
import { Outlet, ScrollRestoration } from 'react-router'
import { BottomNav } from './BottomNav'
import { ReminderWatcher } from '../features/xixi/ReminderWatcher'
import { ActiveSessionPill } from '../features/sessao/ActiveSessionPill'
import { useSettings } from '../hooks/useData'
import { configureAudio, unlockAudio } from '../lib/audio'
import { startSyncLoop, useSyncStatus } from '../sync/controller'
import { useToast } from '../components/Toast'

export function Layout() {
  const settings = useSettings()
  const sync = useSyncStatus()
  const toast = useToast()

  useEffect(() => startSyncLoop(), [])

  useEffect(() => {
    if (sync.lastPulled > 0) toast(sync.lastPulled === 1 ? '1 registro novo do outro celular.' : `${sync.lastPulled} registros novos do outro celular.`, { tone: 'info' })
  }, [sync.lastSyncAt]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => configureAudio(settings.soundType, settings.volume), [settings.soundType, settings.volume])

  useEffect(() => {
    // Navegadores só liberam som depois do primeiro toque.
    const unlock = () => unlockAudio()
    window.addEventListener('pointerdown', unlock, { capture: true, once: true })
    return () => window.removeEventListener('pointerdown', unlock, { capture: true })
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
