import { useEffect, useRef, useState } from 'react'
import { BellRing } from 'lucide-react'
import { Button } from '../../components/ui'
import { useToast } from '../../components/Toast'
import { useSettings } from '../../hooks/useData'
import { useTrainer } from '../../hooks/useTrainer'
import { addElimination } from '../../db/repo'
import { dayKey } from '../../domain/dates'
import { dueOutings, type OutingOccurrence } from '../../domain/schedule'
import { playCue } from '../../lib/audio'
import { vibrate } from '../../lib/haptics'
import { showSystemNotification } from '../../lib/notify'
import { readLocalJson, writeLocalJson } from '../../lib/storage'
import { feedbackOk } from '../../lib/feedback'
import { isPushOn } from '../../sync/push'
import { profileSchedule, useDeviceOwner } from '../../sync/schedule'

const CHECK_MS = 15_000
const SNOOZE_MS = 10 * 60_000
const FIRED_KEY = 'milo.firedReminders'

function firedSet(): Set<string> {
  return new Set(readLocalJson<string[]>(FIRED_KEY) ?? [])
}

function markFired(key: string) {
  // Guarda só os de hoje e ontem, para a lista não crescer para sempre.
  const minKey = dayKey(Date.now() - 86_400_000)
  writeLocalJson(FIRED_KEY, [...new Set([...firedSet(), key])].filter((k) => k.slice(0, 10) >= minKey))
}

/**
 * Vigia os horários de saída enquanto o app está aberto (ou recém-minimizado).
 * Quando chega a hora: alerta na tela + som + vibração + notificação do sistema (se permitida).
 */
export function ReminderWatcher() {
  const settings = useSettings()
  const toast = useToast()
  const { trainer } = useTrainer()
  // Os lembretes deste celular seguem a agenda do dono dele (no fuso do dono).
  const owner = useDeviceOwner()
  const schedule = profileSchedule(settings, owner ?? trainer.id)
  const [active, setActive] = useState<OutingOccurrence | null>(null)
  const lastCheck = useRef(new Date(Date.now() - 10 * 60_000))
  const snoozeUntil = useRef<{ at: number; occ: OutingOccurrence } | null>(null)

  useEffect(() => {
    if (!schedule.remindersEnabled) return
    function fire(occ: OutingOccurrence) {
      setActive(occ)
      playCue('lembrete')
      vibrate([400, 200, 400, 200, 400])
      void showSystemNotification(
        `Hora de levar o ${settings.dogName} lá fora`,
        `${occ.outing.label} (${occ.outing.time}). Recompense em até 3 segundos se ele fizer lá fora.`,
        `saida-${occ.outing.id}`,
      )
    }
    function check() {
      const now = new Date()
      // Com os avisos do servidor ligados, quem avisa é o servidor (senão chegaria duas vezes).
      if (isPushOn()) {
        lastCheck.current = now
        return
      }
      const fired = firedSet()
      for (const occ of dueOutings(schedule.outingTimes, lastCheck.current, now, undefined, schedule.timezone)) {
        const key = `${dayKey(occ.at)}:${occ.outing.id}`
        if (fired.has(key)) continue
        markFired(key)
        fire(occ)
      }
      const sn = snoozeUntil.current
      if (sn && now.getTime() >= sn.at) {
        snoozeUntil.current = null
        fire(sn.occ)
      }
      lastCheck.current = now
    }
    check()
    const id = window.setInterval(check, CHECK_MS)
    document.addEventListener('visibilitychange', check)
    return () => {
      window.clearInterval(id)
      document.removeEventListener('visibilitychange', check)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(schedule.outingTimes), schedule.remindersEnabled, schedule.timezone, settings.dogName])

  if (!active) return null

  async function didPee() {
    await addElimination({ kind: 'xixi', place: 'fora', room: null, at: Date.now(), note: null, trainerId: trainer.id })
    feedbackOk()
    toast('Xixi lá fora registrado! Petisco agora.')
    setActive(null)
  }

  return (
    <div role="alertdialog" aria-modal="true" aria-labelledby="lembrete-titulo" className="fixed inset-0 z-[60] grid place-items-end bg-black/60 p-4 sm:place-items-center">
      <div className="w-full max-w-md animate-fade-up rounded-3xl bg-white p-5 shadow-2xl dark:bg-stone-900">
        <div className="mb-3 flex items-center gap-3 text-brand-700 dark:text-brand-400">
          <BellRing aria-hidden size={32} className="animate-pulse" />
          <span className="text-lg font-bold">{active.outing.time} · {active.outing.label}</span>
        </div>
        <h2 id="lembrete-titulo" className="text-2xl font-bold">
          Hora de levar o {settings.dogName} lá fora
        </h2>
        <p className="mt-2 text-stone-700 dark:text-stone-300">
          Leve com calma até o local de sempre. Quando ele fizer, diga "isso!" e dê o petisco em até 3 segundos.
        </p>
        <div className="mt-5 flex flex-col gap-3">
          <Button tone="green" size="lg" onClick={() => void didPee()}>
            Fez xixi lá fora
          </Button>
          <div className="grid grid-cols-2 gap-3">
            <Button
              tone="neutral"
              onClick={() => {
                snoozeUntil.current = { at: Date.now() + SNOOZE_MS, occ: active }
                setActive(null)
                toast('Aviso de novo em 10 minutos.', { tone: 'info' })
              }}
            >
              Daqui a 10 min
            </Button>
            <Button tone="neutral" onClick={() => setActive(null)}>
              Fechar
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
