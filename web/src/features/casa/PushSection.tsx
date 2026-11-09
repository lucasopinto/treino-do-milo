import { useState } from 'react'
import { BellOff, BellRing, Send } from 'lucide-react'
import { Button, Card } from '../../components/ui'
import { useToast } from '../../components/Toast'
import { feedbackOk } from '../../lib/feedback'
import { disablePush, enablePush, pushState, testPush, type PushState } from '../../sync/push'

/** Avisos de saída pelo servidor (Web Push). */
export function PushSection() {
  const toast = useToast()
  const [state, setState] = useState<PushState>(pushState)
  const [busy, setBusy] = useState(false)

  async function act(fn: () => Promise<void>, ok: string) {
    setBusy(true)
    try {
      await fn()
      feedbackOk()
      toast(ok)
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Não deu certo.', { tone: 'warn', ms: 7000 })
    } finally {
      setBusy(false)
      setState(pushState())
    }
  }

  return (
    <Card>
      <h2 className="mb-2 text-lg font-bold">Avisos de saída com o app fechado</h2>
      {state === 'needs-install' && (
        <p className="text-stone-700 dark:text-stone-300">
          No iPhone, os avisos só funcionam com o app instalado: no Safari, toque em Compartilhar e depois em “Adicionar à Tela de Início”. Depois
          abra pelo ícone e volte aqui.
        </p>
      )}
      {state === 'unsupported' && <p className="text-stone-700 dark:text-stone-300">Este navegador não recebe avisos com o app fechado.</p>}
      {state === 'denied' && (
        <p className="flex gap-3 text-stone-700 dark:text-stone-300">
          <BellOff aria-hidden className="shrink-0" />
          As notificações estão bloqueadas para este app. Libere nas configurações do celular e volte aqui.
        </p>
      )}
      {state === 'off' && (
        <>
          <p className="mb-3 text-stone-700 dark:text-stone-300">
            O servidor avisa este celular na hora de cada saída da agenda, mesmo com o app fechado.
          </p>
          <Button
            tone="sky"
            size="lg"
            className="w-full"
            icon={<BellRing aria-hidden />}
            disabled={busy}
            onClick={() => void act(enablePush, 'Avisos ligados neste celular.')}
          >
            Ligar avisos neste celular
          </Button>
        </>
      )}
      {state === 'on' && (
        <>
          <p className="mb-3 flex items-center gap-2 font-semibold text-green-800 dark:text-green-400">
            <BellRing aria-hidden size={20} /> Avisos ligados neste celular
          </p>
          <div className="grid grid-cols-2 gap-3">
            <Button tone="neutral" icon={<Send aria-hidden size={20} />} disabled={busy} onClick={() => void act(testPush, 'Aviso de teste enviado.')}>
              Testar
            </Button>
            <Button tone="neutral" disabled={busy} onClick={() => void act(disablePush, 'Avisos desligados neste celular.')}>
              Desligar
            </Button>
          </div>
        </>
      )}
    </Card>
  )
}
