import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { AlarmClock } from 'lucide-react'
import { axisProps, ChartCard, gridProps, tooltipProps } from '../../components/charts'
import { accidentHotspots, eliminationsByDay } from '../../domain/stats'
import type { Elimination } from '../../domain/types'

/** Gráficos das últimas 4 semanas + horários com mais acidentes. Carregado sob demanda. */
export default function XixiCharts({ eliminations, now }: { eliminations: Elimination[]; now: Date }) {
  const days = eliminationsByDay(eliminations, now, 28)
  const hot = accidentHotspots(eliminations.filter((e) => e.at >= now.getTime() - 28 * 86_400_000))
  const totalAccidents = days.reduce((n, d) => n + d.inside, 0)

  return (
    <div className="flex flex-col gap-4">
      <ChartCard title="Acidentes por dia" subtitle={`Últimas 4 semanas · ${totalAccidents} no total`}>
        <div className="h-44">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={days} margin={{ top: 4, right: 4, left: -28, bottom: 0 }} barCategoryGap={2}>
              <CartesianGrid {...gridProps} />
              <XAxis dataKey="label" {...axisProps} interval={6} />
              <YAxis allowDecimals={false} {...axisProps} axisLine={false} />
              <Tooltip {...tooltipProps} formatter={(v) => [v, 'Acidentes']} />
              <Bar dataKey="inside" name="Acidentes" fill="var(--series-2)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      <ChartCard title="Acerto lá fora" subtitle="% de xixi e cocô feitos lá fora, por dia">
        <div className="h-44">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={days} margin={{ top: 4, right: 8, left: -28, bottom: 0 }}>
              <CartesianGrid {...gridProps} />
              <XAxis dataKey="label" {...axisProps} interval={6} />
              <YAxis domain={[0, 100]} ticks={[0, 50, 100]} {...axisProps} axisLine={false} />
              <Tooltip {...tooltipProps} cursor={{ stroke: 'var(--chart-axis)' }} formatter={(v) => [`${v}%`, 'Lá fora']} />
              <Line
                type="monotone"
                dataKey="outsideRate"
                name="Lá fora"
                stroke="var(--series-1)"
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 5, stroke: 'var(--chart-surface)', strokeWidth: 2 }}
                connectNulls
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      <ChartCard title="Horários com mais acidentes" subtitle="Últimas 4 semanas">
        {hot.length === 0 ? (
          <p className="text-stone-700 dark:text-stone-300">Nenhum acidente no período. Mantenha a agenda!</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {hot.map((h) => (
              <li key={h.hour} className="flex items-center gap-3">
                <AlarmClock aria-hidden className="shrink-0 text-brand-700 dark:text-brand-400" />
                <span className="flex-1">
                  <strong className="tabular">{h.label}</strong>: {h.count} {h.count === 1 ? 'acidente' : 'acidentes'}
                </span>
                <span className="text-sm text-stone-600 dark:text-stone-400">
                  saída às {String(h.hour === 0 ? 23 : h.hour - 1).padStart(2, '0')}:45?
                </span>
              </li>
            ))}
          </ul>
        )}
        {hot.length > 0 && (
          <p className="mt-3 text-sm text-stone-600 dark:text-stone-400">
            Dica: acrescente uma saída uns 15 minutos antes do horário problemático.
          </p>
        )}
      </ChartCard>
    </div>
  )
}
