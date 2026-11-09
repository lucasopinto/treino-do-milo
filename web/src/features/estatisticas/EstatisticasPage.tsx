import { useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Empty, PageHeader, Segmented } from '../../components/ui'
import { axisProps, ChartCard, gridProps, tooltipProps } from '../../components/charts'
import { useActivities, useEliminations, useSessions, useSettings } from '../../hooks/useData'
import { useTrainer } from '../../hooks/useTrainer'
import { periodBuckets, rateBySkill, statsByPeriod, trainerComparison, type PeriodMode, type PeriodStats } from '../../domain/stats'
import { getSkill, SKILLS } from '../../content/skills'

/** Tela de gráficos (carregada sob demanda, junto com o Recharts). */
export default function EstatisticasPage() {
  const now = useMemo(() => new Date(), [])
  const settings = useSettings()
  const { trainers } = useTrainer()
  const [mode, setMode] = useState<PeriodMode>('semana')
  const buckets = useMemo(() => periodBuckets(now, mode, mode === 'semana' ? 8 : 6), [now, mode])
  const since = buckets[0]!.start
  const sessions = useSessions(since)
  const eliminations = useEliminations(since)
  const activities = useActivities(since)

  if (!sessions || !eliminations || !activities) return <PageHeader title="Estatísticas" subtitle="Carregando…" />

  const data = { sessions, eliminations, activities }
  const periods = statsByPeriod(buckets, data, now)
  const bySkill = rateBySkill(sessions).sort(
    (a, b) => SKILLS.findIndex((s) => s.id === a.skillId) - SKILLS.findIndex((s) => s.id === b.skillId),
  )
  const people = trainerComparison(trainers, data, since)
  const periodWord = mode === 'semana' ? 'semana' : 'mês'
  const rangeText = mode === 'semana' ? 'Últimas 8 semanas' : 'Últimos 6 meses'

  return (
    <>
      <PageHeader title="Estatísticas" subtitle={rangeText} />
      <div className="flex flex-col gap-4">
        <Segmented
          label="Agrupar por"
          value={mode}
          onChange={setMode}
          options={[
            { value: 'semana', label: 'Por semana' },
            { value: 'mes', label: 'Por mês' },
          ]}
        />

        <PeriodBarChart
          title="Sessões de treino"
          subtitle={`Quantidade por ${periodWord}`}
          periods={periods}
          dataKey="sessions"
          name="Sessões"
          color="var(--series-1)"
        />

        <ChartCard title="Taxa de acerto por comando" subtitle={rangeText}>
          {bySkill.length === 0 ? (
            <Empty>Sem sessões no período.</Empty>
          ) : (
            <ul className="flex flex-col gap-3">
              {bySkill.map((r) => (
                <li key={r.skillId}>
                  <div className="mb-1 flex justify-between gap-2 text-sm">
                    <span className="font-semibold">{getSkill(r.skillId).name}</span>
                    <span className="tabular text-stone-600 dark:text-stone-400">
                      <strong className="text-stone-900 dark:text-stone-100">{r.rate === null ? '–' : `${r.rate}%`}</strong> · {r.sessions}{' '}
                      {r.sessions === 1 ? 'sessão' : 'sessões'}
                    </span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-stone-200 dark:bg-stone-800" aria-hidden>
                    <div className="h-full rounded-full" style={{ width: `${r.rate ?? 0}%`, background: 'var(--series-1)' }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </ChartCard>

        <PeriodBarChart
          title="Acidentes dentro de casa"
          subtitle={`Quantidade por ${periodWord} · quanto menor, melhor`}
          periods={periods}
          dataKey="accidents"
          name="Acidentes"
          color="var(--series-2)"
          extraColumn={{ label: '% lá fora', get: (p) => (p.outsideRate === null ? '–' : `${p.outsideRate}%`) }}
        />

        <PeriodBarChart
          title="Atividade física"
          subtitle={`Média de minutos por dia em cada ${periodWord} · linha = meta`}
          periods={periods}
          dataKey="activityPerDay"
          name="Min/dia"
          color="var(--series-1)"
          goal={settings.activityGoalMin}
        />

        <ChartCard title={`${trainers.map((t) => t.name).join(' × ')}`} subtitle={rangeText}>
          <div className="-mx-1 overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="text-stone-600 dark:text-stone-400">
                  <th className="px-1 py-2 font-semibold"></th>
                  {people.map((p) => (
                    <th key={p.trainerId} className="px-1 py-2 text-right text-base font-bold text-stone-900 dark:text-stone-100">
                      {p.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200 dark:divide-stone-800">
                <CompareRow label="Sessões" values={people.map((p) => p.sessions)} best="max" />
                <CompareRow label="Minutos de treino" values={people.map((p) => p.trainingMin)} best="max" />
                <CompareRow label="Taxa de acerto" values={people.map((p) => p.hitRate)} suffix="%" best="max" />
                <CompareRow label="Xixi/cocô registrados" values={people.map((p) => p.eliminations)} />
                <CompareRow label="% lá fora" values={people.map((p) => p.outsideRate)} suffix="%" best="max" />
                <CompareRow label="Min de atividade" values={people.map((p) => p.activityMin)} best="max" />
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-sm text-stone-600 dark:text-stone-400">
            Não é competição: taxas muito diferentes podem indicar que um pede o comando de um jeito diferente do outro.
          </p>
        </ChartCard>
      </div>
    </>
  )
}

function CompareRow({
  label,
  values,
  suffix = '',
  best,
}: {
  label: string
  values: (number | null)[]
  suffix?: string
  best?: 'max'
}) {
  const nums = values.filter((v): v is number => v !== null)
  const top = best && nums.length > 1 && new Set(nums).size > 1 ? Math.max(...nums) : null
  return (
    <tr>
      <th scope="row" className="px-1 py-2 font-medium">
        {label}
      </th>
      {values.map((v, i) => (
        <td key={i} className={`px-1 py-2 text-right text-base tabular ${v !== null && v === top ? 'font-bold' : ''}`}>
          {v === null ? '–' : `${v}${suffix}`}
        </td>
      ))}
    </tr>
  )
}

function PeriodBarChart({
  title,
  subtitle,
  periods,
  dataKey,
  name,
  color,
  goal,
  extraColumn,
}: {
  title: string
  subtitle: string
  periods: PeriodStats[]
  dataKey: keyof PeriodStats
  name: string
  color: string
  goal?: number
  extraColumn?: { label: string; get: (p: PeriodStats) => string }
}) {
  return (
    <ChartCard title={title} subtitle={subtitle}>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={periods} margin={{ top: 8, right: 4, left: -24, bottom: 0 }} barCategoryGap="20%">
            <CartesianGrid {...gridProps} />
            <XAxis dataKey="label" {...axisProps} />
            <YAxis allowDecimals={false} {...axisProps} axisLine={false} />
            <Tooltip {...tooltipProps} formatter={(v) => [v, name]} />
            {goal !== undefined && (
              <ReferenceLine y={goal} stroke="var(--chart-axis)" strokeDasharray="4 4" ifOverflow="extendDomain" />
            )}
            <Bar dataKey={dataKey} name={name} fill={color} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <details className="mt-2">
        <summary className="min-h-12 cursor-pointer content-center text-sm font-semibold text-stone-700 dark:text-stone-300">
          Ver números
        </summary>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-stone-600 dark:text-stone-400">
              <th className="py-1 font-semibold">Período</th>
              <th className="py-1 text-right font-semibold">{name}</th>
              {extraColumn && <th className="py-1 text-right font-semibold">{extraColumn.label}</th>}
            </tr>
          </thead>
          <tbody>
            {periods.map((p) => (
              <tr key={p.label} className="border-t border-stone-200 dark:border-stone-800">
                <td className="py-1">{p.label}</td>
                <td className="py-1 text-right tabular">{String(p[dataKey] ?? '–')}</td>
                {extraColumn && <td className="py-1 text-right tabular">{extraColumn.get(p)}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </ChartCard>
  )
}
