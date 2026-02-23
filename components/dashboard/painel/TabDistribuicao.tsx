'use client'

import React, { useState, useMemo } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  Cell, PieChart, Pie, ResponsiveContainer,
} from 'recharts'
import {
  C, TOOLTIP_STYLE,
  top10Items, type RankedItem,
  statusDonut,
} from '@/lib/mockDataPainel'
import { formatCurrency } from '@/lib/formatters'
import type { Status } from '@/lib/mockData'

const STATUS_LABEL: Record<Status, string> = {
  active:   'Ativo',
  paused:   'Pausado',
  review:   'Em análise',
  rejected: 'Rejeitado',
  error:    'Com erro',
}
const STATUS_COLOR: Record<Status, string> = {
  active:   C.success,
  paused:   C.amber,
  review:   C.cyan,
  rejected: C.red,
  error:    C.red,
}

type SortBy = 'spend' | 'cpl' | 'results'
// ─── Tooltip do Top 10 ───────────────────────────────────────────────────────
function Top10Tooltip({ active, payload }: { active?: boolean; payload?: any[] }) {
  if (!active || !payload?.length) return null
  const d = payload[0]?.payload as RankedItem
  return (
    <div style={{ ...TOOLTIP_STYLE, padding: '10px 14px', minWidth: 200 }}>
      <p style={{ color: C.fg, fontWeight: 600, marginBottom: 6, fontSize: 11 }}>{d.name}</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3, fontSize: 11 }}>
        <span style={{ color: C.teal   }}>Gasto: {formatCurrency(d.spend)}</span>
        <span style={{ color: C.amber  }}>Resultados: {d.results}</span>
        <span style={{ color: d.cpl > 20 ? C.red : C.success }}>CPL: {formatCurrency(d.cpl)}</span>
        <span style={{ color: STATUS_COLOR[d.status] }}>
          Status: {STATUS_LABEL[d.status]}
        </span>
      </div>
    </div>
  )
}

// Label customizado na barra horizontal (status badge)
function CustomBarLabel(props: any) {
  const { x, y, width, height, value, status } = props
  if (!width || width < 60) return null
  const color = STATUS_COLOR[status as Status] ?? C.muted
  return (
    <text
      x={x + width - 6} y={y + height / 2}
      fill={color} fontSize={9} textAnchor="end" dominantBaseline="middle"
    >
      {STATUS_LABEL[status as Status]}
    </text>
  )
}

export function TabDistribuicao({ clientMode }: { clientMode: boolean }) {
  const [sortBy, setSortBy] = useState<SortBy>('spend')

  // Ordena o top 10 conforme selector
  const sorted = useMemo(() => {
    const key: keyof RankedItem = sortBy === 'spend' ? 'spend' : sortBy === 'cpl' ? 'cpl' : 'results'
    return [...top10Items].sort((a, b) =>
      sortBy === 'cpl' ? a[key] as number - (b[key] as number) : (b[key] as number) - (a[key] as number),
    )
  }, [sortBy])

  // Donut: use barras se > 6 fatias (aqui são ≤6, mas a lógica está preparada)
  const showDonut = statusDonut.length <= 6

  return (
    <div className="space-y-8">

      {/* ── 2A: Top 10 por impacto ──────────────────────────────────────── */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h4 className="text-sm font-semibold text-foreground">Top 10 por impacto</h4>
            <p className="text-xs text-muted-foreground">Campanhas e conjuntos com maior peso no resultado</p>
          </div>
          <div className="flex gap-1">
            {(['spend', 'results', 'cpl'] as SortBy[]).map(s => (
              <button
                key={s}
                onClick={() => setSortBy(s)}
                className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${sortBy === s ? 'border-teal-500 text-teal-400 bg-teal-500/10' : 'border-border text-muted-foreground hover:border-muted-foreground'}`}
              >
                {s === 'spend' ? 'Gasto' : s === 'results' ? 'Resultados' : 'CPL'}
              </button>
            ))}
          </div>
        </div>

        <ResponsiveContainer width="100%" height={280}>
          <BarChart
            data={sorted}
            layout="vertical"
            margin={{ top: 0, right: 8, bottom: 0, left: 0 }}
          >
            <CartesianGrid stroke={C.grid} strokeDasharray="3 3" horizontal={false} />
            <XAxis
              type="number"
              tickFormatter={v => sortBy === 'cpl' ? `R$${v}` : sortBy === 'spend' ? `R$${(v / 1000).toFixed(0)}k` : String(v)}
              tick={{ fill: C.muted, fontSize: 10 }}
              axisLine={false} tickLine={false}
            />
            <YAxis
              type="category" dataKey="name"
              tick={{ fill: C.muted, fontSize: 10 }}
              axisLine={false} tickLine={false}
              width={130}
              tickFormatter={v => v.length > 18 ? v.slice(0, 16) + '…' : v}
            />
            <Tooltip content={<Top10Tooltip />} />
            <Bar
              dataKey={sortBy === 'spend' ? 'spend' : sortBy === 'results' ? 'results' : 'cpl'}
              radius={[0, 4, 4, 0]}
              maxBarSize={20}
            >
              {sorted.map(item => (
                <Cell
                  key={item.id}
                  fill={sortBy === 'cpl' && item.cpl > 20 ? C.red : C.teal}
                  fillOpacity={0.85}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </section>


      {/* ── 2C: Status de veiculação (donut ou barras) ──────────────────── */}
      {/* Em "Modo Cliente", este gráfico é ocultado (detalhe técnico) */}
      {!clientMode && (
        <section>
          <div className="mb-3">
            <h4 className="text-sm font-semibold text-foreground">Status de veiculação</h4>
            <p className="text-xs text-muted-foreground">Distribuição dos itens por status atual</p>
          </div>

          <div className="flex items-center gap-8">
            {showDonut ? (
              <PieChart width={180} height={180}>
                <Pie
                  data={statusDonut}
                  dataKey="value"
                  nameKey="name"
                  cx="50%" cy="50%"
                  innerRadius={52} outerRadius={78}
                  paddingAngle={3}
                >
                  {statusDonut.map((entry, idx) => (
                    <Cell key={idx} fill={entry.color} fillOpacity={0.9} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(v: number | undefined, name: string | undefined) => [v ?? 0, name ?? '']}
                  contentStyle={TOOLTIP_STYLE}
                />
              </PieChart>
            ) : (
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={statusDonut} layout="vertical" margin={{ left: 0 }}>
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="name" tick={{ fill: C.muted, fontSize: 11 }} axisLine={false} tickLine={false} width={90} />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {statusDonut.map((entry, idx) => <Cell key={idx} fill={entry.color} fillOpacity={0.85} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}

            {/* Legenda lateral do donut */}
            {showDonut && (
              <div className="flex flex-col gap-2.5">
                {statusDonut.map(s => (
                  <div key={s.name} className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                    <span className="text-xs text-muted-foreground">{s.name}</span>
                    <span className="text-xs font-semibold text-foreground ml-auto">{s.value}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  )
}
