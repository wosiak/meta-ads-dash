'use client'

import { useState, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { ArrowUpDown, ChevronRight, Loader2, AlertCircle, RefreshCw, Clock, Info } from 'lucide-react'
import { formatCurrency, formatNumber, formatCompact, getCplClass } from '@/lib/formatters'
import { cn } from '@/lib/utils'
import { EntityDetailModal } from './EntityDetailModal'

// ─── Tipos ───────────────────────────────────────────────────────────────────

export interface EntityManagerRow {
  id: string
  name: string
  status: string
  type: 'campaign' | 'adset' | 'ad'
  dailyBudget?: number
  lifetimeBudget?: number
  campaignId?: string
  campaignName?: string
  adSetId?: string
  adSetName?: string
  spend: number
  results: number
  costPerResult: number
  impressions: number
  reach: number
  frequency: number
  ctr: number
  cpm: number
}

interface EntityManagerTableProps {
  rows: EntityManagerRow[]
  isLoading?: boolean
  error?: string | null
  cplTarget?: number
  retryIn?: number
  onRetry?: () => void
  /** Texto do botão de drill-down (ex: "Ver Conjuntos") */
  drillDownLabel?: string
  /** Gera a URL de destino dado o id e nome da entidade selecionada */
  drillDownHref?: (id: string, name: string) => string
}

// ─── Mapeamento de status ─────────────────────────────────────────────────────

const STATUS_LABEL: Record<string, string> = {
  ACTIVE:          'Ativo',
  PAUSED:          'Pausado',
  CAMPAIGN_PAUSED: 'Camp. Pausada',
  ADSET_PAUSED:    'Conj. Pausado',
  PENDING_REVIEW:  'Em análise',
  IN_PROCESS:      'Em processamento',
  PREAPPROVED:     'Pré-aprovado',
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
  PREAPPROVED:     'badge-review',
  DISAPPROVED:     'badge-rejected',
  WITH_ISSUES:     'badge-error',
  DELETED:         'badge-paused',
  ARCHIVED:        'badge-paused',
}

type SortKey = keyof EntityManagerRow

// ─── Componente ──────────────────────────────────────────────────────────────

export function EntityManagerTable({
  rows,
  isLoading = false,
  error = null,
  cplTarget = 20,
  retryIn = 0,
  onRetry,
  drillDownLabel,
  drillDownHref,
}: EntityManagerTableProps) {
  const router = useRouter()
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [detailRow, setDetailRow]     = useState<EntityManagerRow | null>(null)
  const [sortKey, setSortKey]   = useState<SortKey>('spend')
  const [sortAsc, setSortAsc]   = useState(false)
  const [page, setPage]         = useState(0)
  const pageSize = 15

  const sorted = useMemo(() => {
    return [...rows].sort((a, b) => {
      const av = a[sortKey], bv = b[sortKey]
      if (typeof av === 'number' && typeof bv === 'number') return sortAsc ? av - bv : bv - av
      return sortAsc
        ? String(av).localeCompare(String(bv))
        : String(bv).localeCompare(String(av))
    })
  }, [rows, sortKey, sortAsc])

  const paged      = sorted.slice(page * pageSize, (page + 1) * pageSize)
  const totalPages = Math.ceil(sorted.length / pageSize)

  const toggleSort = useCallback((key: SortKey) => {
    if (sortKey === key) setSortAsc(a => !a)
    else { setSortKey(key); setSortAsc(false) }
    setPage(0)
  }, [sortKey])

  const toggleRow = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }, [])

  const toggleAll = useCallback(() => {
    setSelectedIds(prev =>
      prev.size === paged.length ? new Set() : new Set(paged.map(r => r.id))
    )
  }, [paged])

  const selectedRows = rows.filter(r => selectedIds.has(r.id))

  const handleDrillDown = useCallback((id: string, name: string) => {
    if (!drillDownHref) return
    router.push(drillDownHref(id, name))
  }, [drillDownHref, router])

  const SortHeader = ({ label, col }: { label: string; col: SortKey }) => (
    <button
      className="flex items-center gap-1 hover:text-foreground transition-colors whitespace-nowrap"
      onClick={() => toggleSort(col)}
    >
      {label}
      <ArrowUpDown className="h-3 w-3 shrink-0" />
    </button>
  )

  const hasBudget = rows.some(r => (r.dailyBudget ?? 0) > 0 || (r.lifetimeBudget ?? 0) > 0)

  // ─── Estados de loading / erro ─────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48 text-muted-foreground gap-2">
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="text-sm">Carregando dados da Meta API...</span>
      </div>
    )
  }

  if (error) {
    const isRateLimit = error === 'RATE_LIMIT'
    return (
      <div className="flex flex-col items-center justify-center h-40 gap-3 text-center">
        {isRateLimit ? (
          <>
            <Clock className="h-8 w-8 text-amber-500" />
            <div>
              <p className="text-sm font-medium text-foreground">Limite de requisições atingido</p>
              <p className="text-xs text-muted-foreground mt-1">
                A Meta API retornou um erro de rate-limit.
                {retryIn > 0 ? ` Tentando novamente em ${retryIn}s...` : ''}
              </p>
            </div>
            {retryIn > 0 ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <div className="w-28 h-1.5 rounded-full bg-secondary overflow-hidden">
                  <div
                    className="h-full bg-amber-500 transition-all duration-1000"
                    style={{ width: `${(retryIn / 30) * 100}%` }}
                  />
                </div>
                <span>{retryIn}s</span>
              </div>
            ) : (
              <Button size="sm" variant="outline" onClick={onRetry} className="gap-1.5">
                <RefreshCw className="h-3.5 w-3.5" />
                Tentar novamente
              </Button>
            )}
          </>
        ) : (
          <>
            <AlertCircle className="h-8 w-8 text-destructive" />
            <div>
              <p className="text-sm font-medium text-foreground">Erro ao carregar dados</p>
              <p className="text-xs text-muted-foreground mt-1">{error}</p>
            </div>
            {onRetry && (
              <Button size="sm" variant="outline" onClick={onRetry} className="gap-1.5">
                <RefreshCw className="h-3.5 w-3.5" />
                Tentar novamente
              </Button>
            )}
          </>
        )}
      </div>
    )
  }

  // ─── Tabela principal ──────────────────────────────────────────────────────

  return (
    <div className="space-y-3">
      {/* Banner de seleção */}
      {selectedIds.size > 0 && (
        <div className="flex items-center justify-between px-4 py-2.5 rounded-lg bg-primary/10 border border-primary/20">
          <span className="text-sm text-primary font-medium">
            {selectedIds.size} {selectedIds.size === 1 ? 'item selecionado' : 'itens selecionados'}
          </span>
          {drillDownLabel && drillDownHref && selectedIds.size === 1 && (
            <Button
              size="sm"
              variant="default"
              className="h-7 gap-1.5 cursor-pointer"
              onClick={() => {
                const row = selectedRows[0]
                handleDrillDown(row.id, row.name)
              }}
            >
              {drillDownLabel}
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      )}

      {/* Tabela */}
      <div className="overflow-x-auto rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow className="bg-secondary/50 hover:bg-secondary/50">
              <TableHead className="w-10 sticky left-0 bg-secondary/90 z-10">
                <Checkbox
                  checked={paged.length > 0 && paged.every(r => selectedIds.has(r.id))}
                  onCheckedChange={toggleAll}
                  aria-label="Selecionar todos"
                />
              </TableHead>
              <TableHead className="min-w-[200px] sticky left-10 bg-secondary/90 z-10">
                <SortHeader label="Nome" col="name" />
              </TableHead>
              <TableHead className="w-[110px]">Status</TableHead>
              {hasBudget && (
                <TableHead><SortHeader label="Orçamento" col="dailyBudget" /></TableHead>
              )}
              <TableHead><SortHeader label="Spend" col="spend" /></TableHead>
              <TableHead><SortHeader label="Resultados" col="results" /></TableHead>
              <TableHead><SortHeader label="Custo/Res." col="costPerResult" /></TableHead>
              <TableHead><SortHeader label="Alcance" col="reach" /></TableHead>
              <TableHead><SortHeader label="Impr." col="impressions" /></TableHead>
              <TableHead><SortHeader label="Freq." col="frequency" /></TableHead>
              <TableHead><SortHeader label="CTR" col="ctr" /></TableHead>
              <TableHead className="w-[120px]" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {paged.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={hasBudget ? 12 : 11}
                  className="h-32 text-center text-muted-foreground text-sm"
                >
                  Nenhum dado encontrado para o período selecionado.
                </TableCell>
              </TableRow>
            )}
            {paged.map(row => {
              const isSelected = selectedIds.has(row.id)
              const budgetValue = (row.dailyBudget ?? 0) > 0
                ? `${formatCurrency(row.dailyBudget!)}/dia`
                : (row.lifetimeBudget ?? 0) > 0
                  ? `${formatCurrency(row.lifetimeBudget!)} total`
                  : '—'

              return (
                <TableRow
                  key={row.id}
                  onClick={() => toggleRow(row.id)}
                  className={cn(
                    'cursor-pointer select-none transition-colors',
                    isSelected ? 'bg-primary/5' : 'hover:bg-secondary/30',
                  )}
                >
                  {/* Checkbox — stopPropagation para não disparar duplo toggle */}
                  <TableCell
                    className="w-10 sticky left-0 z-10 bg-card"
                    onClick={e => e.stopPropagation()}
                  >
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleRow(row.id)}
                      aria-label={`Selecionar ${row.name}`}
                    />
                  </TableCell>

                  <TableCell className="font-medium sticky left-10 z-10 bg-card min-w-[200px]">
                    <div>
                      <p className="text-sm truncate max-w-[240px]">{row.name}</p>
                      <p className="text-xs text-muted-foreground font-mono">{row.id}</p>
                    </div>
                  </TableCell>

                  <TableCell>
                    <span className={cn(
                      'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border',
                      STATUS_CLASS[row.status] ?? 'badge-paused',
                    )}>
                      {STATUS_LABEL[row.status] ?? row.status}
                    </span>
                  </TableCell>

                  {hasBudget && (
                    <TableCell className="text-sm text-muted-foreground">{budgetValue}</TableCell>
                  )}

                  <TableCell className="text-sm font-medium">{formatCurrency(row.spend)}</TableCell>
                  <TableCell className="text-sm font-medium">{formatNumber(row.results)}</TableCell>

                  <TableCell>
                    <span className={cn('text-sm font-semibold', getCplClass(row.costPerResult, cplTarget))}>
                      {row.costPerResult > 0 ? formatCurrency(row.costPerResult) : '—'}
                    </span>
                  </TableCell>

                  <TableCell className="text-sm">{formatCompact(row.reach)}</TableCell>
                  <TableCell className="text-sm">{formatCompact(row.impressions)}</TableCell>
                  <TableCell className="text-sm">{row.frequency.toFixed(1)}x</TableCell>
                  <TableCell className="text-sm">{row.ctr.toFixed(2)}%</TableCell>

                  {/* Ações: Detalhes + drill-down */}
                  <TableCell onClick={e => e.stopPropagation()}>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs gap-1 cursor-pointer text-muted-foreground hover:text-primary hover:bg-primary/10"
                        title="Ver detalhes"
                        onClick={() => setDetailRow(row)}
                      >
                        <Info className="h-3 w-3" />
                        Detalhes
                      </Button>
                      {drillDownLabel && drillDownHref && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 cursor-pointer text-muted-foreground hover:text-primary hover:bg-primary/10"
                          title={drillDownLabel}
                          onClick={() => handleDrillDown(row.id, row.name)}
                        >
                          <ChevronRight className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>

      {/* Paginação */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>{sorted.length} itens</span>
          <div className="flex gap-1">
            {Array.from({ length: totalPages }, (_, i) => (
              <button
                key={i}
                onClick={() => setPage(i)}
                className={cn(
                  'px-2.5 py-1 rounded text-xs transition-colors cursor-pointer',
                  page === i ? 'bg-primary text-primary-foreground' : 'hover:bg-secondary',
                )}
              >
                {i + 1}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Modal de detalhes */}
      <EntityDetailModal
        row={detailRow}
        open={!!detailRow}
        onClose={() => setDetailRow(null)}
        cplTarget={cplTarget}
      />
    </div>
  )
}
