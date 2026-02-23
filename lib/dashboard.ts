import { supabaseAdmin } from './supabase'
import type { DashboardMetrics, TopAd, ChartData, MetaAdAccount, CampaignMetrics } from '@/types/database'
import {
  fetchCampaignLevelInsights,
  fetchAdAccountsFromMeta,
  fetchCampaignDailyInsights,
  fetchAccountDailyInsights,
  type TrendPoint,
} from './meta-api'

export type { TrendPoint }
import { EXCLUDED_META_ACCOUNT_IDS } from './constants'

// ─── Sincronização de contas da Meta API → Supabase ──────────────────────────

const ACCOUNT_STATUS_LABEL: Record<number, string> = {
  1:   'ACTIVE',
  2:   'DISABLED',
  3:   'UNSETTLED',
  7:   'PENDING_RISK_REVIEW',
  8:   'PENDING_SETTLEMENT',
  9:   'IN_GRACE_PERIOD',
  100: 'PENDING_CLOSURE',
  101: 'CLOSED',
}

/**
 * Busca todas as contas da Meta API e sincroniza na tabela meta_ad_accounts.
 *
 * - Upsert pelo campo meta_account_id (evita duplicatas)
 * - Associa todas ao clientId fornecido
 * - Atualiza nome, status e currency se a conta já existir
 *
 * Retorna a lista de contas após o sync.
 */
export async function syncAdAccountsForClient(clientId: string): Promise<MetaAdAccount[]> {
  const allMetaAccounts = await fetchAdAccountsFromMeta()

  // Remove contas da lista de exclusão antes de salvar
  const metaAccounts = allMetaAccounts.filter(a => !EXCLUDED_META_ACCOUNT_IDS.has(a.id))

  if (metaAccounts.length === 0) return []

  const now  = new Date().toISOString()
  const rows = metaAccounts.map(a => ({
    client_id:        clientId,
    // A Meta API retorna "act_XXXXXXXXX"; guardamos sem o prefixo act_
    meta_account_id:  a.id,
    account_name:     a.name,
    account_status:   ACCOUNT_STATUS_LABEL[a.account_status] ?? String(a.account_status),
    currency:         a.currency,
    last_sync_at:     now,
    updated_at:       now,
  }))

  const { error } = await supabaseAdmin
    .from('meta_ad_accounts')
    .upsert(rows, { onConflict: 'client_id,meta_account_id', ignoreDuplicates: false })

  if (error) throw new Error(`syncAdAccountsForClient: ${error.message}`)

  // Retorna a lista atualizada do banco
  return getAdAccounts(clientId)
}

/**
 * Busca todas as contas de anúncio de um cliente
 */
export async function getAdAccounts(clientId: string): Promise<MetaAdAccount[]> {
  try {
    const { data, error } = await supabaseAdmin
      .from('meta_ad_accounts')
      .select('id, client_id, meta_account_id, account_name, account_status, currency, last_sync_at, created_at, updated_at')
      .eq('client_id', clientId)
      .order('account_name')

    if (error || !data) return []
    // Garante que contas excluídas não apareçam, mesmo se já estiverem no banco
    return (data as MetaAdAccount[]).filter(
      a => !EXCLUDED_META_ACCOUNT_IDS.has(a.meta_account_id)
    )
  } catch (error) {
    console.error('Error getting ad accounts:', error)
    return []
  }
}


/**
 * Resolve os IDs de conta a usar: conta específica ou todas do cliente
 */
async function resolveAccountIds(clientId: string, accountId?: string): Promise<string[]> {
  if (accountId) return [accountId]
  const { data } = await supabaseAdmin
    .from('meta_ad_accounts')
    .select('id')
    .eq('client_id', clientId)
  return data?.map(a => a.id) ?? []
}

/**
 * Busca métricas agregadas do dashboard para um cliente
 */
export async function getDashboardMetrics(
  clientId: string,
  dateStart: string,
  dateStop: string,
  accountId?: string
): Promise<DashboardMetrics> {
  try {
    const accountIds = await resolveAccountIds(clientId, accountId)

    const { data: insights, error } = await supabaseAdmin
      .from('ad_insights')
      .select('*')
      .in('meta_ad_account_id', accountIds)
      .gte('date_start', dateStart)
      .lte('date_stop', dateStop)

    if (error || !insights || insights.length === 0) {
      return {
        totalSpend: 0, totalLeads: 0, avgCPL: 0, avgCTR: 0,
        totalReach: 0, avgFrequency: 0, totalImpressions: 0, avgCPM: 0,
      }
    }

    const totalSpend = insights.reduce((sum, i) => sum + Number(i.spend), 0)
    const totalLeads = insights.reduce((sum, i) => sum + Number(i.leads), 0)
    const totalReach = insights.reduce((sum, i) => sum + Number(i.reach), 0)
    const totalImpressions = insights.reduce((sum, i) => sum + Number(i.impressions), 0)
    const avgCTR = insights.reduce((sum, i) => sum + Number(i.ctr), 0) / insights.length
    const avgFrequency = insights.reduce((sum, i) => sum + Number(i.frequency), 0) / insights.length
    const avgCPM = insights.reduce((sum, i) => sum + Number(i.cpm), 0) / insights.length
    const avgCPL = totalLeads > 0 ? totalSpend / totalLeads : 0

    return {
      totalSpend, totalLeads, avgCPL, avgCTR,
      totalReach, avgFrequency, totalImpressions, avgCPM,
    }
  } catch (error) {
    console.error('Error getting dashboard metrics:', error)
    return {
      totalSpend: 0, totalLeads: 0, avgCPL: 0, avgCTR: 0,
      totalReach: 0, avgFrequency: 0, totalImpressions: 0, avgCPM: 0,
    }
  }
}

/**
 * Busca top anúncios (campeões) por CPL
 */
export async function getTopAds(
  clientId: string,
  dateStart: string,
  dateStop: string,
  limit: number = 10,
  accountId?: string
): Promise<TopAd[]> {
  try {
    const accountIds = await resolveAccountIds(clientId, accountId)
    if (accountIds.length === 0) return []

    // Buscar insights agregados por anúncio
    const { data: insights, error } = await supabaseAdmin
      .from('ad_insights')
      .select(`
        ad_id,
        spend,
        leads,
        cost_per_lead,
        ctr,
        reach,
        ads (
          name,
          creative_image_url
        )
      `)
      .in('meta_ad_account_id', accountIds)
      .gte('date_start', dateStart)
      .lte('date_stop', dateStop)
      .not('ad_id', 'is', null)

    if (error || !insights) {
      return []
    }

    // Agrupar por anúncio
    const adMap = new Map<string, {
      id: string
      name: string
      imageUrl?: string
      spend: number
      leads: number
      cpl: number
      ctr: number
      reach: number
      count: number
    }>()

    insights.forEach((insight: any) => {
      if (!insight.ad_id) return

      const existing = adMap.get(insight.ad_id)
      const adName = insight.ads?.name || 'Sem nome'
      const imageUrl = insight.ads?.creative_image_url

      if (existing) {
        existing.spend += Number(insight.spend)
        existing.leads += Number(insight.leads)
        existing.reach += Number(insight.reach)
        existing.ctr += Number(insight.ctr)
        existing.count += 1
      } else {
        adMap.set(insight.ad_id, {
          id: insight.ad_id,
          name: adName,
          imageUrl,
          spend: Number(insight.spend),
          leads: Number(insight.leads),
          cpl: Number(insight.cost_per_lead),
          ctr: Number(insight.ctr),
          reach: Number(insight.reach),
          count: 1,
        })
      }
    })

    // Calcular CPL e CTR médios
    const topAds: TopAd[] = Array.from(adMap.values())
      .map(ad => ({
        ...ad,
        cpl: ad.leads > 0 ? ad.spend / ad.leads : 0,
        ctr: ad.ctr / ad.count,
      }))
      .filter(ad => ad.leads > 0) // Apenas anúncios com leads
      .sort((a, b) => a.cpl - b.cpl) // Ordenar por menor CPL
      .slice(0, limit)

    return topAds
  } catch (error) {
    console.error('Error getting top ads:', error)
    return []
  }
}

/**
 * Busca dados para gráfico de período
 */
export async function getChartData(
  clientId: string,
  dateStart: string,
  dateStop: string
): Promise<ChartData[]> {
  try {
    // Buscar todas as contas do cliente
    const { data: accounts } = await supabaseAdmin
      .from('meta_ad_accounts')
      .select('id')
      .eq('client_id', clientId)

    if (!accounts || accounts.length === 0) {
      return []
    }

    const accountIds = accounts.map(a => a.id)

    // Buscar insights agrupados por data
    const { data: insights, error } = await supabaseAdmin
      .from('ad_insights')
      .select('date_start, spend, leads, cost_per_lead, reach')
      .in('meta_ad_account_id', accountIds)
      .gte('date_start', dateStart)
      .lte('date_stop', dateStop)
      .order('date_start', { ascending: true })

    if (error || !insights) {
      return []
    }

    // Agrupar por data
    const dateMap = new Map<string, {
      date: string
      spend: number
      leads: number
      reach: number
      count: number
    }>()

    insights.forEach((insight: any) => {
      const date = insight.date_start
      const existing = dateMap.get(date)

      if (existing) {
        existing.spend += Number(insight.spend)
        existing.leads += Number(insight.leads)
        existing.reach += Number(insight.reach)
        existing.count += 1
      } else {
        dateMap.set(date, {
          date,
          spend: Number(insight.spend),
          leads: Number(insight.leads),
          reach: Number(insight.reach),
          count: 1,
        })
      }
    })

    // Converter para array e calcular CPL
    const chartData: ChartData[] = Array.from(dateMap.values())
      .map(data => ({
        date: data.date,
        spend: data.spend,
        leads: data.leads,
        cpl: data.leads > 0 ? data.spend / data.leads : 0,
        reach: data.reach,
      }))
      .sort((a, b) => a.date.localeCompare(b.date))

    return chartData
  } catch (error) {
    console.error('Error getting chart data:', error)
    return []
  }
}

// ─── Cache de métricas por campanha ──────────────────────────────────────────

/**
 * Retorna métricas de todas as campanhas da conta para o período solicitado.
 *
 * Mesma lógica de cache do getCachedOrLiveMetrics:
 *  - Busca em `campaign_metrics_cache` onde (conta, from, to) e synced_at = hoje
 *  - Se houver registros → retorna do cache
 *  - Se não houver → chama Meta API (level=campaign) → salva cache → retorna
 */
export async function getCachedOrLiveCampaignMetrics(
  accountId: string, // Supabase UUID de meta_ad_accounts
  dateFrom: string,
  dateTo: string,
): Promise<CampaignMetrics[]> {
  try {
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)

    // 1. Verificar cache do dia para essa conta+período
    const { data: cached } = await supabaseAdmin
      .from('campaign_metrics_cache')
      .select('*')
      .eq('meta_ad_account_id', accountId)
      .eq('date_from', dateFrom)
      .eq('date_to', dateTo)
      .gte('synced_at', todayStart.toISOString())
      .order('spend', { ascending: false })

    if (cached && cached.length > 0) {
      return cached.map(mapCacheRowToCampaignMetrics)
    }

    // 2. Cache inválido/ausente — buscar meta_account_id
    const { data: account } = await supabaseAdmin
      .from('meta_ad_accounts')
      .select('meta_account_id')
      .eq('id', accountId)
      .single()

    if (!account) throw new Error(`Conta ${accountId} não encontrada no Supabase`)

    // 3. Chamar Meta API no nível de campanha
    const campaigns = await fetchCampaignLevelInsights(account.meta_account_id, dateFrom, dateTo)

    if (campaigns.length === 0) return []

    // 4. Salvar cada campanha no cache
    const now = new Date().toISOString()
    const rows = campaigns.map(c => ({
      meta_ad_account_id: accountId,
      meta_campaign_id:   c.metaCampaignId,
      campaign_name:      c.campaignName,
      campaign_status:    c.campaignStatus,
      date_from:          dateFrom,
      date_to:            dateTo,
      spend:              c.spend,
      impressions:        c.impressions,
      reach:              c.reach,
      frequency:          c.frequency,
      clicks:             c.clicks,
      cpm:                c.cpm,
      ctr:                c.ctr,
      leads:              c.leads,
      messages:           c.messages,
      purchases:          c.purchases,
      cost_per_result:    c.costPerResult,
      raw_actions:        c.rawActions,
      synced_at:          now,
    }))

    await supabaseAdmin
      .from('campaign_metrics_cache')
      .upsert(rows, { onConflict: 'meta_ad_account_id,meta_campaign_id,date_from,date_to', ignoreDuplicates: false })

    // 5. Retornar mapeado
    return campaigns.map(c => {
      const totalResults = c.leads || c.messages || c.purchases
      return {
        metaCampaignId:   c.metaCampaignId,
        campaignName:     c.campaignName,
        campaignStatus:   c.campaignStatus,
        totalSpend:       c.spend,
        totalLeads:       c.leads,
        totalMessages:    c.messages,
        totalPurchases:   c.purchases,
        totalResults,
        avgCPL:           c.costPerResult,
        avgCTR:           c.ctr,
        totalReach:       c.reach,
        avgFrequency:     c.frequency,
        totalImpressions: c.impressions,
        avgCPM:           c.cpm,
      }
    })
  } catch (error) {
    console.error('getCachedOrLiveCampaignMetrics error:', error)
    return []
  }
}

// ─── Cache de tendência diária ────────────────────────────────────────────────

/**
 * Retorna os dados diários de tendência (spend, results, cpl) para:
 *  - Uma campanha específica (metaCampaignId fornecido)
 *  - Ou toda a conta (metaCampaignId = null → opção "Geral")
 *
 * Cache diário: se já existir registro para (conta, campanha, from, to) feito hoje, retorna do cache.
 */
export async function getCachedOrLiveCampaignTrend(
  accountId:        string,         // Supabase UUID
  metaCampaignId:   string | null,  // null = conta inteira
  dateFrom:         string,
  dateTo:           string,
): Promise<TrendPoint[]> {
  try {
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)

    // Busca cache do dia
    const query = supabaseAdmin
      .from('campaign_trend_cache')
      .select('trend_data')
      .eq('meta_ad_account_id', accountId)
      .eq('date_from', dateFrom)
      .eq('date_to', dateTo)
      .gte('synced_at', todayStart.toISOString())

    // Filtra por campanha específica ou pelo registro "Geral" (campaign_id = null)
    const cachedQuery = metaCampaignId
      ? query.eq('meta_campaign_id', metaCampaignId)
      : query.is('meta_campaign_id', null)

    const { data: cached } = await cachedQuery.maybeSingle()

    if (cached?.trend_data) {
      return cached.trend_data as TrendPoint[]
    }

    // Cache miss — buscar na Meta API
    const { data: account } = await supabaseAdmin
      .from('meta_ad_accounts')
      .select('meta_account_id')
      .eq('id', accountId)
      .single()

    if (!account) throw new Error(`Conta ${accountId} não encontrada`)

    const points = metaCampaignId
      ? await fetchCampaignDailyInsights(metaCampaignId, dateFrom, dateTo)
      : await fetchAccountDailyInsights(account.meta_account_id, dateFrom, dateTo)

    // Salvar no cache
    await supabaseAdmin
      .from('campaign_trend_cache')
      .upsert({
        meta_ad_account_id: accountId,
        meta_campaign_id:   metaCampaignId ?? null,
        date_from:          dateFrom,
        date_to:            dateTo,
        trend_data:         points,
        synced_at:          new Date().toISOString(),
      }, { onConflict: 'meta_ad_account_id,meta_campaign_id,date_from,date_to', ignoreDuplicates: false })

    return points
  } catch (error) {
    console.error('getCachedOrLiveCampaignTrend error:', error)
    return []
  }
}

function mapCacheRowToCampaignMetrics(row: Record<string, unknown>): CampaignMetrics {
  const leads     = Number(row.leads)     || 0
  const messages  = Number(row.messages)  || 0
  const purchases = Number(row.purchases) || 0
  const totalResults = leads || messages || purchases
  return {
    metaCampaignId:   String(row.meta_campaign_id),
    campaignName:     String(row.campaign_name),
    campaignStatus:   String(row.campaign_status ?? ''),
    totalSpend:       Number(row.spend),
    totalLeads:       leads,
    totalMessages:    messages,
    totalPurchases:   purchases,
    totalResults,
    avgCPL:           Number(row.cost_per_result),
    avgCTR:           Number(row.ctr),
    totalReach:       Number(row.reach),
    avgFrequency:     Number(row.frequency),
    totalImpressions: Number(row.impressions),
    avgCPM:           Number(row.cpm),
  }
}
