'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { getCampaignTrend } from '@/app/actions/getCampaignTrend'
import { formatCurrency } from '@/lib/formatters'
import { periodToDates, DEFAULT_PERIOD } from '@/lib/periods'
import type { TrendPoint } from '@/lib/dashboard'

interface CampaignOption {
  metaCampaignId: string
  campaignName:   string
}

interface TrendChartProps {
  accountId:  string
  campaigns:  CampaignOption[]
}

const COLORS = {
  spend:   'hsl(172, 66%, 50%)',  // teal
  results: 'hsl(38,  92%, 50%)',  // amber
  cpl:     'hsl(340, 75%, 60%)',  // rosa/vermelho suave
}

const TOOLTIP_STYLE = {
  backgroundColor: 'hsl(222, 16%, 14%)',
  border:          '1px solid hsl(222, 14%, 18%)',
  borderRadius:    '8px',
  fontSize:        '12px',
  color:           'hsl(210, 20%, 92%)',
}

function formatDate(v: string) {
  const d = new Date(v + 'T00:00:00')
  return `${d.getDate()}/${d.getMonth() + 1}`
}

export function TrendChart({ accountId, campaigns }: TrendChartProps) {
  const searchParams = useSearchParams()

  // Lê o período da URL — sincronizado com o seletor do TopBar
  const urlFrom = searchParams.get('from')
  const urlTo   = searchParams.get('to')
  const defaults = periodToDates(DEFAULT_PERIOD)
  const dateFrom = urlFrom || defaults.from
  const dateTo   = urlTo   || defaults.to

  // Seletor de campanha: "all" = conta inteira
  const [selectedId, setSelectedId]   = useState<string>('all')
  const [data, setData]               = useState<TrendPoint[]>([])
  const [isLoading, setIsLoading]     = useState(false)
  const [error, setError]             = useState<string | null>(null)
  const [showCpl, setShowCpl]         = useState(true)

  const load = useCallback(async (campaignId: string, from: string, to: string) => {
    if (!accountId) return
    setIsLoading(true)
    setError(null)
    try {
      const metaCampaignId = campaignId === 'all' ? null : campaignId
      const points = await getCampaignTrend(accountId, metaCampaignId, from, to)
      setData(points)
    } catch (e) {
      setError('Erro ao carregar dados. Tente novamente.')
      console.error(e)
    } finally {
      setIsLoading(false)
    }
  }, [accountId])

  // Carrega ao montar e quando trocar campanha ou período
  useEffect(() => {
    load(selectedId, dateFrom, dateTo)
  }, [selectedId, dateFrom, dateTo, load])

  return (
    <div className="space-y-3">
      {/* Controles */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Seletor de campanha */}
        <Select value={selectedId} onValueChange={setSelectedId} disabled={isLoading}>
          <SelectTrigger className="h-8 text-xs bg-secondary border-border w-auto min-w-[180px] max-w-[320px]">
            <SelectValue placeholder="Selecionar campanha" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">
              <span className="font-medium">Geral (todas as campanhas)</span>
            </SelectItem>
            {campaigns.map(c => (
              <SelectItem key={c.metaCampaignId} value={c.metaCampaignId}>
                {c.campaignName}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Toggle CPL */}
        <button
          onClick={() => setShowCpl(v => !v)}
          className={[
            'h-8 px-3 rounded-md border text-xs font-medium transition-colors',
            showCpl
              ? 'border-[hsl(340,75%,60%)]/50 bg-[hsl(340,75%,60%)]/10 text-[hsl(340,75%,60%)]'
              : 'border-border bg-secondary text-muted-foreground hover:text-foreground',
          ].join(' ')}
        >
          {showCpl ? '● CPL visível' : '○ CPL oculto'}
        </button>

        {isLoading && (
          <span className="text-xs text-muted-foreground animate-pulse">Carregando...</span>
        )}
      </div>

      {/* Gráfico */}
      {error ? (
        <div className="h-[280px] flex items-center justify-center text-sm text-destructive">
          {error}
        </div>
      ) : data.length === 0 && !isLoading ? (
        <div className="h-[280px] flex items-center justify-center text-sm text-muted-foreground">
          Sem dados para o período selecionado.
        </div>
      ) : (
        <div className="w-full h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data} margin={{ top: 5, right: 24, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(222, 14%, 18%)" />

              <XAxis
                dataKey="date"
                tickFormatter={formatDate}
                stroke="hsl(215, 15%, 55%)"
                fontSize={11}
                tickLine={false}
              />

              {/* Eixo esquerdo — Investimento (R$) */}
              <YAxis
                yAxisId="spend"
                orientation="left"
                stroke="hsl(215, 15%, 55%)"
                fontSize={11}
                tickLine={false}
                tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`}
              />

              {/* Eixo direito — Resultados */}
              <YAxis
                yAxisId="results"
                orientation="right"
                stroke="hsl(215, 15%, 55%)"
                fontSize={11}
                tickLine={false}
              />

              {/* Eixo direito 2 — CPL (oculto visualmente, mesma posição) */}
              {showCpl && (
                <YAxis
                  yAxisId="cpl"
                  orientation="right"
                  stroke="transparent"
                  fontSize={0}
                  tickLine={false}
                  width={0}
                />
              )}

              <Tooltip
                contentStyle={TOOLTIP_STYLE}
                labelFormatter={v => `📅 ${formatDate(String(v))}`}
                formatter={(value: number | undefined, name: string | undefined) => {
                  if (value === undefined) return ['—', name ?? '']
                  if (name === 'Investimento') return [formatCurrency(value), name]
                  if (name === 'CPL')          return [formatCurrency(value), name]
                  return [value, name ?? '']
                }}
              />
              <Legend wrapperStyle={{ fontSize: '12px', color: 'hsl(215, 15%, 55%)' }} />

              {/* Barras — Investimento */}
              <Bar
                yAxisId="spend"
                dataKey="spend"
                name="Investimento"
                fill={COLORS.spend}
                opacity={0.75}
                radius={[2, 2, 0, 0]}
                maxBarSize={24}
              />

              {/* Linha — Resultados */}
              <Line
                yAxisId="results"
                type="monotone"
                dataKey="results"
                name="Resultados"
                stroke={COLORS.results}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, fill: COLORS.results }}
              />

              {/* Linha — CPL (opcional) */}
              {showCpl && (
                <Line
                  yAxisId="cpl"
                  type="monotone"
                  dataKey="cpl"
                  name="CPL"
                  stroke={COLORS.cpl}
                  strokeWidth={1.5}
                  strokeDasharray="4 3"
                  dot={false}
                  activeDot={{ r: 3, fill: COLORS.cpl }}
                />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
