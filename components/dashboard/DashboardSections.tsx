'use client'

/**
 * DashboardSections
 *
 * Client Component que recebe os dados pré-buscados do Server Component (page.tsx)
 * e monta os blocos arrastáveis do DashboardGrid.
 */

import React, { useMemo } from 'react'
import { cn } from '@/lib/utils'
import { DashboardGrid, type BlockConfig } from './DashboardGrid'
import { TrendChart }       from './TrendChart'
import { DiagnosticoBlock } from './DiagnosticoBlock'
import { TabBreakdowns }    from './painel/TabBreakdowns'
import { TopAdsTable }      from './TopAdsTable'
import type { TopAd }       from '@/types/database'
import { campaigns, statusCounts, type Status } from '@/lib/mockData'
import { formatCurrency } from '@/lib/formatters'

const statusBadgeClass: Record<Status, string> = {
  active:   'badge-active',
  paused:   'badge-paused',
  review:   'badge-review',
  rejected: 'badge-rejected',
  error:    'badge-error',
}

interface CampaignOption {
  metaCampaignId: string
  campaignName:   string
}

interface DashboardSectionsProps {
  accountId:  string
  campaigns:  CampaignOption[]
  topAds:     TopAd[]
}

export function DashboardSections({ accountId, campaigns: campaignOptions, topAds }: DashboardSectionsProps) {
  const sorted    = useMemo(() => [...campaigns].sort((a, b) => a.costPerResult - b.costPerResult), [])
  const top5      = sorted.slice(0, 5)
  const bottom5   = sorted.slice(-5).reverse()

  const blocks: BlockConfig[] = useMemo(() => [
    {
      id:    'trend',
      title: 'Tendência no Tempo',
      content: (
        <TrendChart
          accountId={accountId}
          campaigns={campaignOptions}
        />
      ),
    },
    {
      id:    'diagnostico',
      title: 'Diagnóstico',
      content: <DiagnosticoBlock accountId={accountId} />,
    },
    {
      id:    'breakdowns',
      title: 'Breakdowns',
      content: <TabBreakdowns />,
    },
    {
      id:    'top-ads',
      title: 'Top Anúncios por CPL',
      content: <TopAdsTable data={topAds} />,
    },
    {
      id:    'status',
      title: 'Distribuição por Status',
      content: (
        <div className="flex flex-wrap gap-3">
          {statusCounts.map(s => (
            <div
              key={s.status}
              className={cn(
                'inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium border',
                statusBadgeClass[s.status],
              )}
            >
              {s.label}
              <span className="text-xs opacity-70">{s.count}</span>
            </div>
          ))}
        </div>
      ),
    },
    {
      id:    'ranking',
      title: 'Top 5 & Bottom 5',
      content: (
        <div className="grid gap-4 lg:grid-cols-2">
          <div>
            <p className="text-xs text-muted-foreground mb-2">🏆 Melhor CPL</p>
            <div className="space-y-1">
              {top5.map((c, i) => (
                <div key={c.id} className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-secondary/30">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs text-muted-foreground w-4">{i + 1}.</span>
                    <span className="text-sm truncate">{c.name}</span>
                  </div>
                  <span className="text-sm font-semibold cpl-good shrink-0 ml-2">
                    {formatCurrency(c.costPerResult)}
                  </span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-2">⚠️ Pior CPL</p>
            <div className="space-y-1">
              {bottom5.map((c, i) => (
                <div key={c.id} className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-secondary/30">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs text-muted-foreground w-4">{i + 1}.</span>
                    <span className="text-sm truncate">{c.name}</span>
                  </div>
                  <span className={cn(
                    'text-sm font-semibold shrink-0 ml-2',
                    c.costPerResult > 30 ? 'cpl-bad' : 'cpl-attention',
                  )}>
                    {formatCurrency(c.costPerResult)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ),
    },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [accountId, campaignOptions, topAds])

  return <DashboardGrid blocks={blocks} />
}
