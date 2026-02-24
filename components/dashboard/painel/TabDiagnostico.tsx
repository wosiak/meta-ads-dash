'use client'

import React, { useMemo } from 'react'
import {
  ScatterChart, Scatter, XAxis, YAxis, ZAxis, CartesianGrid,
  Tooltip, Legend, ReferenceLine, ReferenceArea, BarChart, Bar,
  Cell, ResponsiveContainer,
} from 'recharts'
import { C, TOOLTIP_STYLE, CPL_TARGET } from '@/lib/mockDataPainel'
import { formatCurrency } from '@/lib/formatters'
import type { DiagnosticoItem, HistogramBin, DiagnosticoLevel } from '@/app/actions/getDiagnosticoData'

// ─── Mapeamento de status Meta API → label / cor ──────────────────────────────
const STATUS_KEY: Record<string, string> = {
  ACTIVE:      'ACTIVE',
  PAUSED:      'PAUSED',
  IN_PROCESS:  'REVIEW',
  WITH_ISSUES: 'ERROR',
  DELETED:     'ERROR',
  ARCHIVED:    'PAUSED',
  UNKNOWN:     'PAUSED',
}

const STATUS_LABEL: Record<string, string> = {
  ACTIVE: 'Ativo',
  PAUSED: 'Pausado',
  REVIEW: 'Em análise',
  ERROR:  'Com erro',
}

const STATUS_COLOR: Record<string, string> = {
  ACTIVE: C.success,
  PAUSED: C.amber,
  REVIEW: C.cyan,
  ERROR:  C.red,
}

function normalizeStatus(raw: string): string {
  return STATUS_KEY[raw?.toUpperCase()] ?? 'PAUSED'
}

// ─── Tooltip do scatter ───────────────────────────────────────────────────────
function ScatterTooltip({ active, payload }: { active?: boolean; payload?: any[] }) {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload as DiagnosticoItem
  const sk = normalizeStatus(d.status)
  return (
    <div style={{ ...TOOLTIP_STYLE, padding: '10px 14px', minWidth: 210 }}>
      <p style={{ color: C.fg, fontWeight: 600, marginBottom: 6, fontSize: 11 }}>{d.name}</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3, fontSize: 11 }}>
        <span style={{ color: C.teal }}>Gasto: {formatCurrency(d.spend)}</span>
        <span style={{ color: d.cpl > CPL_TARGET ? C.red : C.success }}>
          CPL: {formatCurrency(d.cpl)} {d.cpl > CPL_TARGET ? '⚠ acima da meta' : '✓ dentro da meta'}
        </span>
        <span style={{ color: C.amber }}>Resultados: {d.results}</span>
        <span style={{ color: STATUS_COLOR[sk] }}>Status: {STATUS_LABEL[sk]}</span>
        <p style={{ color: C.muted, marginTop: 4, fontSize: 10 }}>Clique para ver detalhes</p>
      </div>
    </div>
  )
}

// ─── Props ────────────────────────────────────────────────────────────────────
interface Props {
  items:        DiagnosticoItem[]
  histogram:    HistogramBin[]
  level?:       DiagnosticoLevel
  onSelectItem: (item: DiagnosticoItem) => void
  clientMode:   boolean
}

// ─── Componente ───────────────────────────────────────────────────────────────
export function TabDiagnostico({ items, histogram, level = 'campaign', onSelectItem, clientMode }: Props) {
  const entityLabel = level === 'ad' ? 'Anúncio' : 'Campanha'

  const grouped = useMemo(() => {
    const map: Record<string, DiagnosticoItem[]> = {}
    items.forEach(item => {
      const sk = normalizeStatus(item.status)
      if (!map[sk]) map[sk] = []
      map[sk].push(item)
    })
    return map
  }, [items])

  const maxSpend = useMemo(() => Math.max(...items.map(d => d.spend), 1), [items])
  const midSpend = maxSpend / 2

  if (items.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 rounded-lg border border-dashed border-border text-sm text-muted-foreground">
        Sem dados para o período selecionado.
      </div>
    )
  }

  return (
    <div className="space-y-8">

      {/* ── Mapa de eficiência (Scatter) ─────────────────────────────────── */}
      <section>
        <div className="mb-3">
          <h4 className="text-sm font-semibold text-foreground">
            Mapa de eficiência
            <span className="ml-2 text-xs font-normal text-muted-foreground">
              por {entityLabel}
            </span>
          </h4>
          <p className="text-xs text-muted-foreground">
            X = Gasto · Y = CPL · Tamanho = Resultados · Cor = Status &nbsp;·&nbsp;
            <span style={{ color: C.red }}>Acima da linha = CPL fora da meta</span>
          </p>
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

            <ReferenceArea
              x1={midSpend} x2={maxSpend * 1.15}
              y1={0} y2={CPL_TARGET}
              fill={C.success} fillOpacity={0.05}
            />
            <ReferenceArea
              x1={midSpend} x2={maxSpend * 1.15}
              y1={CPL_TARGET} y2={CPL_TARGET * 3}
              fill={C.red} fillOpacity={0.05}
            />
            <ReferenceLine
              y={CPL_TARGET}
              stroke={C.red}
              strokeDasharray="5 3"
              label={{ value: `Meta R$${CPL_TARGET}`, fill: C.red, fontSize: 10, position: 'insideTopRight' }}
            />

            <Tooltip content={<ScatterTooltip />} />
            <Legend wrapperStyle={{ fontSize: 11, color: C.muted }} iconType="circle" iconSize={8} />

            {Object.entries(grouped).map(([sk, groupItems]) => (
              <Scatter
                key={sk}
                name={STATUS_LABEL[sk] ?? sk}
                data={groupItems}
                fill={STATUS_COLOR[sk] ?? C.muted}
                fillOpacity={0.8}
                onClick={(data) => onSelectItem(data as DiagnosticoItem)}
                style={{ cursor: 'pointer' }}
              />
            ))}
          </ScatterChart>
        </ResponsiveContainer>
      </section>

      {/* ── Distribuição do CPL (histograma) ─────────────────────────────── */}
      {!clientMode && histogram.length > 0 && (
        <section>
          <div className="mb-3">
            <h4 className="text-sm font-semibold text-foreground">
              Distribuição do CPL
              <span className="ml-2 text-xs font-normal text-muted-foreground">por {entityLabel}</span>
            </h4>
            <p className="text-xs text-muted-foreground">
              Concentração = operação saudável · Dispersão = estrutura precisa revisão
            </p>
          </div>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={histogram} margin={{ top: 0, right: 16, bottom: 0, left: 0 }}>
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
                formatter={(v: number | undefined) => [v ?? 0, entityLabel + 's']}
                contentStyle={{ ...TOOLTIP_STYLE, backgroundColor: 'hsl(222, 20%, 10%)' }}
                labelStyle={{ color: C.fg, fontWeight: 600 }}
                itemStyle={{ color: C.fg }}
              />
              <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={48}>
                {histogram.map((entry, idx) => (
                  <Cell
                    key={idx}
                    fill={
                      entry.range.includes('≤') || entry.range.includes('10–20')
                        ? C.success
                        : entry.range.includes('> R$40')
                        ? C.red
                        : C.teal
                    }
                    fillOpacity={0.85}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </section>
      )}
    </div>
  )
}
