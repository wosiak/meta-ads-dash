'use client'

import React, { useState, useMemo } from 'react'
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ReferenceLine, ResponsiveContainer,
  type DotProps,
} from 'recharts'
import { C, TOOLTIP_STYLE, CPL_TARGET, dailyEnriched, type DailyEnriched } from '@/lib/mockDataPainel'
import { formatCurrency } from '@/lib/formatters'

interface Props {
  resultLabel: string
  granularity: 'day' | 'week'
}

// Agrega dados diários em semanas (a cada 7 dias)
function toWeekly(data: DailyEnriched[]): DailyEnriched[] {
  const weeks: DailyEnriched[] = []
  for (let i = 0; i < data.length; i += 7) {
    const chunk = data.slice(i, Math.min(i + 7, data.length))
    const spend   = chunk.reduce((s, d) => s + d.spend, 0)
    const results = chunk.reduce((s, d) => s + d.results, 0)
    weeks.push({
      date:        `Sem ${Math.floor(i / 7) + 1}`,
      spend:       Math.round(spend * 100) / 100,
      results,
      cpl:         results > 0 ? Math.round((spend / results) * 100) / 100 : 0,
      prevSpend:   0,
      prevResults: 0,
      prevCpl:     0,
    })
  }
  return weeks
}

// Ponto customizado: vermelho quando CPL ultrapassa a meta
function CustomResultDot(props: DotProps & { payload?: DailyEnriched }) {
  const { cx, cy, payload } = props
  if (cx == null || cy == null) return null
  const overMeta = payload && payload.cpl > CPL_TARGET
  return (
    <circle
      cx={cx} cy={cy} r={overMeta ? 5 : 3}
      fill={overMeta ? C.red : C.teal}
      stroke={overMeta ? C.red : 'transparent'}
      strokeWidth={2}
    />
  )
}

// Tooltip rico com data, spend, resultados e CPL
function ComboTooltip({ active, payload, label, resultLabel }: {
  active?: boolean; payload?: any[]; label?: string; resultLabel: string
}) {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload as DailyEnriched
  return (
    <div style={{ ...TOOLTIP_STYLE, padding: '10px 14px', minWidth: 200 }}>
      <p style={{ color: C.fg, fontWeight: 600, marginBottom: 8 }}>{label}</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <Row label="Investimento" value={formatCurrency(d.spend)} color={C.teal} />
        <Row label={resultLabel}  value={String(d.results)}       color={C.amber} />
        <Row label="CPL"          value={formatCurrency(d.cpl)}   color={d.cpl > CPL_TARGET ? C.red : C.success} />
        {d.cpl > CPL_TARGET && (
          <p style={{ color: C.red, fontSize: 11, marginTop: 4 }}>
            ⚠ CPL acima da meta de {formatCurrency(CPL_TARGET)}
          </p>
        )}
      </div>
    </div>
  )
}

function Row({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16 }}>
      <span style={{ color: C.muted }}>{label}</span>
      <span style={{ color, fontWeight: 600 }}>{value}</span>
    </div>
  )
}

export function TabTendencia({ resultLabel, granularity }: Props) {
  const [showCPL, setShowCPL] = useState(false)

  const data = useMemo(
    () => granularity === 'week' ? toWeekly(dailyEnriched) : dailyEnriched,
    [granularity],
  )

  const totalSpend   = data.reduce((s, d) => s + d.spend, 0)
  const totalResults = data.reduce((s, d) => s + d.results, 0)
  const avgCpl       = totalResults > 0 ? totalSpend / totalResults : 0

  return (
    <div className="space-y-4">
      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        <SummaryCard label="Investimento total" value={formatCurrency(totalSpend)} />
        <SummaryCard label={`${resultLabel} total`} value={String(totalResults)} />
        <SummaryCard label="CPL médio" value={formatCurrency(avgCpl)} highlight={avgCpl > CPL_TARGET} />
      </div>

      {/* Controles do gráfico */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          Linha vermelha = Meta CPL ({formatCurrency(CPL_TARGET)}) &nbsp;·&nbsp;
          Pontos vermelhos = CPL acima da meta
        </p>
        <button
          onClick={() => setShowCPL(v => !v)}
          className={`text-xs px-3 py-1 rounded-full border transition-colors ${showCPL ? 'border-amber-500 text-amber-400 bg-amber-500/10' : 'border-border text-muted-foreground hover:border-muted-foreground'}`}
        >
          {showCPL ? '✓' : '+'} Linha CPL
        </button>
      </div>

      {/* Gráfico combo */}
      <ResponsiveContainer width="100%" height={320}>
        <ComposedChart data={data} margin={{ top: 8, right: showCPL ? 64 : 16, bottom: 0, left: 0 }}>
          <CartesianGrid stroke={C.grid} strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fill: C.muted, fontSize: 11 }}
            axisLine={false} tickLine={false}
            interval={granularity === 'day' ? 4 : 0}
          />
          <YAxis
            yAxisId="spend"
            tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`}
            tick={{ fill: C.muted, fontSize: 11 }}
            axisLine={false} tickLine={false}
            width={56}
          />
          <YAxis
            yAxisId="results"
            orientation="right"
            tick={{ fill: C.muted, fontSize: 11 }}
            axisLine={false} tickLine={false}
            width={showCPL ? 48 : 0}
            hide={!showCPL}
          />

          <Tooltip content={<ComboTooltip resultLabel={resultLabel} />} />
          <Legend wrapperStyle={{ fontSize: 12, color: C.muted }} iconType="circle" iconSize={8} />

          {/* Linha de meta CPL */}
          <ReferenceLine
            yAxisId="spend"
            y={CPL_TARGET}
            stroke={C.red}
            strokeDasharray="4 4"
            strokeOpacity={0.6}
            label={{ value: `Meta R$${CPL_TARGET}`, fill: C.red, fontSize: 10, position: 'insideTopRight' }}
          />

          {/* Barras de investimento */}
          <Bar
            yAxisId="spend"
            dataKey="spend"
            name="Investimento"
            fill={C.teal}
            fillOpacity={0.85}
            radius={[2, 2, 0, 0]}
            maxBarSize={32}
          />

          {/* Linha de resultados */}
          <Line
            yAxisId="spend"
            dataKey="results"
            name={resultLabel}
            stroke={C.amber}
            strokeWidth={2}
            dot={<CustomResultDot />}
            activeDot={{ r: 6, fill: C.amber }}
          />

          {/* Linha opcional de CPL */}
          {showCPL && (
            <Line
              yAxisId="results"
              dataKey="cpl"
              name="CPL"
              stroke={C.red}
              strokeWidth={1.5}
              strokeDasharray="6 3"
              dot={false}
              activeDot={{ r: 4, fill: C.red }}
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}

function SummaryCard({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="rounded-lg border border-border bg-secondary p-3">
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className={`text-lg font-bold ${highlight ? 'text-red-400' : 'text-foreground'}`}>{value}</p>
    </div>
  )
}
