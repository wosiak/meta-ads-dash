'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { TabDiagnostico } from './painel/TabDiagnostico'
import { getDiagnosticoData, type DiagnosticoItem, type DiagnosticoData, type DiagnosticoLevel } from '@/app/actions/getDiagnosticoData'
import { getItemDailyTrend, type TrendPoint } from '@/app/actions/getItemDailyTrend'
import { C, TOOLTIP_STYLE, CPL_TARGET } from '@/lib/mockDataPainel'
import { formatCurrency } from '@/lib/formatters'
import { periodToDates, DEFAULT_PERIOD } from '@/lib/periods'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts'

// ─── Mapeamento de status ─────────────────────────────────────────────────────
const STATUS_KEY: Record<string, string> = {
  ACTIVE: 'ACTIVE', PAUSED: 'PAUSED', IN_PROCESS: 'REVIEW',
  WITH_ISSUES: 'ERROR', DELETED: 'ERROR', ARCHIVED: 'PAUSED', UNKNOWN: 'PAUSED',
}
const STATUS_LABEL: Record<string, string> = {
  ACTIVE: 'Ativo', PAUSED: 'Pausado', REVIEW: 'Em análise', ERROR: 'Com erro',
}
const STATUS_COLOR: Record<string, string> = {
  ACTIVE: C.success, PAUSED: C.amber, REVIEW: C.cyan, ERROR: C.red,
}
function normalizeStatus(raw: string): string {
  return STATUS_KEY[raw?.toUpperCase()] ?? 'PAUSED'
}

// ─── Drawer lateral ───────────────────────────────────────────────────────────
function ItemDrawer({
  item,
  accountId,
  dateFrom,
  dateTo,
  level,
  onClose,
}: {
  item:      DiagnosticoItem | null
  accountId: string
  dateFrom:  string
  dateTo:    string
  level:     DiagnosticoLevel
  onClose:   () => void
}) {
  const [trend,    setTrend]    = useState<TrendPoint[]>([])
  const [loadingT, setLoadingT] = useState(false)

  useEffect(() => {
    if (!item) { setTrend([]); return }
    setLoadingT(true)
    getItemDailyTrend(accountId, item.id, level, dateFrom, dateTo)
      .then(setTrend)
      .catch(() => setTrend([]))
      .finally(() => setLoadingT(false))
  }, [item, accountId, level, dateFrom, dateTo])

  if (!item) return null
  const sk        = normalizeStatus(item.status)
  const typeLabel = item.type === 'ad' ? 'Anúncio' : 'Campanha'

  return (
    <Sheet open={!!item} onOpenChange={() => onClose()}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-sm font-semibold text-foreground line-clamp-2">
            {item.name}
          </SheetTitle>
        </SheetHeader>
        <div className="mt-4 space-y-4">

          {/* Hierarquia (campanha / conjunto) — somente para anúncios */}
          {item.type === 'ad' && (item.campaignName || item.adSetName) && (
            <div className="rounded-lg border border-border bg-secondary/50 px-3 py-2 space-y-1">
              {item.campaignName && (
                <p className="text-xs text-muted-foreground">
                  Campanha:{' '}
                  <span className="text-foreground font-medium">{item.campaignName}</span>
                </p>
              )}
              {item.adSetName && (
                <p className="text-xs text-muted-foreground">
                  Conjunto de anúncios:{' '}
                  <span className="text-foreground font-medium">{item.adSetName}</span>
                </p>
              )}
            </div>
          )}

          {/* Métricas principais */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Gasto',      value: formatCurrency(item.spend),          color: C.teal },
              { label: 'Resultados', value: String(item.results),                 color: C.amber },
              { label: 'CPL',        value: formatCurrency(item.cpl),             color: item.cpl > CPL_TARGET ? C.red : C.success },
              { label: 'Status',     value: STATUS_LABEL[sk] ?? item.status,      color: STATUS_COLOR[sk] ?? C.muted },
            ].map(m => (
              <div key={m.label} className="rounded-lg border border-border bg-secondary p-3">
                <p className="text-xs text-muted-foreground">{m.label}</p>
                <p className="text-sm font-bold mt-0.5" style={{ color: m.color }}>{m.value}</p>
              </div>
            ))}
          </div>

          {item.cpl > CPL_TARGET && (
            <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              ⚠ CPL acima da meta de {formatCurrency(CPL_TARGET)}. Avalie pausar ou revisar criativos.
            </p>
          )}

          {/* Gráfico de tendência — dados reais */}
          <div>
            <p className="text-xs text-muted-foreground mb-2">
              Gasto no período selecionado
              {loadingT && <span className="ml-2 animate-pulse">— carregando...</span>}
            </p>
            {!loadingT && trend.length > 0 ? (
              <ResponsiveContainer width="100%" height={140}>
                <LineChart data={trend} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
                  <CartesianGrid stroke={C.grid} strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tick={{ fill: C.muted, fontSize: 9 }}
                    axisLine={false} tickLine={false}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    tick={{ fill: C.muted, fontSize: 9 }}
                    axisLine={false} tickLine={false}
                    tickFormatter={v => `R$${v}`}
                  />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'hsl(222,20%,10%)', border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 11 }}
                    labelStyle={{ color: C.fg }}
                    itemStyle={{ color: C.fg }}
                    formatter={(v: number | undefined) => [formatCurrency(v ?? 0), 'Gasto']}
                  />
                  <Line dataKey="spend" name="Gasto" stroke={C.teal} strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            ) : !loadingT ? (
              <p className="text-xs text-muted-foreground italic">Sem dados diários para o período.</p>
            ) : null}
          </div>

          <p className="text-xs text-muted-foreground">
            Tipo: <strong className="text-foreground">{typeLabel}</strong>
          </p>
        </div>
      </SheetContent>
    </Sheet>
  )
}

// ─── Estado vazio padrão ──────────────────────────────────────────────────────
const EMPTY_DATA: DiagnosticoData = {
  items:     [],
  histogram: [],
}

// ─── Componente principal ─────────────────────────────────────────────────────
interface DiagnosticoBlockProps {
  accountId: string
}

export function DiagnosticoBlock({ accountId }: DiagnosticoBlockProps) {
  const searchParams = useSearchParams()
  const urlFrom  = searchParams.get('from')
  const urlTo    = searchParams.get('to')
  const defaults = periodToDates(DEFAULT_PERIOD)
  const dateFrom = urlFrom || defaults.from
  const dateTo   = urlTo   || defaults.to

  const [level,     setLevel]     = useState<DiagnosticoLevel>('campaign')
  const [data,      setData]      = useState<DiagnosticoData>(EMPTY_DATA)
  const [isLoading, setIsLoading] = useState(false)
  const [error,     setError]     = useState<string | null>(null)
  const [selected,  setSelected]  = useState<DiagnosticoItem | null>(null)

  const load = useCallback(async (
    accId: string,
    from:  string,
    to:    string,
    lvl:   DiagnosticoLevel,
  ) => {
    if (!accId) return
    setIsLoading(true)
    setError(null)
    try {
      const result = await getDiagnosticoData(accId, from, to, lvl)
      setData(result)
    } catch (e) {
      setError('Erro ao carregar dados. Tente novamente.')
      console.error(e)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    load(accountId, dateFrom, dateTo, level)
  }, [accountId, dateFrom, dateTo, level, load])

  return (
    <TooltipProvider>
      {/* Toggle de nível — sempre visível */}
      <div className="flex items-center gap-1 mb-4">
        <span className="text-xs text-muted-foreground mr-1">Visualizar por:</span>
        {(['campaign', 'ad'] as DiagnosticoLevel[]).map(lvl => (
          <button
            key={lvl}
            onClick={() => setLevel(lvl)}
            disabled={isLoading}
            className={[
              'text-xs px-3 py-1.5 rounded-md border transition-colors',
              level === lvl
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border text-muted-foreground hover:text-foreground disabled:opacity-50',
            ].join(' ')}
          >
            {lvl === 'campaign' ? 'Campanhas' : 'Anúncios'}
          </button>
        ))}
        {isLoading && (
          <span className="text-xs text-muted-foreground ml-2 animate-pulse">Carregando...</span>
        )}
      </div>

      {/* Área de conteúdo */}
      {isLoading ? (
        <div className="space-y-4">
          {[320, 180].map(h => (
            <div
              key={h}
              className="rounded-lg border border-border bg-secondary/30 animate-pulse"
              style={{ height: h }}
            />
          ))}
        </div>
      ) : error ? (
        <div className="flex items-center justify-center h-48 rounded-lg border border-destructive/30 bg-destructive/5 text-sm text-destructive">
          {error}
        </div>
      ) : (
        <TabDiagnostico
          items={data.items}
          histogram={data.histogram}
          level={level}
          onSelectItem={setSelected}
          clientMode={false}
        />
      )}

      <ItemDrawer
        item={selected}
        accountId={accountId}
        dateFrom={dateFrom}
        dateTo={dateTo}
        level={level}
        onClose={() => setSelected(null)}
      />
    </TooltipProvider>
  )
}
