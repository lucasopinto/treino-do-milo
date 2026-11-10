import { useEffect, useState } from 'react'
import { audioDiagnostics, type AudioDiagnostics as Diag } from '../../lib/audio'
import { isIOS, isStandalone } from '../../lib/pwa'

function platform(): string {
  const ua = navigator.userAgent
  const os = isIOS() ? 'iOS' : /android/i.test(ua) ? 'Android' : /windows/i.test(ua) ? 'Windows' : /mac os/i.test(ua) ? 'macOS' : 'outro'
  const ver = /OS (\d+[_.]\d+)/.exec(ua)?.[1]?.replace('_', '.') ?? /Android (\d+(\.\d+)?)/.exec(ua)?.[1] ?? ''
  return `${os}${ver ? ` ${ver}` : ''} · ${isStandalone() ? 'app instalado' : 'navegador'}`
}

const time = (ms: number | null | undefined) => (ms ? new Date(ms).toLocaleTimeString('pt-BR') : '—')

/**
 * Diagnóstico do som, escondido: aparece ao tocar 5 vezes no título "Sons do clicker".
 * Serve para mandar um print se o som voltar a falhar.
 */
export function AudioDiagnostics() {
  const [d, setD] = useState<Diag>(audioDiagnostics)
  useEffect(() => {
    const id = window.setInterval(() => setD(audioDiagnostics()), 1000)
    return () => window.clearInterval(id)
  }, [])
  const rows: [string, string][] = [
    ['Plataforma', platform()],
    ['navigator.audioSession', d.audioSession === null ? 'não existe' : `existe · type = ${d.audioSession}`],
    ['Tocar no silencioso', d.playInSilentMode ? 'ligado' : 'desligado'],
    ['AudioContext', d.contextState ?? 'ainda não criado'],
    ['audioHealthy()', d.healthy ? 'sim' : 'não'],
    ['stale', d.stale ? 'sim (recria no próximo toque)' : 'não'],
    ['Criado às', time(d.createdAt)],
    ['Último erro', d.lastError ? `${time(d.lastError.at)} · ${d.lastError.where} · ${d.lastError.message}` : 'nenhum'],
  ]
  return (
    <div className="mt-4 rounded-xl bg-stone-100 p-3 font-mono text-xs dark:bg-stone-800" aria-label="Diagnóstico do som">
      <p className="mb-2 font-sans text-sm font-bold">Diagnóstico do som</p>
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
        {rows.map(([k, v]) => (
          <div key={k} className="contents">
            <dt className="text-stone-600 dark:text-stone-400">{k}</dt>
            <dd className="break-words">{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
