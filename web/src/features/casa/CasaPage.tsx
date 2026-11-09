import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { Check, CloudOff, Copy, Home, LogOut, RefreshCw, Share2, Smartphone, Trash2, TriangleAlert, UserPlus } from 'lucide-react'
import { Button, Card, Field, PageHeader } from '../../components/ui'
import { useToast } from '../../components/Toast'
import { useTrainer } from '../../hooks/useTrainer'
import { useNow } from '../../hooks/useNow'
import { feedbackOk } from '../../lib/feedback'
import { formatHM } from '../../domain/dates'
import type { DeviceOut, HouseholdOut, InviteOut } from '../../sync/api'
import {
  createHousehold,
  fetchHousehold,
  getApiUrl,
  getSyncConfig,
  joinHousehold,
  leaveHousehold,
  markFullResync,
  newInvite,
  removeDevice,
  syncNow,
  useSyncStatus,
  type SyncStatus,
} from '../../sync/controller'
import { PushSection } from './PushSection'

function errorText(e: unknown): string {
  return e instanceof Error ? e.message : 'Algo deu errado.'
}

export function relativeAgo(ts: number | null, now: number): string {
  if (!ts) return 'ainda não'
  const s = Math.round((now - ts) / 1000)
  if (s < 60) return 'agora mesmo'
  const m = Math.round(s / 60)
  if (m < 60) return `há ${m} min`
  const h = Math.round(m / 60)
  if (h < 24) return `há ${h} h`
  return `há ${Math.round(h / 24)} dias`
}

export function SyncStatusLine({ status }: { status: SyncStatus }) {
  const now = useNow(30_000)
  const map: Record<SyncStatus['phase'], { text: string; cls: string; icon: ReactNode }> = {
    off: { text: 'Só neste celular', cls: 'text-stone-600 dark:text-stone-400', icon: <Smartphone aria-hidden size={18} /> },
    idle: {
      text: `Sincronizado ${relativeAgo(status.lastSyncAt, now.getTime())}`,
      cls: 'text-green-800 dark:text-green-400',
      icon: <Check aria-hidden size={18} />,
    },
    syncing: { text: 'Sincronizando…', cls: 'text-sky-800 dark:text-sky-300', icon: <RefreshCw aria-hidden size={18} className="animate-spin" /> },
    offline: {
      text: 'Sem internet: tudo fica guardado e é enviado depois',
      cls: 'text-stone-700 dark:text-stone-300',
      icon: <CloudOff aria-hidden size={18} />,
    },
    error: { text: status.error ?? 'Erro ao sincronizar', cls: 'text-red-800 dark:text-red-400', icon: <TriangleAlert aria-hidden size={18} /> },
    removed: { text: status.error ?? 'Removido da casa', cls: 'text-red-800 dark:text-red-400', icon: <TriangleAlert aria-hidden size={18} /> },
  }
  const s = map[status.phase]
  return (
    <p role="status" className={`flex items-center gap-2 font-semibold ${s.cls}`}>
      {s.icon}
      {s.text}
    </p>
  )
}

export function CasaPage() {
  const status = useSyncStatus()
  const connected = getSyncConfig() !== null && status.phase !== 'off' && status.phase !== 'removed'
  // Fica aqui (e não dentro de cada parte) para o código continuar na tela depois de criar a casa.
  const [invite, setInvite] = useState<{ invite: InviteOut; first: boolean } | null>(null)
  return (
    <>
      <PageHeader title="Casa compartilhada" subtitle="Os mesmos dados em todos os celulares da casa" />
      {invite ? (
        <InviteCard invite={invite.invite} first={invite.first} onDone={() => setInvite(null)} />
      ) : connected ? (
        <Connected status={status} onInvite={(i) => setInvite({ invite: i, first: false })} />
      ) : (
        <NotConnected status={status} onCreated={(i) => i && setInvite({ invite: i, first: true })} />
      )}
    </>
  )
}

// ---------- Ainda não está numa casa ----------

function NotConnected({ status, onCreated }: { status: SyncStatus; onCreated: (i: InviteOut | null) => void }) {
  const toast = useToast()
  const { trainer } = useTrainer()
  const [mode, setMode] = useState<'escolher' | 'criar' | 'entrar'>('escolher')
  const [name, setName] = useState(`Celular do ${trainer.name}`)
  const [code, setCode] = useState('')
  const [apiUrl, setApiUrlState] = useState(getApiUrl())
  const [busy, setBusy] = useState(false)

  async function run(fn: () => Promise<void>) {
    if (!apiUrl.trim()) {
      toast('Informe o endereço do servidor em "Avançado".', { tone: 'warn' })
      return
    }
    setBusy(true)
    try {
      await fn()
      feedbackOk()
    } catch (e) {
      toast(errorText(e), { tone: 'warn', ms: 7000 })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {status.phase === 'removed' && (
        <p className="rounded-2xl bg-red-100 p-4 text-red-950 dark:bg-red-950 dark:text-red-100">{status.error}</p>
      )}
      <Card>
        <p className="text-stone-700 dark:text-stone-300">
          Hoje os dados ficam só neste celular. Numa <strong>casa compartilhada</strong>, o que você e seu pai registram aparece nos dois
          celulares, e os lembretes de saída chegam mesmo com o app fechado.
        </p>
        <p className="mt-2 text-sm text-stone-600 dark:text-stone-400">
          Nada se perde: os registros que já estão em cada celular são juntados.
        </p>
      </Card>

      {mode === 'escolher' && (
        <div className="flex flex-col gap-3">
          <Button size="lg" icon={<Home aria-hidden />} onClick={() => setMode('criar')}>
            Criar casa (primeiro celular)
          </Button>
          <Button size="lg" tone="neutral" icon={<UserPlus aria-hidden />} onClick={() => setMode('entrar')}>
            Entrar com um código
          </Button>
        </div>
      )}

      {mode !== 'escolher' && (
        <Card>
          <form
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault()
              if (mode === 'criar') void run(async () => onCreated(await createHousehold(apiUrl, name.trim())))
              else
                void run(async () => {
                  await joinHousehold(apiUrl, code, name.trim())
                  toast('Pronto! Este celular entrou na casa.')
                })
            }}
          >
            {mode === 'entrar' && (
              <Field label="Código de convite" hint="Aparece no outro celular, em Casa compartilhada → Convidar.">
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  autoCapitalize="characters"
                  autoComplete="off"
                  spellCheck={false}
                  inputMode="text"
                  maxLength={8}
                  required
                  className="text-center font-mono text-2xl tracking-[0.3em]"
                  placeholder="K7M2QX"
                />
              </Field>
            )}
            <Field label="Nome deste celular">
              <input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} required />
            </Field>
            <details className="rounded-xl bg-stone-100 p-3 dark:bg-stone-800">
              <summary className="min-h-8 cursor-pointer font-semibold">Avançado</summary>
              <Field label="Endereço do servidor" hint="Já vem preenchido. Só mude se você hospedou a API em outro lugar.">
                <input type="url" inputMode="url" value={apiUrl} onChange={(e) => setApiUrlState(e.target.value)} placeholder="https://…" />
              </Field>
            </details>
            <Button type="submit" size="lg" disabled={busy}>
              {busy ? 'Conectando… (pode levar até 1 min)' : mode === 'criar' ? 'Criar casa' : 'Entrar na casa'}
            </Button>
            <Button tone="ghost" onClick={() => setMode('escolher')} disabled={busy}>
              Voltar
            </Button>
          </form>
        </Card>
      )}
    </div>
  )
}

// ---------- Convite ----------

function InviteCard({ invite, onDone, first = false }: { invite: InviteOut; onDone: () => void; first?: boolean }) {
  const toast = useToast()
  const text = `Código para entrar na casa do Treino do Milo: ${invite.code}`
  const canShare = typeof navigator.share === 'function'
  async function share() {
    try {
      if (canShare) await navigator.share({ text })
      else {
        await navigator.clipboard.writeText(invite.code)
        toast('Código copiado.')
      }
    } catch {
      /* cancelado */
    }
  }
  return (
    <Card className="text-center">
      {first && <p className="mb-2 font-semibold text-green-800 dark:text-green-400">Casa criada!</p>}
      <p className="text-stone-700 dark:text-stone-300">No outro celular, abra Mais → Casa compartilhada → Entrar com um código e digite:</p>
      <p className="my-4 select-all font-mono text-5xl font-bold tracking-[0.2em] tabular" aria-label={`Código ${invite.code.split('').join(' ')}`}>
        {invite.code}
      </p>
      <p className="text-sm text-stone-600 dark:text-stone-400">
        Vale uma vez, até {new Date(invite.expiresAt).toLocaleDateString('pt-BR')} às {formatHM(new Date(invite.expiresAt))}.
      </p>
      <div className="mt-4 grid grid-cols-2 gap-3">
        <Button tone="neutral" icon={canShare ? <Share2 aria-hidden size={20} /> : <Copy aria-hidden size={20} />} onClick={() => void share()}>
          {canShare ? 'Enviar' : 'Copiar'}
        </Button>
        <Button onClick={onDone}>Pronto</Button>
      </div>
    </Card>
  )
}

// ---------- Já está numa casa ----------

function Connected({ status, onInvite }: { status: SyncStatus; onInvite: (i: InviteOut) => void }) {
  const toast = useToast()
  const [household, setHousehold] = useState<HouseholdOut | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      setHousehold(await fetchHousehold())
      setLoadError(null)
    } catch (e) {
      setLoadError(errorText(e))
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function act(fn: () => Promise<unknown>, ok?: string) {
    try {
      await fn()
      if (ok) toast(ok)
      feedbackOk()
    } catch (e) {
      toast(errorText(e), { tone: 'warn', ms: 6000 })
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <SyncStatusLine status={status} />
        <Button tone="neutral" className="mt-3 w-full" icon={<RefreshCw aria-hidden size={20} />} onClick={() => void syncNow()} disabled={status.phase === 'syncing'}>
          Sincronizar agora
        </Button>
      </Card>

      <Card>
        <h2 className="mb-3 text-lg font-bold">Celulares da casa</h2>
        {loadError && <p className="mb-3 text-stone-600 dark:text-stone-400">Não foi possível carregar a lista ({loadError}).</p>}
        <ul className="flex flex-col gap-2">
          {household?.devices.map((d) => (
            <DeviceRow
              key={d.id}
              d={d}
              onRemove={() =>
                window.confirm(`Remover "${d.name}" da casa? Ele para de sincronizar, mas os dados continuam nele.`) &&
                void act(async () => {
                  await removeDevice(d.id)
                  await load()
                }, 'Celular removido.')
              }
            />
          ))}
        </ul>
        <Button className="mt-3 w-full" icon={<UserPlus aria-hidden size={20} />} onClick={() => void act(async () => onInvite(await newInvite()))}>
          Convidar outro celular
        </Button>
      </Card>

      <PushSection />

      <Card>
        <h2 className="mb-2 text-lg font-bold">Problemas?</h2>
        <p className="mb-3 text-sm text-stone-600 dark:text-stone-400">
          Se algo registrado aqui não apareceu no outro celular, envie tudo de novo. Não cria duplicados.
        </p>
        <Button
          tone="neutral"
          className="w-full"
          onClick={() =>
            void act(async () => {
              markFullResync()
              await syncNow()
            }, 'Tudo enviado de novo.')
          }
        >
          Enviar tudo de novo
        </Button>
        <Button
          tone="ghost"
          className="mt-2 w-full text-red-800 dark:text-red-400"
          icon={<LogOut aria-hidden size={20} />}
          onClick={() =>
            window.confirm('Sair da casa? Este celular para de sincronizar. Os dados continuam aqui.') &&
            void act(leaveHousehold, 'Este celular saiu da casa.')
          }
        >
          Sair da casa
        </Button>
      </Card>
    </div>
  )
}

function DeviceRow({ d, onRemove }: { d: DeviceOut; onRemove: () => void }) {
  const now = useNow(60_000)
  return (
    <li className="flex items-center gap-3 rounded-2xl bg-stone-100 p-3 dark:bg-stone-800">
      <Smartphone aria-hidden className="shrink-0 text-stone-500" />
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold">
          {d.name} {d.isMe && <span className="font-normal text-stone-600 dark:text-stone-400">(este)</span>}
        </p>
        <p className="text-sm text-stone-600 dark:text-stone-400">
          Visto {relativeAgo(d.lastSeenAt, now.getTime())} · {d.hasPush ? 'avisos ligados' : 'avisos desligados'}
        </p>
      </div>
      {!d.isMe && (
        <button
          type="button"
          aria-label={`Remover ${d.name}`}
          onClick={onRemove}
          className="grid size-12 place-items-center rounded-xl text-red-700 active:bg-red-100 dark:text-red-400 dark:active:bg-red-950"
        >
          <Trash2 aria-hidden />
        </button>
      )}
    </li>
  )
}
