'use server'

import { getCachedOrLiveCampaignTrend, type TrendPoint } from '@/lib/dashboard'

/**
 * Server Action: retorna dados diários de tendência para o gráfico.
 * Chamada pelo TrendChart (Client Component) ao trocar campanha ou período.
 */
export async function getCampaignTrend(
  accountId:      string,
  metaCampaignId: string | null,  // null = conta inteira ("Geral")
  dateFrom:       string,
  dateTo:         string,
): Promise<TrendPoint[]> {
  if (!accountId || !dateFrom || !dateTo) return []
  return getCachedOrLiveCampaignTrend(accountId, metaCampaignId, dateFrom, dateTo)
}
