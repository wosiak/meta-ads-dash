'use client'

import React, { useState } from 'react'
import {
  C, TOOLTIP_STYLE,
  breakdownPlacement, type BreakdownRow,
} from '@/lib/mockDataPainel'
import { formatCurrency } from '@/lib/formatters'

type MetricKey = 'spend' | 'results' | 'cpl'

function BreakdownBars({ data }: { data: BreakdownRow[] }) {
  const [activeMetric, setActiveMetric] = useState<MetricKey>('spend')

  const metricColor: Record<MetricKey, string> = { spend: C.teal, results: C.amber, cpl: C.success }
  const metricLabel: Record<MetricKey, string> = { spend: 'Gasto', results: 'Resultados', cpl: 'CPL' }
  const metricFmt: Record<MetricKey, (v: number) => string> = {
    spend:   v => formatCurrency(v),
    results: v => String(v),
    cpl:     v => formatCurrency(v),
  }

  const maxVal = Math.max(...data.map(d => d[activeMetric]))

  return (
    <div>
      {/* Seletor de métrica */}
      <div className="flex gap-1 mb-4">
        {(Object.keys(metricLabel) as MetricKey[]).map(m => (
          <button
            key={m}
            onClick={() => setActiveMetric(m)}
            className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${activeMetric === m ? 'border-teal-500 text-teal-400 bg-teal-500/10' : 'border-border text-muted-foreground hover:border-muted-foreground'}`}
          >
            {metricLabel[m]}
          </button>
        ))}
        <span className="ml-auto text-xs text-muted-foreground self-center">CPL sempre visível →</span>
      </div>

      {/* Tabela visual com barras */}
      <div className="space-y-2">
        {data.map(row => (
          <div key={row.label} className="grid grid-cols-[120px_1fr_80px] items-center gap-3">
            <span className="text-xs text-muted-foreground truncate">{row.label}</span>
            <div className="relative h-6 bg-secondary rounded overflow-hidden">
              <div
                className="h-full rounded transition-all duration-500"
                style={{
                  width: `${(row[activeMetric] / maxVal) * 100}%`,
                  backgroundColor: activeMetric === 'cpl' && row.cpl > 20 ? C.red : metricColor[activeMetric],
                  opacity: 0.85,
                }}
              />
              <span className="absolute inset-0 flex items-center px-2 text-[10px] font-medium text-foreground">
                {metricFmt[activeMetric](row[activeMetric])}
              </span>
            </div>
            <span
              className="text-xs font-semibold text-right"
              style={{ color: row.cpl > 20 ? C.red : C.success }}
            >
              {formatCurrency(row.cpl)}
            </span>
          </div>
        ))}

        <div className="grid grid-cols-[120px_1fr_80px] text-[10px] text-muted-foreground mt-1 pt-1 border-t border-border">
          <span />
          <span>{metricLabel[activeMetric]}</span>
          <span className="text-right">CPL</span>
        </div>
      </div>
    </div>
  )
}

export function TabBreakdowns() {
  return (
    <div className="space-y-4">
      <div>
        <h4 className="text-sm font-semibold text-foreground mb-1">Posicionamento</h4>
        <p className="text-xs text-muted-foreground mb-4">
          Selecione a métrica para ordenar — CPL sempre visível à direita
        </p>
        <BreakdownBars data={breakdownPlacement} />
      </div>
    </div>
  )
}
