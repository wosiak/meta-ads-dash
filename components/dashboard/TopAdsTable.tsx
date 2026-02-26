'use client'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { TopAd } from '@/types/database'
import { formatCurrency, formatNumber, formatCompact } from '@/lib/formatters'
import Image from 'next/image'

type Variant = 'best' | 'worst'

interface TopAdsTableProps {
  data:     TopAd[]
  variant?: Variant
}

const BEST_RANK  = ['🥇', '🥈', '🥉']
const WORST_RANK = ['💀', '⚠️', '🔴']

const CONFIG: Record<Variant, {
  title:    string
  subtitle: string
  rankFn:   (i: number) => string
  cplClass: string
}> = {
  best: {
    title:    '🏆 Top 5 Melhores Anúncios',
    subtitle: 'Anúncios com melhor custo por resultado no período',
    rankFn:   i => BEST_RANK[i]  ?? String(i + 1),
    cplClass: 'text-green-500',
  },
  worst: {
    title:    '⚠️ Top 5 Piores Anúncios',
    subtitle: 'Anúncios com maior custo por resultado — candidatos a pausar ou revisar',
    rankFn:   i => WORST_RANK[i] ?? String(i + 1),
    cplClass: 'text-red-500',
  },
}

export function TopAdsTable({ data, variant = 'best' }: TopAdsTableProps) {
  const cfg = CONFIG[variant]

  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{cfg.title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-8">
            Nenhum anúncio com dados no período selecionado.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{cfg.title}</CardTitle>
        <p className="text-sm text-muted-foreground">{cfg.subtitle}</p>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40px]">#</TableHead>
              <TableHead>Anúncio</TableHead>
              <TableHead className="text-right">Investimento</TableHead>
              <TableHead className="text-right">Resultados</TableHead>
              <TableHead className="text-right">Custo/Result.</TableHead>
              <TableHead className="text-right">CTR</TableHead>
              <TableHead className="text-right">Alcance</TableHead>
              <TableHead className="text-right">Impressões</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((ad, index) => (
              <TableRow key={ad.id}>
                <TableCell className="font-medium text-muted-foreground">
                  {cfg.rankFn(index)}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-3">
                    {ad.imageUrl ? (
                      <Image
                        src={ad.imageUrl}
                        alt={ad.name}
                        width={40}
                        height={40}
                        className="rounded object-cover shrink-0"
                        unoptimized
                      />
                    ) : (
                      <div className="w-10 h-10 bg-muted rounded flex items-center justify-center text-lg shrink-0">
                        📢
                      </div>
                    )}
                    <span className="font-medium max-w-[260px] truncate text-sm">
                      {ad.name}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-right text-sm">
                  {formatCurrency(ad.spend)}
                </TableCell>
                <TableCell className="text-right font-semibold">
                  {formatNumber(ad.results)}
                </TableCell>
                <TableCell className={`text-right font-semibold ${cfg.cplClass}`}>
                  {ad.costPerResult > 0 ? formatCurrency(ad.costPerResult) : '—'}
                </TableCell>
                <TableCell className="text-right text-sm">
                  {ad.ctr.toFixed(2)}%
                </TableCell>
                <TableCell className="text-right text-sm">
                  {formatCompact(ad.reach)}
                </TableCell>
                <TableCell className="text-right text-sm">
                  {formatCompact(ad.impressions)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
