import { useRef, useState } from 'react'
import { Download, Share2, Upload } from 'lucide-react'
import { Button, Sheet } from '../../components/ui'
import { useToast } from '../../components/Toast'
import { backupFileName, exportBackup, importBackup, validateBackup, type BackupFile } from '../../db/backup'
import { feedbackOk } from '../../lib/feedback'
import { markFullResync } from '../../sync/controller'

async function makeFile(): Promise<File> {
  const data = await exportBackup()
  return new File([JSON.stringify(data)], backupFileName(), { type: 'application/json' })
}

export function BackupSection() {
  const toast = useToast()
  const input = useRef<HTMLInputElement>(null)
  const [pending, setPending] = useState<BackupFile | null>(null)
  const canShareFiles = typeof navigator !== 'undefined' && 'canShare' in navigator

  async function share() {
    try {
      const file = await makeFile()
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: 'Backup Treino do Milo' })
        return
      }
      download(file)
    } catch (e) {
      if ((e as Error).name !== 'AbortError') toast('Não foi possível compartilhar. Tente "Baixar arquivo".', { tone: 'warn' })
    }
  }

  function download(file: File) {
    const url = URL.createObjectURL(file)
    const a = document.createElement('a')
    a.href = url
    a.download = file.name
    document.body.append(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 5000)
    toast(`Backup salvo: ${file.name}`)
  }

  async function onFile(f: File | undefined) {
    if (!f) return
    try {
      const parsed = validateBackup(JSON.parse(await f.text()))
      setPending(parsed)
    } catch (e) {
      toast(e instanceof SyntaxError ? 'Arquivo inválido.' : (e as Error).message, { tone: 'warn', ms: 6000 })
    } finally {
      if (input.current) input.current.value = ''
    }
  }

  async function doImport(mode: 'mesclar' | 'substituir') {
    if (!pending) return
    if (mode === 'substituir' && !window.confirm('Isso apaga todos os dados deste celular e coloca os do backup. Continuar?')) return
    const r = await importBackup(pending, mode)
    // Registros importados de outro celular também vão para a casa (se houver).
    markFullResync()
    feedbackOk()
    setPending(null)
    toast(mode === 'substituir' ? 'Dados substituídos pelo backup.' : `Pronto: ${r.added} novos, ${r.updated} atualizados.`)
  }

  const count = pending
    ? pending.data.sessions.length + pending.data.eliminations.length + pending.data.activities.length
    : 0

  return (
    <div className="flex flex-col gap-3">
      <p className="text-stone-600 dark:text-stone-400">
        Guarde uma cópia dos dados ou passe para o outro celular (pelo WhatsApp, e-mail ou Drive) e importe lá.
      </p>
      {canShareFiles && (
        <Button tone="brand" size="lg" icon={<Share2 aria-hidden />} onClick={() => void share()}>
          Enviar backup
        </Button>
      )}
      <div className="grid grid-cols-2 gap-3">
        <Button tone="neutral" icon={<Download aria-hidden size={20} />} onClick={() => void makeFile().then(download)}>
          Baixar arquivo
        </Button>
        <Button tone="neutral" icon={<Upload aria-hidden size={20} />} onClick={() => input.current?.click()}>
          Importar
        </Button>
      </div>
      <input
        ref={input}
        type="file"
        accept="application/json,.json"
        className="hidden"
        aria-hidden
        tabIndex={-1}
        onChange={(e) => void onFile(e.target.files?.[0])}
      />

      <Sheet open={pending !== null} onClose={() => setPending(null)} title="Importar backup">
        {pending && (
          <div className="flex flex-col gap-4">
            <p>
              Backup de <strong>{new Date(pending.exportedAt).toLocaleString('pt-BR')}</strong> com {count} registros.
            </p>
            <Button size="lg" onClick={() => void doImport('mesclar')}>
              Juntar com os dados deste celular
            </Button>
            <p className="-mt-2 text-sm text-stone-600 dark:text-stone-400">
              Recomendado. Nada se perde; se o mesmo registro foi editado nos dois, vale a edição mais recente.
            </p>
            <Button tone="red" onClick={() => void doImport('substituir')}>
              Substituir tudo pelo backup
            </Button>
          </div>
        )}
      </Sheet>
    </div>
  )
}
