'use client'

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { type EntityRow, type Status, dailyTrend } from '@/lib/mockData'
import { formatCurrency, formatNumber, getCplClass } from '@/lib/formatters'
import { cn } from '@/lib/utils'
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  Tooltip,
} from 'recharts'

interface DetailDrawerProps {
  row: EntityRow | null
  open: boolean
  onClose: () => void
}

const statusLabel: Record<Status, string> = {
  active: 'Ativo',
  paused: 'Pausado',
  review: 'Em análise',
  rejected: 'Rejeitado',
  error: 'Com erro',
}

const statusBadgeClass: Record<Status, string> = {
  active: 'badge-active',
  paused: 'badge-paused',
  review: 'badge-review',
  rejected: 'badge-rejected',
  error: 'badge-error',
}

export function DetailDrawer({ row, open, onClose }: DetailDrawerProps) {
  if (!row) return null

  const chartData = dailyTrend.slice(0, 14).map((d, i) => ({
    ...d,
    spend: d.spend * (0.1 + (i % 3) * 0.1),
  }))

  const metrics = [
    { label: 'Investimento', value: formatCurrency(row.spend) },
    { label: 'Resultados', value: formatNumber(row.results) },
    { label: 'Custo/Resultado', value: formatCurrency(row.costPerResult), className: getCplClass(row.costPerResult, 20) },
    { label: 'Alcance', value: formatNumber(row.reach) },
    { label: 'Frequência', value: `${row.frequency.toFixed(1)}x` },
    { label: 'Impressões', value: formatNumber(row.impressions) },
    { label: 'Orçamento/dia', value: formatCurrency(row.budget) },
    { label: 'Objetivo', value: row.objective },
  ]

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-full sm:w-[440px] bg-card border-l border-border overflow-y-auto">
        <SheetHeader className="pb-4">
          <SheetTitle className="text-foreground text-lg">{row.name}</SheetTitle>
          <div className="flex items-center gap-2 mt-1">
            <span className={cn(
              'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border',
              statusBadgeClass[row.status]
            )}>
              {statusLabel[row.status]}
            </span>
            <span className="text-xs text-muted-foreground">{row.id}</span>
          </div>
        </SheetHeader>

        {/* Mini chart */}
        <div className="mb-6">
          <p className="text-xs text-muted-foreground mb-2">Spend ao longo do tempo</p>
          <div className="h-[120px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="spendGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(172, 66%, 50%)" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="hsl(172, 66%, 50%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" hide />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(222, 16%, 14%)',
                    border: '1px solid hsl(222, 14%, 18%)',
                    borderRadius: '6px',
                    fontSize: '11px',
                    color: 'hsl(210, 20%, 92%)',
                  }}
                  formatter={(v: number | undefined) => v !== undefined ? formatCurrency(v) : ''}
                />
                <Area
                  type="monotone"
                  dataKey="spend"
                  stroke="hsl(172, 66%, 50%)"
                  fill="url(#spendGrad)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Metrics grid */}
        <div className="grid grid-cols-2 gap-3">
          {metrics.map((m) => (
            <div key={m.label} className="bg-secondary/50 rounded-md p-3">
              <p className="text-xs text-muted-foreground">{m.label}</p>
              <p className={cn('text-sm font-semibold mt-0.5', m.className)}>{m.value}</p>
            </div>
          ))}
        </div>

        {/* Breakdown by placement */}
        <div className="mt-6">
          <p className="text-xs text-muted-foreground mb-3">Breakdown por posicionamento</p>
          {[
            { name: 'Feed', pct: 45 },
            { name: 'Stories', pct: 28 },
            { name: 'Reels', pct: 18 },
            { name: 'Outros', pct: 9 },
          ].map((p) => (
            <div key={p.name} className="flex items-center gap-3 mb-2">
              <span className="text-xs text-muted-foreground w-14">{p.name}</span>
              <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-500"
                  style={{ width: `${p.pct}%` }}
                />
              </div>
              <span className="text-xs text-foreground w-10 text-right">{p.pct}%</span>
            </div>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  )
}
