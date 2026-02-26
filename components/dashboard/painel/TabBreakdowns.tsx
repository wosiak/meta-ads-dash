'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { getBreakdownData } from '@/app/actions/getBreakdownData'
import type { BreakdownDimension, BreakdownRow } from '@/lib/dashboard'
import { formatCurrency } from '@/lib/formatters'
import { periodToDates, DEFAULT_PERIOD } from '@/lib/periods'
import { C } from '@/lib/mockDataPainel'

// ─── Configuração das dimensões ───────────────────────────────────────────────

const DIMENSIONS: { key: BreakdownDimension; label: string }[] = [
  { key: 'placement', label: 'Posicionamento' },
  { key: 'device',    label: 'Dispositivo' },
  { key: 'age',       label: 'Idade' },
  { key: 'gender',    label: 'Gênero' },
]

// ─── Configuração das métricas ────────────────────────────────────────────────

type MetricKey = 'spend' | 'results' | 'cpl'

const METRIC_LABEL: Record<MetricKey, string> = {
  spend:   'Gasto',
  results: 'Resultados',
  cpl:     'CPL',
}
const METRIC_COLOR: Record<MetricKey, string> = {
  spend:   C.teal,
  results: C.amber,
  cpl:     C.success,
}
const CPL_TARGET = 20

// ─── Skeleton de carregamento ─────────────────────────────────────────────────

function BreakdownSkeleton() {
  return (
    <div className="space-y-2 animate-pulse">
      {[100, 70, 45].map(w => (
        <div key={w} className="grid grid-cols-[120px_1fr_80px] items-center gap-3">
          <div className="h-3 rounded bg-secondary" style={{ width: `${w * 0.8}%` }} />
          <div className="h-6 rounded bg-secondary" style={{ width: `${w}%` }} />
          <div className="h-3 rounded bg-secondary w-12 ml-auto" />
        </div>
      ))}
    </div>
  )
}

// ─── Barras de uma dimensão ───────────────────────────────────────────────────

function BreakdownBars({ data }: { data: BreakdownRow[] }) {
  const [activeMetric, setActiveMetric] = useState<MetricKey>('spend')

  const sorted = [...data].sort((a, b) => b[activeMetric] - a[activeMetric])
  const maxVal = Math.max(...sorted.map(d => d[activeMetric]), 1)

  const fmtMetric = (v: number) =>
    activeMetric === 'results' ? String(v) : formatCurrency(v)

  return (
    <div>
      {/* Seletor de métrica */}
      <div className="flex flex-wrap gap-1 mb-4">
        {(Object.keys(METRIC_LABEL) as MetricKey[]).map(m => (
          <button
            key={m}
            onClick={() => setActiveMetric(m)}
            className={[
              'text-xs px-2.5 py-1 rounded-full border transition-colors',
              activeMetric === m
                ? 'border-teal-500 text-teal-400 bg-teal-500/10'
                : 'border-border text-muted-foreground hover:border-muted-foreground',
            ].join(' ')}
          >
            {METRIC_LABEL[m]}
          </button>
        ))}
        <span className="ml-auto text-xs text-muted-foreground self-center">
          CPL sempre visível →
        </span>
      </div>

      {/* Barras */}
      <div className="space-y-2">
        {sorted.map((row, i) => (
          <div key={`${row.label}-${i}`} className="grid grid-cols-[120px_1fr_80px] items-center gap-3">
            <span className="text-xs text-muted-foreground truncate">{row.label}</span>
            <div className="relative h-6 bg-secondary rounded overflow-hidden">
              <div
                className="h-full rounded transition-all duration-500"
                style={{
                  width: `${(row[activeMetric] / maxVal) * 100}%`,
                  backgroundColor:
                    activeMetric === 'cpl' && row.cpl > CPL_TARGET
                      ? C.red
                      : METRIC_COLOR[activeMetric],
                  opacity: 0.85,
                }}
              />
              <span className="absolute inset-0 flex items-center px-2 text-[10px] font-medium text-foreground">
                {fmtMetric(row[activeMetric])}
              </span>
            </div>
            <span
              className="text-xs font-semibold text-right"
              style={{ color: row.cpl > CPL_TARGET ? C.red : C.success }}
            >
              {row.cpl > 0 ? formatCurrency(row.cpl) : '—'}
            </span>
          </div>
        ))}

        <div className="grid grid-cols-[120px_1fr_80px] text-[10px] text-muted-foreground mt-1 pt-1 border-t border-border">
          <span />
          <span>{METRIC_LABEL[activeMetric]}</span>
          <span className="text-right">CPL</span>
        </div>
      </div>
    </div>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────

interface TabBreakdownsProps {
  accountId: string
}

export function TabBreakdowns({ accountId }: TabBreakdownsProps) {
  const searchParams = useSearchParams()
  const urlFrom  = searchParams.get('from')
  const urlTo    = searchParams.get('to')
  const defaults = periodToDates(DEFAULT_PERIOD)
  const dateFrom = urlFrom || defaults.from
  const dateTo   = urlTo   || defaults.to

  const [dimension,  setDimension]  = useState<BreakdownDimension>('placement')
  const [rows,       setRows]       = useState<BreakdownRow[]>([])
  const [isLoading,  setIsLoading]  = useState(false)
  const [error,      setError]      = useState<string | null>(null)

  // Cache em memória: invalidado automaticamente quando conta ou período mudam.
  // Chave de contexto = accountId + dateFrom + dateTo.
  // Chave de dimensão = 'placement' | 'device' | 'age' | 'gender'.
  const cacheRef = useRef<{
    context: string
    data:    Map<BreakdownDimension, BreakdownRow[]>
  }>({ context: '', data: new Map() })

  const load = useCallback(async (
    accId: string,
    from:  string,
    to:    string,
    dim:   BreakdownDimension,
  ) => {
    if (!accId) return

    const context = `${accId}|${from}|${to}`

    // Se o contexto mudou (conta ou período diferente), limpa todo o cache
    if (cacheRef.current.context !== context) {
      cacheRef.current = { context, data: new Map() }
    }

    // Se já temos dados para esta dimensão, usa o cache (sem loading)
    const cached = cacheRef.current.data.get(dim)
    if (cached) {
      setRows(cached)
      return
    }

    // Primeira requisição para esta dimensão no contexto atual
    setIsLoading(true)
    setError(null)
    try {
      const data = await getBreakdownData(accId, from, to, dim)
      cacheRef.current.data.set(dim, data)
      setRows(data)
    } catch {
      setError('Erro ao carregar dados. Tente novamente.')
      setRows([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    load(accountId, dateFrom, dateTo, dimension)
  }, [accountId, dateFrom, dateTo, dimension, load])

  const activeLabel = DIMENSIONS.find(d => d.key === dimension)?.label ?? ''

  return (
    <div className="space-y-4">

      {/* Seletor de dimensão */}
      <div className="flex flex-wrap gap-1">
        {DIMENSIONS.map(d => (
          <button
            key={d.key}
            onClick={() => setDimension(d.key)}
            disabled={isLoading}
            className={[
              'text-xs px-3 py-1.5 rounded-md border transition-colors disabled:opacity-50',
              dimension === d.key
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border text-muted-foreground hover:text-foreground',
            ].join(' ')}
          >
            {d.label}
          </button>
        ))}
        {isLoading && (
          <span className="text-xs text-muted-foreground self-center ml-2 animate-pulse">
            Carregando...
          </span>
        )}
      </div>

      {/* Título + descrição */}
      <div>
        <h4 className="text-sm font-semibold text-foreground mb-1">{activeLabel}</h4>
        <p className="text-xs text-muted-foreground">
          Selecione a métrica para ordenar — CPL sempre visível à direita
        </p>
      </div>

      {/* Conteúdo */}
      {isLoading ? (
        <BreakdownSkeleton />
      ) : error ? (
        <div className="flex items-center justify-center h-24 rounded-lg border border-destructive/30 bg-destructive/5 text-sm text-destructive">
          {error}
        </div>
      ) : rows.length === 0 ? (
        <div className="flex items-center justify-center h-24 rounded-lg border border-dashed border-border">
          <p className="text-sm text-muted-foreground">
            Sem dados de {activeLabel.toLowerCase()} para o período selecionado.
          </p>
        </div>
      ) : (
        <BreakdownBars data={rows} />
      )}
    </div>
  )
}
