import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Camera, CalendarClock, Minus, Plus, Trash2 } from 'lucide-react'
import { Button, Card, Field, PageHeader, Segmented } from '../../components/ui'
import { useToast } from '../../components/Toast'
import { DogAvatar } from '../../components/DogAvatar'
import { useSettings } from '../../hooks/useData'
import { updateSettings } from '../../db/repo'
import { wipeAll } from '../../db/backup'
import { hasDemo, loadDemo, removeDemo } from '../../seed/demo'
import { getThemePref, setThemePref, type ThemePref } from '../../lib/theme'
import { resizeImage } from '../../lib/image'
import { feedbackOk } from '../../lib/feedback'
import { newId } from '../../lib/ids'
import { OutingScheduleEditor } from '../xixi/OutingScheduleEditor'
import { NotificationBanner } from '../xixi/XixiPage'
import { SoundSettings } from '../clicker/SoundSettings'
import { BackupSection } from './BackupSection'
import { sortOutings } from '../../domain/schedule'
import { getSyncConfig, markFullResync } from '../../sync/controller'

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card>
      <h2 className="mb-3 text-lg font-bold">{title}</h2>
      {children}
    </Card>
  )
}

/** Campo de texto que grava ao sair do campo (sem botão salvar). */
function TextSetting({ label, value, onSave }: { label: string; value: string; onSave: (v: string) => void }) {
  const [v, setV] = useState(value)
  useEffect(() => setV(value), [value])
  return (
    <Field label={label}>
      <input
        type="text"
        value={v}
        onChange={(e) => setV(e.target.value)}
        onBlur={() => v.trim() && v.trim() !== value && onSave(v.trim())}
        enterKeyHint="done"
        onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
      />
    </Field>
  )
}

export function ConfiguracoesPage() {
  const settings = useSettings()
  const toast = useToast()
  const photoInput = useRef<HTMLInputElement>(null)
  const [theme, setTheme] = useState<ThemePref>(getThemePref)
  const [editSchedule, setEditSchedule] = useState(false)
  const [demo, setDemo] = useState<boolean | null>(null)

  useEffect(() => {
    void hasDemo().then(setDemo)
  }, [])

  const saved = (msg = 'Salvo.') => {
    feedbackOk()
    toast(msg)
  }

  async function onPhoto(file: File | undefined) {
    if (!file) return
    try {
      await updateSettings({ dogPhoto: await resizeImage(file) })
      saved('Foto atualizada.')
    } catch (e) {
      toast((e as Error).message, { tone: 'warn' })
    }
  }

  return (
    <>
      <PageHeader title="Configurações" />
      <div className="flex flex-col gap-4">
        <Section title="Cachorro">
          <div className="flex items-center gap-4">
            <button type="button" onClick={() => photoInput.current?.click()} aria-label="Trocar foto" className="relative rounded-full">
              <DogAvatar size={88} />
              <span className="absolute -bottom-1 -right-1 grid size-9 place-items-center rounded-full bg-brand-700 text-white ring-2 ring-white dark:ring-stone-900">
                <Camera aria-hidden size={18} />
              </span>
            </button>
            <div className="flex-1">
              <TextSetting label="Nome" value={settings.dogName} onSave={(dogName) => void updateSettings({ dogName }).then(() => saved())} />
            </div>
          </div>
          {settings.dogPhoto && (
            <Button tone="ghost" className="mt-2" onClick={() => void updateSettings({ dogPhoto: null })}>
              Remover foto
            </Button>
          )}
          <input ref={photoInput} type="file" accept="image/*" className="hidden" aria-hidden tabIndex={-1} onChange={(e) => void onPhoto(e.target.files?.[0])} />
        </Section>

        <Section title="Quem treina">
          <div className="flex flex-col gap-3">
            {settings.trainers.map((t) => (
              <div key={t.id} className="flex items-end gap-2">
                <div className="flex-1">
                  <TextSetting
                    label="Nome"
                    value={t.name}
                    onSave={(name) =>
                      void updateSettings({ trainers: settings.trainers.map((x) => (x.id === t.id ? { ...x, name } : x)) }).then(() => saved())
                    }
                  />
                </div>
                {settings.trainers.length > 1 && (
                  <button
                    type="button"
                    aria-label={`Remover ${t.name}`}
                    onClick={() =>
                      window.confirm(`Remover ${t.name}? Os registros antigos continuam no histórico.`) &&
                      void updateSettings({ trainers: settings.trainers.filter((x) => x.id !== t.id) })
                    }
                    className="grid size-12 place-items-center rounded-xl text-red-700 active:bg-red-100 dark:text-red-400 dark:active:bg-red-950"
                  >
                    <Trash2 aria-hidden />
                  </button>
                )}
              </div>
            ))}
            {settings.trainers.length < 4 && (
              <Button
                tone="neutral"
                icon={<Plus aria-hidden size={20} />}
                onClick={() => void updateSettings({ trainers: [...settings.trainers, { id: newId(), name: 'Nova pessoa' }] })}
              >
                Adicionar pessoa
              </Button>
            )}
          </div>
        </Section>

        <Section title="Refeições e saídas">
          <MealTimes />
          <div className="mt-4 flex items-center justify-between gap-2">
            <p className="text-stone-700 dark:text-stone-300">
              {settings.outingTimes.length} saídas: {sortOutings(settings.outingTimes).map((o) => o.time).join(', ')}
            </p>
            <Button tone="neutral" icon={<CalendarClock aria-hidden size={20} />} onClick={() => setEditSchedule(true)}>
              Editar
            </Button>
          </div>
          <label className="mt-4 flex min-h-12 items-center justify-between gap-3">
            <span className="font-semibold">Lembretes de saída</span>
            <input
              type="checkbox"
              checked={settings.remindersEnabled}
              onChange={(e) => void updateSettings({ remindersEnabled: e.target.checked })}
              className="!min-h-0 size-7 accent-brand-700"
            />
          </label>
          <div className="mt-3">
            <NotificationBanner />
          </div>
        </Section>

        <Section title="Meta de atividade física">
          <div className="flex items-center justify-center gap-4">
            <Button
              tone="neutral"
              aria-label="Diminuir 5 minutos"
              icon={<Minus aria-hidden />}
              onClick={() => void updateSettings({ activityGoalMin: Math.max(10, settings.activityGoalMin - 5) })}
            />
            <p className="min-w-32 text-center text-3xl font-bold tabular" aria-live="polite">
              {settings.activityGoalMin} min
            </p>
            <Button
              tone="neutral"
              aria-label="Aumentar 5 minutos"
              icon={<Plus aria-hidden />}
              onClick={() => void updateSettings({ activityGoalMin: Math.min(240, settings.activityGoalMin + 5) })}
            />
          </div>
          <p className="mt-2 text-center text-sm text-stone-600 dark:text-stone-400">por dia</p>
        </Section>

        <Section title="Sons do clicker">
          <SoundSettings />
        </Section>

        <Section title="Aparência">
          <Segmented
            label="Tema"
            value={theme}
            onChange={(t) => {
              setTheme(t)
              setThemePref(t)
            }}
            options={[
              { value: 'auto', label: 'Automático' },
              { value: 'claro', label: 'Claro' },
              { value: 'escuro', label: 'Escuro' },
            ]}
          />
          <p className="mt-2 text-sm text-stone-600 dark:text-stone-400">Automático segue o modo claro/escuro do celular.</p>
        </Section>

        <Section title="Backup e outro celular">
          <BackupSection />
        </Section>

        <Section title="Dados de exemplo">
          <p className="mb-3 text-stone-600 dark:text-stone-400">
            4 semanas de dados inventados para ver os gráficos. Podem ser removidos depois sem afetar os registros reais.
          </p>
          {demo ? (
            <Button
              tone="neutral"
              className="w-full"
              onClick={() => void removeDemo().then((n) => { setDemo(false); saved(`${n} registros de exemplo removidos.`) })}
            >
              Remover dados de exemplo
            </Button>
          ) : (
            <Button tone="neutral" className="w-full" onClick={() => void loadDemo().then(() => { setDemo(true); saved('Dados de exemplo carregados.') })}>
              Carregar dados de exemplo
            </Button>
          )}
        </Section>

        <Section title="Apagar tudo">
          <p className="mb-3 text-stone-600 dark:text-stone-400">
            Apaga todos os dados deste celular. Faça um backup antes.
            {getSyncConfig() && ' Como este celular está numa casa compartilhada, os dados da casa voltam na próxima sincronização. Para sair da casa, use Mais → Casa compartilhada.'}
          </p>
          <Button
            tone="red"
            className="w-full"
            onClick={async () => {
              if (!window.confirm('Apagar TODOS os dados deste celular? Isso não pode ser desfeito.')) return
              if (!window.confirm('Tem certeza? Sem backup, os dados se perdem.')) return
              await wipeAll()
              markFullResync({ resetCursor: true })
              toast('Todos os dados foram apagados.', { tone: 'info' })
              setDemo(false)
            }}
          >
            Apagar todos os dados
          </Button>
        </Section>

        <p className="pb-4 text-center text-sm text-stone-500">Treino do Milo · versão {__APP_VERSION__}</p>
      </div>
      <OutingScheduleEditor open={editSchedule} onClose={() => setEditSchedule(false)} />
    </>
  )
}

function MealTimes() {
  const settings = useSettings()
  const meals = settings.mealTimes
  const save = (list: string[]) => void updateSettings({ mealTimes: list.filter(Boolean).sort() })
  return (
    <div>
      <p className="mb-2 font-semibold">Horários das refeições</p>
      <ul className="flex flex-wrap gap-2">
        {meals.map((m, i) => (
          <li key={`${m}-${i}`} className="flex items-center gap-1">
            <input
              type="time"
              aria-label={`Refeição ${i + 1}`}
              defaultValue={m}
              onBlur={(e) => e.target.value !== m && save(meals.map((x, j) => (j === i ? e.target.value : x)))}
              className="w-32"
            />
            <button
              type="button"
              aria-label={`Remover refeição das ${m}`}
              onClick={() => save(meals.filter((_, j) => j !== i))}
              className="grid size-12 place-items-center rounded-xl text-stone-500 active:bg-stone-200 dark:active:bg-stone-800"
            >
              <Trash2 aria-hidden size={18} />
            </button>
          </li>
        ))}
      </ul>
      <Button tone="neutral" className="mt-2" icon={<Plus aria-hidden size={20} />} onClick={() => save([...meals, '12:00'])}>
        Adicionar refeição
      </Button>
      <p className="mt-2 text-sm text-stone-600 dark:text-stone-400">
        Na agenda de saídas, o botão “Após refeições” cria saídas 20 minutos depois de cada uma.
      </p>
    </div>
  )
}
