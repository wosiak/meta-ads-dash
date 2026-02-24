'use server'

import { getCachedOrLiveCampaignMetrics, getCachedOrLiveAdMetrics } from '@/lib/dashboard'

// ─── Tipos exportados ─────────────────────────────────────────────────────────

export type DiagnosticoLevel = 'campaign' | 'ad'

export interface DiagnosticoItem {
  id:            string
  name:          string
  /** Status original da Meta API: ACTIVE, PAUSED, IN_PROCESS, WITH_ISSUES, etc. */
  status:        string
  spend:         number
  cpl:           number
  results:       number
  type:          DiagnosticoLevel
  /** Somente para nível anúncio */
  campaignName?: string
  adSetName?:    string
}

export interface HistogramBin {
  range: string
  count: number
}

export interface DiagnosticoData {
  items:     DiagnosticoItem[]
  histogram: HistogramBin[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function buildHistogram(items: DiagnosticoItem[]): HistogramBin[] {
  const bins: HistogramBin[] = [
    { range: '≤ R$10',  count: 0 },
    { range: 'R$10–20', count: 0 },
    { range: 'R$20–30', count: 0 },
    { range: 'R$30–40', count: 0 },
    { range: '> R$40',  count: 0 },
  ]
  items.forEach(item => {
    if (item.cpl <= 0) return
    const idx = item.cpl <= 10 ? 0 : item.cpl <= 20 ? 1 : item.cpl <= 30 ? 2 : item.cpl <= 40 ? 3 : 4
    bins[idx].count++
  })
  return bins.filter(b => b.count > 0)
}

// ─── Server Action ────────────────────────────────────────────────────────────

/**
 * Retorna dados para o Diagnóstico no nível escolhido (campanha ou anúncio).
 * - level='campaign': usa cache de campaign_metrics_cache
 * - level='ad': usa cache de ad_metrics_cache
 */
export async function getDiagnosticoData(
  accountId: string,
  dateFrom:  string,
  dateTo:    string,
  level:     DiagnosticoLevel = 'campaign',
): Promise<DiagnosticoData> {
  if (!accountId || !dateFrom || !dateTo) {
    return { items: [], histogram: [] }
  }

  if (level === 'campaign') {
    const campaigns = await getCachedOrLiveCampaignMetrics(accountId, dateFrom, dateTo)
    const items: DiagnosticoItem[] = campaigns.map(c => ({
      id:      c.metaCampaignId,
      name:    c.campaignName,
      status:  c.campaignStatus ?? 'UNKNOWN',
      spend:   c.totalSpend,
      cpl:     c.avgCPL,
      results: c.totalResults,
      type:    'campaign',
    }))
    return { items, histogram: buildHistogram(items) }
  }

  // Nível Anúncio
  const ads = await getCachedOrLiveAdMetrics(accountId, dateFrom, dateTo)
  const items: DiagnosticoItem[] = ads.map(a => ({
    id:           a.metaAdId,
    name:         a.adName,
    status:       a.adStatus,
    spend:        a.spend,
    cpl:          a.cpl,
    results:      a.results,
    type:         'ad' as const,
    campaignName: a.campaignName || undefined,
    adSetName:    a.adSetName    || undefined,
  }))
  return { items, histogram: buildHistogram(items) }
}
