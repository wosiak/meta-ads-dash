'use client'

import React, { useState } from 'react'
import {
  ScatterChart, Scatter, XAxis, YAxis, ZAxis, CartesianGrid,
  Tooltip, Legend, ReferenceLine, ReferenceArea, BarChart, Bar,
  Cell, ResponsiveContainer,
} from 'recharts'
import { AlertTriangle, TrendingUp } from 'lucide-react'
import {
  C, TOOLTIP_STYLE, CPL_TARGET,
  scatterData, type ScatterItem,
  cplHistogram,
  pacingData,
} from '@/lib/mockDataPainel'
import { formatCurrency } from '@/lib/formatters'
import type { Status } from '@/lib/mockData'

const STATUS_LABEL: Record<Status, string> = {
  active: 'Ativo', paused: 'Pausado', review: 'Em análise', rejected: 'Rejeitado', error: 'Com erro',
}
const STATUS_COLOR: Record<Status, string> = {
  active: C.success, paused: C.amber, review: C.cyan, rejected: C.red, error: C.red,
}

// Agrupa o scatter por status para colorir de forma diferente
function groupByStatus(data: ScatterItem[]) {
  const groups: Record<Status, ScatterItem[]> = {
    active: [], paused: [], review: [], rejected: [], error: [],
  }
  data.forEach(d => groups[d.status].push(d))
  return groups
}

// ─── Tooltip do scatter ──────────────────────────────────────────────────────
function ScatterTooltip({ active, payload }: { active?: boolean; payload?: any[] }) {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload as ScatterItem
  return (
    <div style={{ ...TOOLTIP_STYLE, padding: '10px 14px', minWidth: 210 }}>
      <p style={{ color: C.fg, fontWeight: 600, marginBottom: 6, fontSize: 11 }}>{d.name}</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3, fontSize: 11 }}>
        <span style={{ color: C.teal }}>Gasto: {formatCurrency(d.spend)}</span>
        <span style={{ color: d.cpl > CPL_TARGET ? C.red : C.success }}>
          CPL: {formatCurrency(d.cpl)} {d.cpl > CPL_TARGET ? '⚠ acima da meta' : '✓ dentro da meta'}
        </span>
        <span style={{ color: C.amber }}>Resultados: {d.results}</span>
        <span style={{ color: STATUS_COLOR[d.status] }}>
          Status: {STATUS_LABEL[d.status]}
        </span>
        <p style={{ color: C.muted, marginTop: 4, fontSize: 10 }}>Clique para ver detalhes</p>
      </div>
    </div>
  )
}

interface Props {
  onSelectItem: (item: ScatterItem) => void
  clientMode: boolean
}

export function TabDiagnostico({ onSelectItem, clientMode }: Props) {
  const grouped = groupByStatus(scatterData)
  const statusEntries = (Object.entries(grouped) as [Status, ScatterItem[]][]).filter(([, v]) => v.length > 0)

  // Limites para os quadrantes
  const maxSpend = Math.max(...scatterData.map(d => d.spend))
  const midSpend = maxSpend / 2

  const isOverMeta  = pacingData.deltaVsExpected > 5
  const isUnderPace = pacingData.deltaVsExpected < -10

  return (
    <div className="space-y-8">

      {/* ── 3A: Scatter / Bubble ────────────────────────────────────────── */}
      <section>
        <div className="mb-3">
          <h4 className="text-sm font-semibold text-foreground">Mapa de eficiência</h4>
          <p className="text-xs text-muted-foreground">
            X = Gasto · Y = CPL · Tamanho = Resultados · Cor = Status &nbsp;·&nbsp;
            <span style={{ color: C.red }}>Acima da linha = CPL fora da meta</span>
          </p>
        </div>

        {/* Chips de legenda de quadrantes */}
        <div className="flex gap-3 mb-3">
          <QuadrantChip color={C.success} label="Escalar → alto gasto, CPL ok" />
          <QuadrantChip color={C.amber}   label="Otimizar → alto gasto, CPL alto" />
          <QuadrantChip color={C.muted}   label="Testar → baixo gasto" />
        </div>

        <ResponsiveContainer width="100%" height={320}>
          <ScatterChart margin={{ top: 8, right: 24, bottom: 0, left: 0 }}>
            <CartesianGrid stroke={C.grid} strokeDasharray="3 3" />
            <XAxis
              type="number" dataKey="spend" name="Gasto"
              tickFormatter={v => `R$${(v / 1000).toFixed(0)}k`}
              tick={{ fill: C.muted, fontSize: 11 }} axisLine={false} tickLine={false}
            />
            <YAxis
              type="number" dataKey="cpl" name="CPL"
              tickFormatter={v => `R$${v}`}
              tick={{ fill: C.muted, fontSize: 11 }} axisLine={false} tickLine={false}
              width={52}
            />
            <ZAxis type="number" dataKey="results" range={[60, 500]} name="Resultados" />

            {/* Quadrante bom: gasto alto, CPL baixo */}
            <ReferenceArea
              x1={midSpend} x2={maxSpend * 1.1}
              y1={0} y2={CPL_TARGET}
              fill={C.success} fillOpacity={0.05}
            />
            {/* Quadrante ruim: gasto alto, CPL alto */}
            <ReferenceArea
              x1={midSpend} x2={maxSpend * 1.1}
              y1={CPL_TARGET} y2={CPL_TARGET * 3}
              fill={C.red} fillOpacity={0.05}
            />

            {/* Linha horizontal da meta CPL */}
            <ReferenceLine
              y={CPL_TARGET}
              stroke={C.red}
              strokeDasharray="5 3"
              label={{ value: `Meta R$${CPL_TARGET}`, fill: C.red, fontSize: 10, position: 'insideTopRight' }}
            />

            <Tooltip content={<ScatterTooltip />} />
            <Legend
              wrapperStyle={{ fontSize: 11, color: C.muted }}
              iconType="circle" iconSize={8}
            />

            {statusEntries.map(([status, items]) => (
              <Scatter
                key={status}
                name={STATUS_LABEL[status]}
                data={items}
                fill={STATUS_COLOR[status]}
                fillOpacity={0.8}
                onClick={(data) => onSelectItem(data as ScatterItem)}
                style={{ cursor: 'pointer' }}
              />
            ))}
          </ScatterChart>
        </ResponsiveContainer>
      </section>

      {/* ── 3B: Histograma CPL — visível apenas fora do Modo Cliente ─────── */}
      {!clientMode && (
        <section>
          <div className="mb-3">
            <h4 className="text-sm font-semibold text-foreground">Distribuição do CPL</h4>
            <p className="text-xs text-muted-foreground">
              Concentração = operação saudável · Dispersão = estrutura precisa revisão
            </p>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={cplHistogram} margin={{ top: 0, right: 16, bottom: 0, left: 0 }}>
              <CartesianGrid stroke={C.grid} strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="range"
                tick={{ fill: C.muted, fontSize: 11 }}
                axisLine={false} tickLine={false}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fill: C.muted, fontSize: 11 }}
                axisLine={false} tickLine={false}
                width={28}
              />
              <Tooltip
                formatter={(v: number | undefined) => [v ?? 0, 'Itens']}
                contentStyle={TOOLTIP_STYLE}
                labelStyle={{ color: C.fg, fontWeight: 600 }}
              />
              <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={48}>
                {cplHistogram.map((entry, idx) => (
                  <Cell
                    key={idx}
                    fill={entry.range.includes('≤') || entry.range.includes('10–20') ? C.success : entry.range.includes('> R$40') ? C.red : C.teal}
                    fillOpacity={0.85}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </section>
      )}

      {/* ── 3C: Pacing ───────────────────────────────────────────────────── */}
      <section>
        <div className="mb-3">
          <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
            Pacing do orçamento
            {isOverMeta && (
              <span className="flex items-center gap-1 text-xs font-medium text-red-400">
                <AlertTriangle size={12} /> Acelerado
              </span>
            )}
            {isUnderPace && (
              <span className="flex items-center gap-1 text-xs font-medium text-amber-400">
                <AlertTriangle size={12} /> Abaixo do ritmo
              </span>
            )}
            {!isOverMeta && !isUnderPace && (
              <span className="flex items-center gap-1 text-xs font-medium text-green-400">
                <TrendingUp size={12} /> No ritmo
              </span>
            )}
          </h4>
          <p className="text-xs text-muted-foreground">
            Dia {pacingData.daysElapsed} de {pacingData.totalDays} &nbsp;·&nbsp;
            Esperado até hoje: {formatCurrency(pacingData.expectedAtToday)}
          </p>
        </div>

        <div className="space-y-3">
          {/* Barra de gasto real */}
          <PacingBar
            label="Gasto real"
            value={pacingData.spent}
            max={pacingData.planned}
            pct={pacingData.pctSpent}
            color={isOverMeta ? C.red : C.teal}
          />
          {/* Barra de ritmo esperado */}
          <PacingBar
            label="Ritmo esperado"
            value={pacingData.expectedAtToday}
            max={pacingData.planned}
            pct={pacingData.pctExpected}
            color={C.muted}
            dashed
          />

          {/* Resumo */}
          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span>Orçamento total: <strong className="text-foreground">{formatCurrency(pacingData.planned)}</strong></span>
              <span>Restante: <strong className="text-foreground">{formatCurrency(pacingData.planned - pacingData.spent)}</strong></span>
            </div>
            <span
              className={`text-xs font-semibold px-2 py-0.5 rounded-full ${isOverMeta ? 'bg-red-500/10 text-red-400' : 'bg-green-500/10 text-green-400'}`}
            >
              {pacingData.deltaVsExpected > 0 ? '+' : ''}{pacingData.deltaVsExpected.toFixed(1)}% vs esperado
            </span>
          </div>
        </div>
      </section>
    </div>
  )
}

function PacingBar({
  label, value, max, pct, color, dashed,
}: { label: string; value: number; max: number; pct: number; color: string; dashed?: boolean }) {
  return (
    <div>
      <div className="flex justify-between text-xs text-muted-foreground mb-1">
        <span>{label}</span>
        <span className="font-medium" style={{ color }}>
          {formatCurrency(value)} <span className="text-muted-foreground">/ {pct.toFixed(1)}%</span>
        </span>
      </div>
      <div className="h-3 rounded-full bg-secondary overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${dashed ? 'opacity-50' : ''}`}
          style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: color }}
        />
      </div>
    </div>
  )
}

function QuadrantChip({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
      <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: color, opacity: 0.5 }} />
      {label}
    </div>
  )
}
