'use server'

import { getBreakdownData as fetchBreakdown } from '@/lib/dashboard'
import type { BreakdownDimension, BreakdownRow } from '@/lib/dashboard'

/**
 * Server Action: retorna dados de breakdown para a dimensão solicitada.
 * Chamada pelo TabBreakdowns (Client Component) ao trocar dimensão ou período.
 */
export async function getBreakdownData(
  accountId: string,
  dateFrom:  string,
  dateTo:    string,
  dimension: BreakdownDimension,
): Promise<BreakdownRow[]> {
  if (!accountId || !dateFrom || !dateTo) return []
  return fetchBreakdown(accountId, dateFrom, dateTo, dimension)
}
