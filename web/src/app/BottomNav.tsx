import { NavLink } from 'react-router'
import { Droplet, House, Menu, Timer, Trophy, type LucideIcon } from 'lucide-react'

const items: { to: string; label: string; icon: LucideIcon }[] = [
  { to: '/', label: 'Painel', icon: House },
  { to: '/treino', label: 'Treino', icon: Timer },
  { to: '/xixi', label: 'Xixi', icon: Droplet },
  { to: '/progresso', label: 'Progresso', icon: Trophy },
  { to: '/mais', label: 'Mais', icon: Menu },
]

export function BottomNav() {
  return (
    <nav
      aria-label="Navegação principal"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-stone-200 bg-white/95 backdrop-blur pb-safe dark:border-stone-800 dark:bg-stone-900/95"
    >
      <ul className="mx-auto flex max-w-lg">
        {items.map(({ to, label, icon: Icon }) => (
          <li key={to} className="flex-1">
            <NavLink
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex min-h-16 flex-col items-center justify-center gap-0.5 text-sm font-semibold transition ${
                  isActive ? 'text-brand-700 dark:text-brand-400' : 'text-stone-600 dark:text-stone-400'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={`grid h-8 w-14 place-items-center rounded-full transition ${isActive ? 'bg-brand-100 dark:bg-brand-900/60' : ''}`}
                  >
                    <Icon aria-hidden size={24} strokeWidth={isActive ? 2.5 : 2} />
                  </span>
                  {label}
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
