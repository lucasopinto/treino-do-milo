import { Link } from 'react-router'
import { ArrowUpCircle, ChevronRight, Lock, Star } from 'lucide-react'
import { PageHeader, ProgressBar } from '../../components/ui'
import { useSkillsOverview } from '../../hooks/useSkills'
import { LEVEL_STAGES, METHOD_BASICS, SKILLS, getSkill, TRICK_ORDER } from '../../content/skills'
import type { TrickState } from '../../domain/progress'
import type { SkillContent } from '../../content/skills'

const trickBadge: Record<TrickState, { text: string; cls: string }> = {
  firme: { text: 'Firme', cls: 'bg-green-100 text-green-900 dark:bg-green-950 dark:text-green-200' },
  treinando: { text: 'Truque da vez', cls: 'bg-brand-100 text-brand-900 dark:bg-brand-900 dark:text-brand-100' },
  sugerido: { text: 'Comece este', cls: 'bg-brand-100 text-brand-900 dark:bg-brand-900 dark:text-brand-100' },
  bloqueado: { text: 'Depois', cls: 'bg-stone-200 text-stone-700 dark:bg-stone-800 dark:text-stone-300' },
}

export function ProgressoPage() {
  const { status, tricks } = useSkillsOverview()
  const toAdvance = SKILLS.filter((s) => status[s.id].suggestAdvance)

  return (
    <>
      <PageHeader title="Progresso" subtitle="Cada comando tem 4 níveis. O último é o “Firme”." />
      <div className="flex flex-col gap-5">
        {toAdvance.length > 0 && (
          <section className="rounded-3xl bg-green-700 p-4 text-white" aria-label="Prontos para avançar">
            <p className="flex items-center gap-2 text-lg font-bold">
              <ArrowUpCircle aria-hidden /> Pronto para o próximo nível
            </p>
            <ul className="mt-2 flex flex-wrap gap-2">
              {toAdvance.map((s) => (
                <li key={s.id}>
                  <Link to={`/progresso/${s.id}`} className="inline-flex min-h-12 items-center rounded-full bg-white/20 px-4 font-semibold active:bg-white/30">
                    {s.name}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section aria-label="Comandos">
          <h2 className="mb-2 text-lg font-bold">Comandos</h2>
          <ul className="flex flex-col gap-2">
            {SKILLS.filter((s) => s.kind === 'comando').map((s) => (
              skillRow(s)
            ))}
          </ul>
        </section>

        <section aria-label="Truques">
          <h2 className="mb-1 text-lg font-bold">Truques</h2>
          <p className="mb-2 text-sm text-stone-600 dark:text-stone-400">
            Um de cada vez: o próximo só é sugerido quando o anterior fica firme.
          </p>
          <ul className="flex flex-col gap-2">
            {TRICK_ORDER.map((id) => (
              skillRow(getSkill(id), tricks[id])
            ))}
          </ul>
        </section>

        <details className="rounded-2xl bg-white p-4 ring-1 ring-stone-200 dark:bg-stone-900 dark:ring-stone-800">
          <summary className="min-h-12 cursor-pointer content-center text-lg font-bold">Como funciona o método</summary>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            {METHOD_BASICS.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </details>
      </div>
    </>
  )

  // Função de renderização (não componente), para não remontar a cada atualização.
  function skillRow(skill: SkillContent, trick?: TrickState) {
    const st = status[skill.id]
    const badge = trick ? trickBadge[trick] : null
    return (
      <li key={skill.id}>
        <Link
          to={`/progresso/${skill.id}`}
          className={`flex min-h-16 items-center gap-3 rounded-2xl bg-white p-3 ring-1 ring-stone-200 active:bg-stone-100 dark:bg-stone-900 dark:ring-stone-800 dark:active:bg-stone-800 ${trick === 'bloqueado' ? 'opacity-70' : ''}`}
        >
          <span className="min-w-0 flex-1">
            <span className="flex flex-wrap items-center gap-2">
              <span className="font-bold">{skill.name}</span>
              {badge && (
                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold ${badge.cls}`}>
                  {trick === 'bloqueado' && <Lock aria-hidden size={12} />}
                  {(trick === 'sugerido' || trick === 'treinando') && <Star aria-hidden size={12} />}
                  {badge.text}
                </span>
              )}
            </span>
            <span className="mt-0.5 block text-sm text-stone-600 dark:text-stone-400">
              {st.firm
                ? 'Nível 4 · Firme ✓'
                : `Nível ${st.levelIndex + 1} · ${LEVEL_STAGES[st.levelIndex]} · ${Math.min(st.streak, 3)} de 3 sessões boas`}
            </span>
            <span className="mt-2 block">
              <ProgressBar value={st.progress} label={`Progresso de ${skill.name}`} />
            </span>
          </span>
          <ChevronRight aria-hidden className="shrink-0 text-stone-500" />
        </Link>
      </li>
    )
  }
}
