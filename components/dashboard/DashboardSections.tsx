'use client'

/**
 * DashboardSections
 *
 * Client Component que recebe os dados pré-buscados do Server Component (page.tsx)
 * e monta os blocos arrastáveis do DashboardGrid.
 */

import React, { useMemo } from 'react'
import { DashboardGrid, type BlockConfig } from './DashboardGrid'
import { TrendChart }       from './TrendChart'
import { DiagnosticoBlock } from './DiagnosticoBlock'
import { TabBreakdowns }    from './painel/TabBreakdowns'
import { TopAdsTable }      from './TopAdsTable'
import type { TopAd }       from '@/types/database'

interface CampaignOption {
  metaCampaignId: string
  campaignName:   string
}

interface DashboardSectionsProps {
  accountId:  string
  campaigns:  CampaignOption[]
  topAds:     TopAd[]
  bottomAds:  TopAd[]
}

export function DashboardSections({ accountId, campaigns: campaignOptions, topAds, bottomAds }: DashboardSectionsProps) {
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
      content: <TabBreakdowns accountId={accountId} />,
    },
    {
      id:    'top-ads',
      title: 'Top 5 Melhores Anúncios',
      content: <TopAdsTable data={topAds} variant="best" />,
    },
    {
      id:    'ranking',
      title: 'Top 5 Piores Anúncios',
      content: <TopAdsTable data={bottomAds} variant="worst" />,
    },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [accountId, campaignOptions, topAds, bottomAds])

  return <DashboardGrid blocks={blocks} />
}
