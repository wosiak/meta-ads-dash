'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import {
  ResponsiveContainer, ComposedChart, Bar, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts'
import { Megaphone, Layers, FileText, TrendingUp } from 'lucide-react'
import { formatCurrency, formatNumber, formatCompact, getCplClass } from '@/lib/formatters'
import { periodToDates, DEFAULT_PERIOD } from '@/lib/periods'
import { getEntityTrend, type DailyPoint } from '@/app/actions/getEntityTrend'
import type { EntityManagerRow } from './EntityManagerTable'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

// Cores fixas para SVG (CSS vars não funcionam dentro do SVG do Recharts)
const C = {
  muted:   'hsl(215, 15%, 55%)',
  grid:    'hsl(222, 14%, 18%)',
  popover: 'hsl(222, 16%, 14%)',
  border:  'hsl(222, 14%, 18%)',
  fg:      'hsl(210, 20%, 92%)',
  teal:    'hsl(172, 66%, 50%)',
  amber:   'hsl(38, 92%, 50%)',
} as const

// ─── Mapeamento de status ─────────────────────────────────────────────────────

const STATUS_LABEL: Record<string, string> = {
  ACTIVE:          'Ativo',
  PAUSED:          'Pausado',
  CAMPAIGN_PAUSED: 'Camp. Pausada',
  ADSET_PAUSED:    'Conj. Pausado',
  PENDING_REVIEW:  'Em análise',
  IN_PROCESS:      'Em processamento',
  DISAPPROVED:     'Rejeitado',
  WITH_ISSUES:     'Com problemas',
  DELETED:         'Deletado',
  ARCHIVED:        'Arquivado',
}

const STATUS_CLASS: Record<string, string> = {
  ACTIVE:          'badge-active',
  PAUSED:          'badge-paused',
  CAMPAIGN_PAUSED: 'badge-paused',
  ADSET_PAUSED:    'badge-paused',
  PENDING_REVIEW:  'badge-review',
  IN_PROCESS:      'badge-review',
  DISAPPROVED:     'badge-rejected',
  WITH_ISSUES:     'badge-error',
  DELETED:         'badge-paused',
  ARCHIVED:        'badge-paused',
}

// ─── Tooltip customizado ──────────────────────────────────────────────────────

function ChartTooltip({ active, payload, label }: {
  active?: boolean
  payload?: Array<{ name: string; value: number; color: string }>
  label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      backgroundColor: C.popover,
      border: `1px solid ${C.border}`,
      borderRadius: '8px',
      padding: '8px 12px',
      fontSize: '11px',
      color: C.fg,
    }}>
      <p style={{ fontWeight: 600, marginBottom: '6px', color: C.fg }}>{label}</p>
      {payload.map(p => (
        <div key={p.name} style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: p.color, flexShrink: 0 }} />
          <span style={{ color: C.muted }}>{p.name}:</span>
          <span style={{ fontWeight: 700, color: C.fg }}>{formatCurrency(p.value)}</span>
        </div>
      ))}
    </div>
  )
}

// ─── Skeleton do gráfico ──────────────────────────────────────────────────────

function ChartSkeleton() {
  return (
    <div className="h-[180px] w-full rounded-lg bg-secondary/40 animate-pulse flex items-end justify-around px-4 pb-4 gap-1">
      {Array.from({ length: 14 }, (_, i) => (
        <div
          key={i}
          className="bg-secondary/80 rounded-sm w-full"
          style={{ height: `${30 + Math.sin(i * 0.8) * 20 + 20}%` }}
        />
      ))}
    </div>
  )
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface EntityDetailModalProps {
  row: EntityManagerRow | null
  open: boolean
  onClose: () => void
  cplTarget?: number
}

// ─── Componente principal ─────────────────────────────────────────────────────

export function EntityDetailModal({
  row,
  open,
  onClose,
  cplTarget = 20,
}: EntityDetailModalProps) {
  const searchParams = useSearchParams()
  const defaults     = periodToDates(DEFAULT_PERIOD)
  const dateFrom     = searchParams.get('from') ?? defaults.from
  const dateTo       = searchParams.get('to')   ?? defaults.to

  const [trend, setTrend]         = useState<DailyPoint[]>([])
  const [loadingTrend, setLoading] = useState(false)

  useEffect(() => {
    if (!open || !row) return
    setTrend([])
    setLoading(true)
    getEntityTrend(row.id, dateFrom, dateTo)
      .then(setTrend)
      .finally(() => setLoading(false))
  }, [open, row, dateFrom, dateTo])

  if (!row) return null

  // ─── Configuração por tipo de entidade ──────────────────────────────────────

  const typeConfig = {
    campaign: {
      icon:  <Megaphone className="h-3.5 w-3.5" />,
      label: 'Campanha',
      color: 'text-blue-400',
      bg:    'bg-blue-500/10',
    },
    adset: {
      icon:  <Layers className="h-3.5 w-3.5" />,
      label: 'Conjunto',
      color: 'text-purple-400',
      bg:    'bg-purple-500/10',
    },
    ad: {
      icon:  <FileText className="h-3.5 w-3.5" />,
      label: 'Anúncio',
      color: 'text-emerald-400',
      bg:    'bg-emerald-500/10',
    },
  }[row.type]

  // ─── Métricas do grid ────────────────────────────────────────────────────────

  const budget =
    (row.dailyBudget ?? 0) > 0     ? `${formatCurrency(row.dailyBudget!)}/dia` :
    (row.lifetimeBudget ?? 0) > 0  ? `${formatCurrency(row.lifetimeBudget!)} total` :
    '—'

  const baseMetrics = [
    { label: 'Investimento',    value: formatCurrency(row.spend),                                  highlight: false },
    { label: 'Resultados',      value: formatNumber(row.results),                                  highlight: false },
    { label: 'Custo/Resultado', value: row.costPerResult > 0 ? formatCurrency(row.costPerResult) : '—',
      className: row.costPerResult > 0 ? getCplClass(row.costPerResult, cplTarget) : '' },
    { label: 'CTR',             value: `${row.ctr.toFixed(2)}%`,                                   highlight: false },
    { label: 'Alcance',         value: formatCompact(row.reach),                                   highlight: false },
    { label: 'Impressões',      value: formatCompact(row.impressions),                             highlight: false },
    { label: 'Frequência',      value: `${row.frequency.toFixed(2)}x`,                            highlight: false },
    { label: 'CPM',             value: row.cpm > 0 ? formatCurrency(row.cpm) : '—',               highlight: false },
  ]

  const extraMetrics =
    row.type === 'campaign' || row.type === 'adset'
      ? [{ label: 'Orçamento',  value: budget }]
      : []

  if (row.type === 'adset' && row.campaignName) {
    extraMetrics.push({ label: 'Campanha', value: row.campaignName })
  }
  if (row.type === 'ad') {
    if (row.campaignName) extraMetrics.push({ label: 'Campanha',  value: row.campaignName })
    if (row.adSetName)    extraMetrics.push({ label: 'Conjunto',  value: row.adSetName })
  }

  // ─── Dados do gráfico ────────────────────────────────────────────────────────

  const chartData = trend.map(p => ({
    date:    formatDate(p.date),
    Spend:   p.spend,
    CPL:     p.cpl,
    results: p.results,
  }))

  const maxSpend = Math.max(...chartData.map(d => d.Spend), 1)
  const maxCpl   = Math.max(...chartData.map(d => d.CPL),   1)
  const hasTrend = chartData.length > 0

  // ─── Render ──────────────────────────────────────────────────────────────────

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl w-full max-h-[90vh] overflow-y-auto bg-card border-border p-0">

        {/* Cabeçalho */}
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-border">
          <div className="flex items-start gap-3">
            {/* Badge de tipo */}
            <div className={cn(
              'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium shrink-0 mt-0.5',
              typeConfig.bg, typeConfig.color,
            )}>
              {typeConfig.icon}
              {typeConfig.label}
            </div>

            <div className="min-w-0 flex-1">
              <DialogTitle className="text-base font-semibold text-foreground truncate pr-6">
                {row.name}
              </DialogTitle>
              <div className="flex flex-wrap items-center gap-2 mt-1.5">
                {/* Status */}
                <span className={cn(
                  'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border',
                  STATUS_CLASS[row.status] ?? 'badge-paused',
                )}>
                  {STATUS_LABEL[row.status] ?? row.status}
                </span>
                {/* ID */}
                <span className="text-xs text-muted-foreground font-mono">{row.id}</span>
              </div>
              {/* Hierarquia (adset → campanha; ad → campanha > conjunto) */}
              {(row.type === 'adset' || row.type === 'ad') && row.campaignName && (
                <p className="text-xs text-muted-foreground mt-1 truncate">
                  <span className="text-muted-foreground/60">Campanha:</span>{' '}
                  {row.campaignName}
                  {row.type === 'ad' && row.adSetName && (
                    <>
                      <span className="text-muted-foreground/40 mx-1">›</span>
                      <span className="text-muted-foreground/60">Conjunto:</span>{' '}
                      {row.adSetName}
                    </>
                  )}
                </p>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="px-6 pb-6 space-y-6 mt-4">

          {/* Grid de métricas */}
          <div>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Métricas do período
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {baseMetrics.map(m => (
                <div key={m.label} className="bg-secondary/50 rounded-lg p-3">
                  <p className="text-[11px] text-muted-foreground leading-none">{m.label}</p>
                  <p className={cn(
                    'text-sm font-bold mt-1.5',
                    'className' in m ? (m as { className?: string }).className : '',
                  )}>
                    {m.value}
                  </p>
                </div>
              ))}
            </div>

            {extraMetrics.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
                {extraMetrics.map(m => (
                  <div key={m.label} className="bg-secondary/30 rounded-lg p-3">
                    <p className="text-[11px] text-muted-foreground leading-none">{m.label}</p>
                    <p className="text-sm font-medium mt-1.5 truncate">{m.value}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Gráfico de tendência */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Tendência diária · Spend vs CPL
              </h3>
            </div>

            {loadingTrend ? (
              <ChartSkeleton />
            ) : !hasTrend ? (
              <div className="h-[180px] flex items-center justify-center rounded-lg bg-secondary/20 text-sm text-muted-foreground">
                Sem dados de tendência para o período.
              </div>
            ) : (
              <div className="h-[180px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartData} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={C.grid} opacity={0.6} />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 10, fill: C.muted }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      yAxisId="spend"
                      orientation="left"
                      domain={[0, maxSpend * 1.2]}
                      tickFormatter={v => formatCompact(v)}
                      tick={{ fontSize: 10, fill: C.muted }}
                      tickLine={false}
                      axisLine={false}
                      width={44}
                    />
                    <YAxis
                      yAxisId="cpl"
                      orientation="right"
                      domain={[0, maxCpl * 1.4]}
                      tickFormatter={v => `R$${v.toFixed(0)}`}
                      tick={{ fontSize: 10, fill: C.muted }}
                      tickLine={false}
                      axisLine={false}
                      width={44}
                    />
                    <Tooltip content={<ChartTooltip />} />
                    <Legend
                      wrapperStyle={{ fontSize: '11px', paddingTop: '4px', color: C.muted }}
                      formatter={v => <span style={{ color: C.muted }}>{v}</span>}
                    />
                    <Bar
                      yAxisId="spend"
                      dataKey="Spend"
                      fill={C.teal}
                      fillOpacity={0.75}
                      radius={[3, 3, 0, 0]}
                      maxBarSize={24}
                    />
                    <Line
                      yAxisId="cpl"
                      dataKey="CPL"
                      stroke={C.amber}
                      strokeWidth={2}
                      dot={false}
                      activeDot={{ r: 4 }}
                      strokeDasharray="4 2"
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Resumo de performance */}
          {hasTrend && !loadingTrend && (
            <div>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                Resumo da tendência
              </h3>
              <div className="grid grid-cols-3 gap-2">
                {/* Dias com gasto */}
                <div className="bg-secondary/30 rounded-lg p-3">
                  <p className="text-[11px] text-muted-foreground">Dias c/ gasto</p>
                  <p className="text-sm font-bold mt-1.5">
                    {chartData.filter(d => d.Spend > 0).length}
                  </p>
                </div>
                {/* Pico de gasto */}
                <div className="bg-secondary/30 rounded-lg p-3">
                  <p className="text-[11px] text-muted-foreground">Pico de spend</p>
                  <p className="text-sm font-bold mt-1.5 text-primary">
                    {formatCurrency(Math.max(...chartData.map(d => d.Spend)))}
                  </p>
                </div>
                {/* Melhor CPL */}
                <div className="bg-secondary/30 rounded-lg p-3">
                  <p className="text-[11px] text-muted-foreground">Melhor CPL</p>
                  <p className={cn(
                    'text-sm font-bold mt-1.5',
                    getCplClass(Math.min(...chartData.filter(d => d.CPL > 0).map(d => d.CPL), cplTarget * 2), cplTarget),
                  )}>
                    {(() => {
                      const best = Math.min(...chartData.filter(d => d.CPL > 0).map(d => d.CPL))
                      return isFinite(best) ? formatCurrency(best) : '—'
                    })()}
                  </p>
                </div>
              </div>
            </div>
          )}

        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  try {
    const [y, m, d] = dateStr.split('-').map(Number)
    return format(new Date(y, m - 1, d), 'dd/MM', { locale: ptBR })
  } catch {
    return dateStr
  }
}
