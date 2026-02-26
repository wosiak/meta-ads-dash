'use server'

import { fetchEntityDailyInsights } from '@/lib/meta-api'

export interface DailyPoint {
  date: string
  spend: number
  results: number
  cpl: number
}

export async function getEntityTrend(
  entityId: string,
  dateFrom: string,
  dateTo: string,
): Promise<DailyPoint[]> {
  if (!entityId) return []
  try {
    return await fetchEntityDailyInsights(entityId, dateFrom, dateTo)
  } catch {
    return []
  }
}
