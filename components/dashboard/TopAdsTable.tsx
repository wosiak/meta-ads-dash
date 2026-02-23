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
import Image from 'next/image'

interface TopAdsTableProps {
  data: TopAd[]
}

export function TopAdsTable({ data }: TopAdsTableProps) {
  if (data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>🏆 Top Anúncios (Campeões)</CardTitle>
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
        <CardTitle>🏆 Top Anúncios (Campeões)</CardTitle>
        <p className="text-sm text-muted-foreground">
          Anúncios com melhor custo por lead no período
        </p>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[50px]">#</TableHead>
              <TableHead>Anúncio</TableHead>
              <TableHead className="text-right">Investimento</TableHead>
              <TableHead className="text-right">Leads</TableHead>
              <TableHead className="text-right">CPL</TableHead>
              <TableHead className="text-right">CTR</TableHead>
              <TableHead className="text-right">Alcance</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.map((ad, index) => (
              <TableRow key={ad.id}>
                <TableCell className="font-medium">
                  {index + 1}
                  {index === 0 && ' 🥇'}
                  {index === 1 && ' 🥈'}
                  {index === 2 && ' 🥉'}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-3">
                    {ad.imageUrl ? (
                      <Image
                        src={ad.imageUrl}
                        alt={ad.name}
                        width={40}
                        height={40}
                        className="rounded object-cover"
                        unoptimized
                      />
                    ) : (
                      <div className="w-10 h-10 bg-gray-200 rounded flex items-center justify-center text-xl">
                        📢
                      </div>
                    )}
                    <span className="font-medium max-w-[300px] truncate">
                      {ad.name}
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-right">
                  {new Intl.NumberFormat('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                  }).format(ad.spend)}
                </TableCell>
                <TableCell className="text-right font-medium">
                  {ad.leads.toLocaleString('pt-BR')}
                </TableCell>
                <TableCell className="text-right text-green-600 font-semibold">
                  {new Intl.NumberFormat('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                  }).format(ad.cpl)}
                </TableCell>
                <TableCell className="text-right">
                  {ad.ctr.toFixed(2)}%
                </TableCell>
                <TableCell className="text-right">
                  {ad.reach.toLocaleString('pt-BR')}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
