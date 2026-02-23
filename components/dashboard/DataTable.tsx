'use client'

import { useState, useMemo } from 'react'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { type EntityRow, type Status } from '@/lib/mockData'
import { formatCurrency, formatNumber, getCplClass } from '@/lib/formatters'
import { cn } from '@/lib/utils'
import { ArrowUpDown, Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface DataTableProps {
  data: EntityRow[]
  cplTarget?: number
  onRowClick?: (row: EntityRow) => void
}

type SortKey = keyof EntityRow

const statusLabel: Record<Status, string> = {
  active: 'Ativo',
  paused: 'Pausado',
  review: 'Em análise',
  rejected: 'Rejeitado',
  error: 'Com erro',
}

const statusBadgeClass: Record<Status, string> = {
  active: 'badge-active',
  paused: 'badge-paused',
  review: 'badge-review',
  rejected: 'badge-rejected',
  error: 'badge-error',
}

export function DataTable({ data, cplTarget = 20, onRowClick }: DataTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('spend')
  const [sortAsc, setSortAsc] = useState(false)
  const [page, setPage] = useState(0)
  const pageSize = 10

  const sorted = useMemo(() => {
    return [...data].sort((a, b) => {
      const aVal = a[sortKey]
      const bVal = b[sortKey]
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortAsc ? aVal - bVal : bVal - aVal
      }
      return sortAsc
        ? String(aVal).localeCompare(String(bVal))
        : String(bVal).localeCompare(String(aVal))
    })
  }, [data, sortKey, sortAsc])

  const paged = sorted.slice(page * pageSize, (page + 1) * pageSize)
  const totalPages = Math.ceil(sorted.length / pageSize)

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) setSortAsc((a) => !a)
    else {
      setSortKey(key)
      setSortAsc(false)
    }
  }

  const SortHeader = ({ label, col }: { label: string; col: SortKey }) => (
    <button
      className="flex items-center gap-1 hover:text-foreground transition-colors"
      onClick={() => toggleSort(col)}
    >
      {label}
      <ArrowUpDown className="h-3 w-3" />
    </button>
  )

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow className="bg-secondary/50 hover:bg-secondary/50">
              <TableHead className="min-w-[200px] sticky left-0 bg-secondary/90 z-10">Nome</TableHead>
              <TableHead className="w-[90px]">Status</TableHead>
              <TableHead><SortHeader label="Orçamento" col="budget" /></TableHead>
              <TableHead><SortHeader label="Spend" col="spend" /></TableHead>
              <TableHead><SortHeader label="Resultados" col="results" /></TableHead>
              <TableHead><SortHeader label="Custo/Res." col="costPerResult" /></TableHead>
              <TableHead><SortHeader label="Alcance" col="reach" /></TableHead>
              <TableHead><SortHeader label="Freq." col="frequency" /></TableHead>
              <TableHead className="w-[60px]">Ação</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paged.map((row) => (
              <TableRow
                key={row.id}
                className="cursor-pointer hover:bg-secondary/30 transition-colors"
                onClick={() => onRowClick?.(row)}
              >
                <TableCell className="font-medium sticky left-0 bg-card z-10 min-w-[200px]">
                  <div>
                    <p className="text-sm truncate max-w-[220px]">{row.name}</p>
                    <p className="text-xs text-muted-foreground">{row.id}</p>
                  </div>
                </TableCell>
                <TableCell>
                  <span className={cn(
                    'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border',
                    statusBadgeClass[row.status]
                  )}>
                    {statusLabel[row.status]}
                  </span>
                </TableCell>
                <TableCell className="text-sm">{formatCurrency(row.budget)}/dia</TableCell>
                <TableCell className="text-sm font-medium">{formatCurrency(row.spend)}</TableCell>
                <TableCell className="text-sm font-medium">{formatNumber(row.results)}</TableCell>
                <TableCell className={cn('text-sm font-semibold', getCplClass(row.costPerResult, cplTarget))}>
                  {formatCurrency(row.costPerResult)}
                </TableCell>
                <TableCell className="text-sm">{formatNumber(row.reach)}</TableCell>
                <TableCell className="text-sm">{row.frequency.toFixed(1)}x</TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" className="h-7 w-7">
                    <Eye className="h-3.5 w-3.5" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>{sorted.length} itens</span>
          <div className="flex gap-1">
            {Array.from({ length: totalPages }, (_, i) => (
              <button
                key={i}
                onClick={() => setPage(i)}
                className={cn(
                  'px-2.5 py-1 rounded text-xs transition-colors',
                  page === i ? 'bg-primary text-primary-foreground' : 'hover:bg-secondary'
                )}
              >
                {i + 1}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
