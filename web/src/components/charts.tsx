// Peças comuns dos gráficos (Recharts). Carregado sob demanda junto com as telas de gráfico.
import type { ReactNode } from 'react'

export const axisProps = {
  stroke: 'var(--chart-grid)',
  tick: { fill: 'var(--chart-axis)', fontSize: 12 },
  tickLine: false,
} as const

export const gridProps = { stroke: 'var(--chart-grid)', vertical: false } as const

export const tooltipProps = {
  cursor: { fill: 'var(--chart-grid)', opacity: 0.5 },
  contentStyle: {
    background: 'var(--chart-surface)',
    border: '1px solid var(--chart-grid)',
    borderRadius: 12,
    color: 'var(--chart-axis)',
    fontSize: 14,
  },
  labelStyle: { color: 'inherit', fontWeight: 700 },
  itemStyle: { color: 'inherit' },
} as const

export function ChartCard({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <figure className="rounded-3xl bg-white p-4 shadow-sm ring-1 ring-stone-200 dark:bg-stone-900 dark:ring-stone-800">
      <figcaption className="mb-3">
        <span className="block text-lg font-bold">{title}</span>
        {subtitle && <span className="block text-sm text-stone-600 dark:text-stone-400">{subtitle}</span>}
      </figcaption>
      {children}
    </figure>
  )
}

export function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-sm text-stone-700 dark:text-stone-300">
      <span aria-hidden className="inline-block size-3 rounded-sm" style={{ background: color }} />
      {label}
    </span>
  )
}
