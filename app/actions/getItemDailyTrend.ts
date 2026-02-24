'use server'

import { getCachedOrLiveCampaignTrend } from '@/lib/dashboard'
import type { DiagnosticoLevel } from './getDiagnosticoData'

const META_API_BASE  = 'https://graph.facebook.com/v21.0'
const META_APP_TOKEN = process.env.META_APP_ACCESS_TOKEN!

function sumActions(
  actions: Array<{ action_type: string; value: string }>,
  types: string[],
): number {
  return actions
    .filter(a => types.includes(a.action_type))
    .reduce((s, a) => s + parseInt(a.value || '0'), 0)
}

export interface TrendPoint {
  date:    string
  spend:   number
  results: number
  cpl:     number
}

/**
 * Retorna dados diários reais para o item selecionado no drawer do Diagnóstico.
 * - Campanha: usa getCachedOrLiveCampaignTrend (cache Supabase)
 * - Anúncio:  chama Meta API diretamente ({adId}/insights, time_increment=1)
 */
export async function getItemDailyTrend(
  accountId: string,
  itemId:    string,
  level:     DiagnosticoLevel,
  dateFrom:  string,
  dateTo:    string,
): Promise<TrendPoint[]> {
  if (level === 'campaign') {
    const pts = await getCachedOrLiveCampaignTrend(accountId, itemId, dateFrom, dateTo)
    return pts.map(p => ({ date: p.date, spend: p.spend, results: p.results, cpl: p.cpl }))
  }

  // Nível anúncio — sem cache: chamada direta à Meta API
  try {
    const fields    = 'spend,actions,date_start'
    const timeRange = encodeURIComponent(JSON.stringify({ since: dateFrom, until: dateTo }))
    const url       = `${META_API_BASE}/${itemId}/insights?fields=${fields}&time_range=${timeRange}&time_increment=1&access_token=${META_APP_TOKEN}`

    const response: Response                = await fetch(url, { cache: 'no-store' })
    const data:     Record<string, unknown> = await response.json()

    if (data.error) {
      const err = data.error as { message?: string }
      throw new Error(`Meta API Error (ad daily): ${err.message}`)
    }

    const rows = (data.data as Array<Record<string, unknown>>) ?? []
    return rows.map(row => {
      const actions   = (row.actions as Array<{ action_type: string; value: string }>) ?? []
      const leads     = sumActions(actions, ['lead', 'onsite_conversion.lead_grouped'])
      const messages  = sumActions(actions, ['onsite_conversion.messaging_conversation_started_7d'])
      const purchases = sumActions(actions, ['purchase', 'omni_purchase'])
      const results   = leads || messages || purchases
      const spend     = parseFloat((row.spend as string) ?? '0')
      const cpl       = results > 0 ? spend / results : 0
      return { date: row.date_start as string, spend, results, cpl }
    })
  } catch (err) {
    console.error('getItemDailyTrend (ad) error:', err)
    return []
  }
}
