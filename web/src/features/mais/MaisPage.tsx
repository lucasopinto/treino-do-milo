import { Link } from 'react-router'
import { BarChart3, ChevronRight, Footprints, History, ListChecks, MousePointerClick, Settings, type LucideIcon } from 'lucide-react'
import { PageHeader } from '../../components/ui'
import { isIOS, isStandalone } from '../../lib/pwa'

const items: { to: string; label: string; desc: string; icon: LucideIcon }[] = [
  { to: '/atividade', label: 'Atividade física', desc: 'Cronômetro de passeio e brincadeira, meta do dia', icon: Footprints },
  { to: '/checklist', label: 'Nada é de graça', desc: 'Checklist diário', icon: ListChecks },
  { to: '/historico', label: 'Histórico', desc: 'Tudo o que foi registrado, com filtros', icon: History },
  { to: '/estatisticas', label: 'Estatísticas', desc: 'Gráficos semanais e mensais, Lucas × Pai', icon: BarChart3 },
  { to: '/clicker', label: 'Clicker', desc: 'Clicker em tela cheia', icon: MousePointerClick },
  { to: '/configuracoes', label: 'Configurações', desc: 'Cachorro, treinadores, horários, sons, backup', icon: Settings },
]

export function MaisPage() {
  return (
    <>
      <PageHeader title="Mais" />
      <ul className="flex flex-col gap-2">
        {items.map(({ to, label, desc, icon: Icon }) => (
          <li key={to}>
            <Link
              to={to}
              className="flex min-h-16 items-center gap-4 rounded-2xl bg-white p-3 ring-1 ring-stone-200 active:bg-stone-100 dark:bg-stone-900 dark:ring-stone-800 dark:active:bg-stone-800"
            >
              <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-brand-100 text-brand-800 dark:bg-brand-900 dark:text-brand-100">
                <Icon aria-hidden />
              </span>
              <span className="flex-1">
                <span className="block font-bold">{label}</span>
                <span className="block text-sm text-stone-600 dark:text-stone-400">{desc}</span>
              </span>
              <ChevronRight aria-hidden className="text-stone-500" />
            </Link>
          </li>
        ))}
      </ul>
      {!isStandalone() && (
        <p className="mt-4 rounded-2xl bg-sky-100 p-4 text-sky-950 dark:bg-sky-950 dark:text-sky-100">
          <strong>Instale o app:</strong>{' '}
          {isIOS()
            ? 'no Safari, toque em Compartilhar e depois em “Adicionar à Tela de Início”.'
            : 'no Chrome, toque no menu ⋮ e depois em “Instalar app” ou “Adicionar à tela inicial”.'}
        </p>
      )}
    </>
  )
}
