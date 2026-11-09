import { Link, useNavigate, useParams } from 'react-router'
import { ArrowLeft, ArrowUpCircle, CheckCircle2, Lightbulb, Lock, Play, Target } from 'lucide-react'
import { Button, Card, Empty, ProgressBar } from '../../components/ui'
import { useToast } from '../../components/Toast'
import { useSkillsOverview } from '../../hooks/useSkills'
import { useSessions } from '../../hooks/useData'
import { useTrainer, useTrainerName } from '../../hooks/useTrainer'
import { setSkillLevel } from '../../db/repo'
import { ADVANCE_RULE, LEVEL_STAGES, SKILLS, TRICK_ORDER, getSkill } from '../../content/skills'
import { isGoodSession, qualifies, sessionRate } from '../../domain/progress'
import { formatHM, relativeDayLabel } from '../../domain/dates'
import { feedbackOk } from '../../lib/feedback'
import type { SkillId } from '../../domain/types'

export function SkillDetailPage() {
  const { skillId } = useParams()
  const skill = SKILLS.find((s) => s.id === skillId)
  if (!skill) return <Empty>Comando não encontrado.</Empty>
  return <Detail id={skill.id} />
}

function Detail({ id }: { id: SkillId }) {
  const skill = getSkill(id)
  const { status, tricks } = useSkillsOverview()
  const st = status[id]
  const { trainer } = useTrainer()
  const name = useTrainerName()
  const toast = useToast()
  const navigate = useNavigate()
  const sessions = (useSessions(0) ?? []).filter((s) => s.skillId === id).slice(-8).reverse()
  // O truque "da vez" é o primeiro da ordem que ainda não está firme.
  const currentTrick = TRICK_ORDER.find((t) => tricks[t] === 'sugerido' || tricks[t] === 'treinando')
  const blockedBy = tricks[id] === 'bloqueado' && currentTrick ? getSkill(currentTrick) : null

  async function changeLevel(to: number) {
    await setSkillLevel(id, to, trainer.id)
    feedbackOk()
    toast(to > st.levelIndex ? `Subiu para o nível ${to + 1}! Comece fácil no lugar novo.` : `Voltou para o nível ${to + 1}.`)
  }

  return (
    <div className="flex flex-col gap-4 pt-2">
      <Link to="/progresso" className="inline-flex min-h-12 items-center gap-2 self-start font-semibold text-stone-700 dark:text-stone-300">
        <ArrowLeft aria-hidden size={20} /> Progresso
      </Link>

      <header>
        <h1 className="text-3xl font-bold">{skill.name}</h1>
        <p className="mt-1 text-stone-700 dark:text-stone-300">{skill.summary}</p>
        <p className="mt-1 text-sm text-stone-600 dark:text-stone-400">Como pedir: {skill.cue}</p>
      </header>

      {blockedBy && (
        <p className="flex gap-3 rounded-2xl bg-stone-200 p-4 dark:bg-stone-800">
          <Lock aria-hidden className="mt-0.5 shrink-0" />
          Sugestão: deixe “{blockedBy.name}” firme antes de começar este truque. Um truque de cada vez rende mais.
        </p>
      )}

      <Card>
        <p className="font-bold">
          {st.firm ? 'Firme ✓' : `Nível ${st.levelIndex + 1} de 4 · ${LEVEL_STAGES[st.levelIndex]}`}
        </p>
        <div className="my-3">
          <ProgressBar value={st.progress} label={`Progresso de ${skill.name}`} />
        </div>
        {!st.firm && (
          <p className="text-stone-700 dark:text-stone-300">
            {Math.min(st.streak, 3)} de 3 sessões boas seguidas neste nível.
          </p>
        )}
        <Button className="mt-3 w-full" size="lg" icon={<Play aria-hidden />} onClick={() => navigate(`/treino?comando=${id}`)}>
          Treinar agora
        </Button>
      </Card>

      {st.suggestAdvance && (
        <section className="rounded-3xl bg-green-700 p-4 text-white">
          <p className="flex items-center gap-2 text-lg font-bold">
            <ArrowUpCircle aria-hidden /> Pronto para o nível {st.levelIndex + 2}!
          </p>
          <p className="mt-1">3 sessões seguidas com 80% ou mais. Vocês decidem: se acharam que foi sorte, treinem mais um pouco.</p>
          <Button tone="neutral" size="lg" className="mt-3 w-full" onClick={() => void changeLevel(st.levelIndex + 1)}>
            Avançar para “{skill.levels[st.levelIndex + 1]?.name}”
          </Button>
        </section>
      )}

      <section aria-label="Níveis">
        <h2 className="mb-2 text-lg font-bold">Níveis</h2>
        <ol className="flex flex-col gap-2">
          {skill.levels.map((lvl, i) => {
            const current = i === st.levelIndex
            const done = i < st.levelIndex
            return (
              <li key={i}>
                <details open={current} className={`rounded-2xl p-4 ring-2 ${current ? 'bg-white ring-brand-600 dark:bg-stone-900' : 'bg-white ring-stone-200 dark:bg-stone-900 dark:ring-stone-800'}`}>
                  <summary className="flex min-h-12 cursor-pointer items-center gap-2">
                    {done ? <CheckCircle2 aria-label="concluído" className="shrink-0 text-green-700 dark:text-green-400" /> : <span className="grid size-6 shrink-0 place-items-center rounded-full bg-stone-200 text-sm font-bold dark:bg-stone-700">{i + 1}</span>}
                    <span className="flex-1">
                      <span className="block font-bold">{lvl.name}</span>
                      <span className="block text-sm text-stone-600 dark:text-stone-400">
                        {LEVEL_STAGES[i]}
                        {current && ' · nível atual'}
                      </span>
                    </span>
                  </summary>
                  <div className="mt-3 flex flex-col gap-3">
                    <div>
                      <h3 className="font-semibold">Como treinar</h3>
                      <ol className="mt-1 list-decimal space-y-1.5 pl-5">
                        {lvl.steps.map((s) => (
                          <li key={s}>{s}</li>
                        ))}
                      </ol>
                    </div>
                    <p className="flex gap-2 rounded-xl bg-green-50 p-3 text-green-950 dark:bg-green-950 dark:text-green-100">
                      <Target aria-hidden className="mt-0.5 shrink-0" />
                      <span>
                        <strong>Conta como acerto:</strong> {lvl.success}
                      </span>
                    </p>
                    {i < 3 && (
                      <p className="text-sm text-stone-600 dark:text-stone-400">
                        <strong>Quando avançar:</strong> {ADVANCE_RULE}
                      </p>
                    )}
                    {!current && (
                      <Button tone="neutral" onClick={() => void changeLevel(i)}>
                        {i < st.levelIndex ? 'Voltar para este nível' : 'Pular para este nível'}
                      </Button>
                    )}
                  </div>
                </details>
              </li>
            )
          })}
        </ol>
      </section>

      {skill.tips.length > 0 && (
        <Card>
          <h2 className="mb-1 flex items-center gap-2 font-bold">
            <Lightbulb aria-hidden size={20} /> Dicas
          </h2>
          <ul className="list-disc space-y-1 pl-5">
            {skill.tips.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </Card>
      )}

      <Card>
        <h2 className="mb-2 font-bold">Últimas sessões</h2>
        {sessions.length === 0 ? (
          <Empty>Nenhuma sessão deste comando ainda.</Empty>
        ) : (
          <ul className="divide-y divide-stone-200 dark:divide-stone-800">
            {sessions.map((s) => {
              const rate = sessionRate(s)
              return (
                <li key={s.id} className="flex items-center gap-3 py-2">
                  <span className="w-20 shrink-0 text-sm">
                    {relativeDayLabel(s.startedAt, new Date())}
                    <br />
                    {formatHM(s.startedAt)}
                  </span>
                  <span className="flex-1 text-sm">
                    Nível {s.levelIndex + 1} · {s.hits} acertos, {s.misses} erros · {name(s.trainerId)}
                  </span>
                  <span
                    className={`text-lg font-bold tabular ${isGoodSession(s) ? 'text-green-700 dark:text-green-400' : ''}`}
                    title={qualifies(s) ? undefined : 'Poucas tentativas: não conta para avançar'}
                  >
                    {rate === null ? '–' : `${Math.round(rate * 100)}%`}
                    {!qualifies(s) && <span className="text-xs font-normal">*</span>}
                  </span>
                </li>
              )
            })}
          </ul>
        )}
        {sessions.some((s) => !qualifies(s)) && (
          <p className="mt-2 text-xs text-stone-600 dark:text-stone-400">* menos de 5 tentativas: não conta para avançar.</p>
        )}
      </Card>
    </div>
  )
}
