import { supabaseAdmin } from './supabase'
import type { DashboardMetrics, TopAd, ChartData, MetaAdAccount, CampaignMetrics } from '@/types/database'
import {
  fetchCampaignLevelInsights,
  fetchAdLevelInsights,
  fetchAdAccountsFromMeta,
  fetchCampaignDailyInsights,
  fetchAccountDailyInsights,
  fetchTopAdsInsights,
  fetchBreakdownInsights,
  fetchManagerCampaigns,
  fetchManagerAdSets,
  fetchManagerAds,
  type TrendPoint,
  type BreakdownDimension,
  type BreakdownRow,
  type ManagerCampaign,
  type ManagerAdSet,
  type ManagerAd,
} from './meta-api'

export type { ManagerCampaign, ManagerAdSet, ManagerAd }

export type { BreakdownDimension, BreakdownRow }

export type { TrendPoint }
import { EXCLUDED_META_ACCOUNT_IDS } from './constants'

// ─── Sincronização de contas da Meta API → Supabase ──────────────────────────

const ACCOUNT_STATUS_LABEL: Record<number, string> = {
  1: 'ACTIVE',
  2: 'DISABLED',
  3: 'UNSETTLED',
  7: 'PENDING_RISK_REVIEW',
  8: 'PENDING_SETTLEMENT',
  9: 'IN_GRACE_PERIOD',
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

  const now = new Date().toISOString()
  const rows = metaAccounts.map(a => ({
    client_id: clientId,
    // A Meta API retorna "act_XXXXXXXXX"; guardamos sem o prefixo act_
    meta_account_id: a.id,
    account_name: a.name,
    account_status: ACCOUNT_STATUS_LABEL[a.account_status] ?? String(a.account_status),
    currency: a.currency,
    last_sync_at: now,
    updated_at: now,
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
        id:            ad.id,
        name:          ad.name,
        imageUrl:      ad.imageUrl,
        spend:         ad.spend,
        results:       ad.leads,
        costPerResult: ad.leads > 0 ? ad.spend / ad.leads : 0,
        ctr:           ad.ctr / ad.count,
        reach:         ad.reach,
        impressions:   0,
      }))
      .filter(ad => ad.results > 0)
      .sort((a, b) => a.costPerResult - b.costPerResult)
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
      meta_campaign_id: c.metaCampaignId,
      campaign_name: c.campaignName,
      campaign_status: c.campaignStatus,
      date_from: dateFrom,
      date_to: dateTo,
      spend: c.spend,
      impressions: c.impressions,
      reach: c.reach,
      frequency: c.frequency,
      clicks: c.clicks,
      cpm: c.cpm,
      ctr: c.ctr,
      leads: c.leads,
      messages: c.messages,
      purchases: c.purchases,
      cost_per_result: c.costPerResult,
      raw_actions: c.rawActions,
      synced_at: now,
    }))

    await supabaseAdmin
      .from('campaign_metrics_cache')
      .upsert(rows, { onConflict: 'meta_ad_account_id,meta_campaign_id,date_from,date_to', ignoreDuplicates: false })

    // 5. Retornar mapeado
    return campaigns.map(c => {
      const totalResults = c.leads || c.messages || c.purchases
      return {
        metaCampaignId: c.metaCampaignId,
        campaignName: c.campaignName,
        campaignStatus: c.campaignStatus,
        totalSpend: c.spend,
        totalLeads: c.leads,
        totalMessages: c.messages,
        totalPurchases: c.purchases,
        totalResults,
        avgCPL: c.costPerResult,
        avgCTR: c.ctr,
        totalReach: c.reach,
        avgFrequency: c.frequency,
        totalImpressions: c.impressions,
        avgCPM: c.cpm,
      }
    })
  } catch (error) {
    console.error('getCachedOrLiveCampaignMetrics error:', error)
    return []
  }
}

// ─── Cache de métricas por anúncio (Diagnóstico) ──────────────────────────────

export interface AdMetrics {
  metaAdId: string
  adName: string
  adStatus: string
  campaignId: string
  campaignName: string
  adSetId: string
  adSetName: string
  spend: number
  results: number
  cpl: number
}

/**
 * Retorna métricas de todos os anúncios da conta para o período solicitado.
 * Cache diário: se já existir registro para (conta, from, to) feito hoje, retorna do cache.
 */
export async function getCachedOrLiveAdMetrics(
  accountId: string,
  dateFrom: string,
  dateTo: string,
): Promise<AdMetrics[]> {
  try {
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)

    const { data: cached } = await supabaseAdmin
      .from('ad_metrics_cache')
      .select('*')
      .eq('meta_ad_account_id', accountId)
      .eq('date_from', dateFrom)
      .eq('date_to', dateTo)
      .gte('synced_at', todayStart.toISOString())
      .order('spend', { ascending: false })

    if (cached && cached.length > 0) {
      return cached.map(mapCacheRowToAdMetrics)
    }

    const { data: account } = await supabaseAdmin
      .from('meta_ad_accounts')
      .select('meta_account_id')
      .eq('id', accountId)
      .single()

    if (!account) throw new Error(`Conta ${accountId} não encontrada no Supabase`)

    const ads = await fetchAdLevelInsights(account.meta_account_id, dateFrom, dateTo)

    if (ads.length === 0) return []

    const now = new Date().toISOString()
    const rows = ads.map(a => ({
      meta_ad_account_id: accountId,
      meta_ad_id: a.metaAdId,
      ad_name: a.adName,
      ad_status: a.adStatus,
      campaign_id: a.campaignId,
      campaign_name: a.campaignName,
      adset_id: a.adSetId,
      adset_name: a.adSetName,
      date_from: dateFrom,
      date_to: dateTo,
      spend: a.spend,
      results: a.results,
      cost_per_result: a.cpl,
      synced_at: now,
    }))

    await supabaseAdmin
      .from('ad_metrics_cache')
      .upsert(rows, { onConflict: 'meta_ad_account_id,meta_ad_id,date_from,date_to', ignoreDuplicates: false })

    return ads.map(a => ({
      metaAdId: a.metaAdId,
      adName: a.adName,
      adStatus: a.adStatus,
      campaignId: a.campaignId,
      campaignName: a.campaignName,
      adSetId: a.adSetId,
      adSetName: a.adSetName,
      spend: a.spend,
      results: a.results,
      cpl: a.cpl,
    }))
  } catch (error) {
    console.error('getCachedOrLiveAdMetrics error:', error)
    return []
  }
}

function mapCacheRowToAdMetrics(row: Record<string, unknown>): AdMetrics {
  return {
    metaAdId: String(row.meta_ad_id),
    adName: String(row.ad_name),
    adStatus: String(row.ad_status ?? ''),
    campaignId: String(row.campaign_id ?? ''),
    campaignName: String(row.campaign_name ?? ''),
    adSetId: String(row.adset_id ?? ''),
    adSetName: String(row.adset_name ?? ''),
    spend: Number(row.spend),
    results: Number(row.results),
    cpl: Number(row.cost_per_result),
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
  accountId: string,         // Supabase UUID
  metaCampaignId: string | null,  // null = conta inteira
  dateFrom: string,
  dateTo: string,
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
        meta_campaign_id: metaCampaignId ?? null,
        date_from: dateFrom,
        date_to: dateTo,
        trend_data: points,
        synced_at: new Date().toISOString(),
      }, { onConflict: 'meta_ad_account_id,meta_campaign_id,date_from,date_to', ignoreDuplicates: false })

    return points
  } catch (error) {
    console.error('getCachedOrLiveCampaignTrend error:', error)
    return []
  }
}

// ─── Breakdowns ──────────────────────────────────────────────────────────────

/**
 * Retorna dados de breakdown (posicionamento, dispositivo, idade, gênero)
 * chamando a Meta API diretamente. Os dados são leves e mudam com o período,
 * por isso não usam cache de banco — Next.js de-duplica chamadas por request.
 */
export async function getBreakdownData(
  accountId: string,
  dateFrom:  string,
  dateTo:    string,
  dimension: BreakdownDimension,
): Promise<BreakdownRow[]> {
  try {
    const { data: account } = await supabaseAdmin
      .from('meta_ad_accounts')
      .select('meta_account_id')
      .eq('id', accountId)
      .single()

    if (!account) return []

    return await fetchBreakdownInsights(account.meta_account_id, dateFrom, dateTo, dimension)
  } catch (error) {
    console.error('getBreakdownData error:', error)
    return []
  }
}

// ─── Top e Bottom Anúncios com cache ─────────────────────────────────────────

/**
 * Retorna os top N anúncios ordenados por menor custo por resultado.
 *
 * Cache diário: busca em `top_ads_cache` onde (conta, from, to) e synced_at = hoje.
 * Se não houver → chama Meta API (level=ad) → salva cache → retorna top N.
 */
export async function getCachedOrLiveTopAds(
  accountId: string,
  dateFrom: string,
  dateTo: string,
  limit = 10,
): Promise<TopAd[]> {
  try {
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)

    // 1. Verificar cache do dia
    const { data: cached } = await supabaseAdmin
      .from('top_ads_cache')
      .select('*')
      .eq('meta_ad_account_id', accountId)
      .eq('date_from', dateFrom)
      .eq('date_to', dateTo)
      .gte('synced_at', todayStart.toISOString())
      .gt('results', 0)
      .order('cost_per_result', { ascending: true })
      .limit(limit)

    if (cached && cached.length > 0) {
      return cached.map(mapCacheRowToTopAd)
    }

    // 2. Cache inválido/ausente — buscar meta_account_id
    const { data: account } = await supabaseAdmin
      .from('meta_ad_accounts')
      .select('meta_account_id')
      .eq('id', accountId)
      .single()

    if (!account) throw new Error(`Conta ${accountId} não encontrada no Supabase`)

    // 3. Chamar Meta API
    const ads = await fetchTopAdsInsights(account.meta_account_id, dateFrom, dateTo)

    if (ads.length === 0) return []

    // 4. Salvar no cache
    const now = new Date().toISOString()
    const rows = ads.map(a => ({
      meta_ad_account_id: accountId,
      meta_ad_id:         a.metaAdId,
      ad_name:            a.adName,
      image_url:          a.imageUrl ?? null,
      date_from:          dateFrom,
      date_to:            dateTo,
      spend:              a.spend,
      results:            a.results,
      cost_per_result:    a.costPerResult,
      ctr:                a.ctr,
      reach:              a.reach,
      impressions:        a.impressions,
      synced_at:          now,
    }))

    await supabaseAdmin
      .from('top_ads_cache')
      .upsert(rows, { onConflict: 'meta_ad_account_id,meta_ad_id,date_from,date_to', ignoreDuplicates: false })

    // 5. Retornar top N ordenado por menor custo/resultado
    return ads
      .sort((a, b) => a.costPerResult - b.costPerResult)
      .slice(0, limit)
      .map(a => ({
        id:            a.metaAdId,
        name:          a.adName,
        imageUrl:      a.imageUrl,
        spend:         a.spend,
        results:       a.results,
        costPerResult: a.costPerResult,
        ctr:           a.ctr,
        reach:         a.reach,
        impressions:   a.impressions,
      }))
  } catch (error) {
    console.error('getCachedOrLiveTopAds error:', error)
    return []
  }
}

/**
 * Retorna os N anúncios com PIOR custo por resultado (mais alto) para o período.
 *
 * Usa o mesmo top_ads_cache que getCachedOrLiveTopAds — apenas inverte a ordenação.
 * Se o cache do dia já existir (populado pelo top ads), é hit imediato.
 * Se não, busca da Meta API, salva no cache e retorna os N piores.
 */
export async function getCachedOrLiveBottomAds(
  accountId: string,
  dateFrom:  string,
  dateTo:    string,
  limit = 5,
): Promise<TopAd[]> {
  try {
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)

    // 1. Verificar cache — mesmo critério que getCachedOrLiveTopAds, ordem invertida
    const { data: cached } = await supabaseAdmin
      .from('top_ads_cache')
      .select('*')
      .eq('meta_ad_account_id', accountId)
      .eq('date_from', dateFrom)
      .eq('date_to', dateTo)
      .gte('synced_at', todayStart.toISOString())
      .gt('results', 0)
      .gt('cost_per_result', 0)
      .order('cost_per_result', { ascending: false })  // pior = maior CPL
      .limit(limit)

    if (cached && cached.length > 0) {
      return cached.map(mapCacheRowToTopAd)
    }

    // 2. Cache miss — buscar meta_account_id e chamar Meta API
    const { data: account } = await supabaseAdmin
      .from('meta_ad_accounts')
      .select('meta_account_id')
      .eq('id', accountId)
      .single()

    if (!account) return []

    const ads = await fetchTopAdsInsights(account.meta_account_id, dateFrom, dateTo)
    if (ads.length === 0) return []

    // 3. Salvar todos no cache (mesmo upsert do getCachedOrLiveTopAds)
    const now = new Date().toISOString()
    const rows = ads.map(a => ({
      meta_ad_account_id: accountId,
      meta_ad_id:         a.metaAdId,
      ad_name:            a.adName,
      image_url:          a.imageUrl ?? null,
      date_from:          dateFrom,
      date_to:            dateTo,
      spend:              a.spend,
      results:            a.results,
      cost_per_result:    a.costPerResult,
      ctr:                a.ctr,
      reach:              a.reach,
      impressions:        a.impressions,
      synced_at:          now,
    }))

    await supabaseAdmin
      .from('top_ads_cache')
      .upsert(rows, { onConflict: 'meta_ad_account_id,meta_ad_id,date_from,date_to', ignoreDuplicates: false })

    // 4. Retornar N piores (maior CPL)
    return ads
      .filter(a => a.costPerResult > 0)
      .sort((a, b) => b.costPerResult - a.costPerResult)
      .slice(0, limit)
      .map(a => ({
        id:            a.metaAdId,
        name:          a.adName,
        imageUrl:      a.imageUrl,
        spend:         a.spend,
        results:       a.results,
        costPerResult: a.costPerResult,
        ctr:           a.ctr,
        reach:         a.reach,
        impressions:   a.impressions,
      }))
  } catch (error) {
    console.error('getCachedOrLiveBottomAds error:', error)
    return []
  }
}

// ─── Manager: Campanhas, Conjuntos e Anúncios (com cache diário) ─────────────

/**
 * Retorna campanhas da conta com orçamento + métricas do período.
 * Cache diário: usa campaign_metrics_cache (colunas daily_budget / lifetime_budget).
 * Rows sem budget (populadas pelo overview) são ignoradas e re-buscadas.
 */
export async function getManagerCampaigns(
  accountId: string,
  dateFrom: string,
  dateTo: string,
): Promise<ManagerCampaign[]> {
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  // 1. Cache hit: linhas com budget preenchido — só a rota manager as popula
  const { data: cached } = await supabaseAdmin
    .from('campaign_metrics_cache')
    .select('*')
    .eq('meta_ad_account_id', accountId)
    .eq('date_from', dateFrom)
    .eq('date_to', dateTo)
    .gte('synced_at', todayStart.toISOString())
    .not('daily_budget', 'is', null)
    .order('spend', { ascending: false })

  if (cached && cached.length > 0) {
    return cached.map(mapCacheRowToManagerCampaign)
  }

  // 2. Cache miss — buscar da Meta API (pode lançar RATE_LIMIT)
  const { data: account } = await supabaseAdmin
    .from('meta_ad_accounts')
    .select('meta_account_id')
    .eq('id', accountId)
    .single()

  if (!account) return []

  const campaigns = await fetchManagerCampaigns(account.meta_account_id, dateFrom, dateTo)
  if (campaigns.length === 0) return []

  // 3. Salvar em campaign_metrics_cache (inclui as novas colunas de orçamento)
  const now = new Date().toISOString()
  await supabaseAdmin
    .from('campaign_metrics_cache')
    .upsert(
      campaigns.map(c => ({
        meta_ad_account_id: accountId,
        meta_campaign_id:   c.metaCampaignId,
        campaign_name:      c.name,
        campaign_status:    c.status,
        date_from:          dateFrom,
        date_to:            dateTo,
        spend:              c.spend,
        impressions:        c.impressions,
        reach:              c.reach,
        frequency:          c.frequency,
        clicks:             0,
        cpm:                c.cpm,
        ctr:                c.ctr,
        leads:              c.results,
        messages:           0,
        purchases:          0,
        cost_per_result:    c.costPerResult,
        raw_actions:        [],
        daily_budget:       c.dailyBudget,
        lifetime_budget:    c.lifetimeBudget,
        synced_at:          now,
      })),
      { onConflict: 'meta_ad_account_id,meta_campaign_id,date_from,date_to', ignoreDuplicates: false },
    )

  return campaigns
}

function mapCacheRowToManagerCampaign(row: Record<string, unknown>): ManagerCampaign {
  const leads     = Number(row.leads)     || 0
  const messages  = Number(row.messages)  || 0
  const purchases = Number(row.purchases) || 0
  return {
    metaCampaignId: String(row.meta_campaign_id),
    name:           String(row.campaign_name),
    status:         String(row.campaign_status ?? ''),
    dailyBudget:    Number(row.daily_budget)    || 0,
    lifetimeBudget: Number(row.lifetime_budget) || 0,
    spend:          Number(row.spend),
    results:        leads || messages || purchases,
    costPerResult:  Number(row.cost_per_result),
    impressions:    Number(row.impressions),
    reach:          Number(row.reach),
    frequency:      Number(row.frequency),
    ctr:            Number(row.ctr),
    cpm:            Number(row.cpm),
  }
}

/**
 * Retorna conjuntos de anúncios da conta com métricas do período.
 * Cache diário: usa manager_adsets_cache.
 * Estratégia: primeira chamada busca TODOS os conjuntos e armazena.
 * Chamadas seguintes (mesmo dia) apenas filtram por campaign_id no banco.
 */
export async function getManagerAdSets(
  accountId: string,
  dateFrom: string,
  dateTo: string,
  campaignId?: string,
): Promise<ManagerAdSet[]> {
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  // 1. Verifica se a conta tem dados em cache hoje
  const { count } = await supabaseAdmin
    .from('manager_adsets_cache')
    .select('id', { count: 'exact', head: true })
    .eq('meta_ad_account_id', accountId)
    .eq('date_from', dateFrom)
    .eq('date_to', dateTo)
    .gte('synced_at', todayStart.toISOString())

  if ((count ?? 0) > 0) {
    let query = supabaseAdmin
      .from('manager_adsets_cache')
      .select('*')
      .eq('meta_ad_account_id', accountId)
      .eq('date_from', dateFrom)
      .eq('date_to', dateTo)
      .gte('synced_at', todayStart.toISOString())
      .order('spend', { ascending: false })

    if (campaignId) query = query.eq('campaign_id', campaignId)

    const { data: cached } = await query
    return (cached ?? []).map(mapCacheRowToManagerAdSet)
  }

  // 2. Cache miss — busca TODOS os conjuntos (sem filtro de campanha) e armazena tudo
  const { data: account } = await supabaseAdmin
    .from('meta_ad_accounts')
    .select('meta_account_id')
    .eq('id', accountId)
    .single()

  if (!account) return []

  const allAdSets = await fetchManagerAdSets(account.meta_account_id, dateFrom, dateTo)

  if (allAdSets.length > 0) {
    const now = new Date().toISOString()
    await supabaseAdmin
      .from('manager_adsets_cache')
      .upsert(
        allAdSets.map(a => ({
          meta_ad_account_id: accountId,
          meta_adset_id:      a.metaAdSetId,
          adset_name:         a.name,
          adset_status:       a.status,
          campaign_id:        a.campaignId,
          campaign_name:      a.campaignName,
          date_from:          dateFrom,
          date_to:            dateTo,
          daily_budget:       a.dailyBudget,
          lifetime_budget:    a.lifetimeBudget,
          spend:              a.spend,
          results:            a.results,
          cost_per_result:    a.costPerResult,
          impressions:        a.impressions,
          reach:              a.reach,
          frequency:          a.frequency,
          ctr:                a.ctr,
          cpm:                a.cpm,
          synced_at:          now,
        })),
        { onConflict: 'meta_ad_account_id,meta_adset_id,date_from,date_to', ignoreDuplicates: false },
      )
  }

  return campaignId ? allAdSets.filter(a => a.campaignId === campaignId) : allAdSets
}

function mapCacheRowToManagerAdSet(row: Record<string, unknown>): ManagerAdSet {
  return {
    metaAdSetId:    String(row.meta_adset_id),
    name:           String(row.adset_name),
    status:         String(row.adset_status ?? ''),
    campaignId:     String(row.campaign_id  ?? ''),
    campaignName:   String(row.campaign_name ?? ''),
    dailyBudget:    Number(row.daily_budget)    || 0,
    lifetimeBudget: Number(row.lifetime_budget) || 0,
    spend:          Number(row.spend),
    results:        Number(row.results),
    costPerResult:  Number(row.cost_per_result),
    impressions:    Number(row.impressions),
    reach:          Number(row.reach),
    frequency:      Number(row.frequency),
    ctr:            Number(row.ctr),
    cpm:            Number(row.cpm),
  }
}

/**
 * Retorna anúncios da conta com métricas completas do período.
 * Cache diário: usa ad_metrics_cache (colunas reach/impressions/frequency/ctr/cpm).
 * Estratégia: primeira chamada busca TODOS e armazena; filtro por adset é feito no banco.
 */
export async function getManagerAds(
  accountId: string,
  dateFrom: string,
  dateTo: string,
  adsetId?: string,
): Promise<ManagerAd[]> {
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)

  // 1. Cache hit: linhas com reach preenchido (indica dados completos do manager)
  const { count } = await supabaseAdmin
    .from('ad_metrics_cache')
    .select('id', { count: 'exact', head: true })
    .eq('meta_ad_account_id', accountId)
    .eq('date_from', dateFrom)
    .eq('date_to', dateTo)
    .gte('synced_at', todayStart.toISOString())
    .not('reach', 'is', null)

  if ((count ?? 0) > 0) {
    let query = supabaseAdmin
      .from('ad_metrics_cache')
      .select('*')
      .eq('meta_ad_account_id', accountId)
      .eq('date_from', dateFrom)
      .eq('date_to', dateTo)
      .gte('synced_at', todayStart.toISOString())
      .not('reach', 'is', null)
      .order('spend', { ascending: false })

    if (adsetId) query = query.eq('adset_id', adsetId)

    const { data: cached } = await query
    return (cached ?? []).map(mapCacheRowToManagerAd)
  }

  // 2. Cache miss — busca TODOS os anúncios e armazena
  const { data: account } = await supabaseAdmin
    .from('meta_ad_accounts')
    .select('meta_account_id')
    .eq('id', accountId)
    .single()

  if (!account) return []

  const allAds = await fetchManagerAds(account.meta_account_id, dateFrom, dateTo)

  if (allAds.length > 0) {
    const now = new Date().toISOString()
    await supabaseAdmin
      .from('ad_metrics_cache')
      .upsert(
        allAds.map(a => ({
          meta_ad_account_id: accountId,
          meta_ad_id:         a.metaAdId,
          ad_name:            a.name,
          ad_status:          a.status,
          campaign_id:        a.campaignId,
          campaign_name:      a.campaignName,
          adset_id:           a.adSetId,
          adset_name:         a.adSetName,
          date_from:          dateFrom,
          date_to:            dateTo,
          spend:              a.spend,
          results:            a.results,
          cost_per_result:    a.costPerResult,
          reach:              a.reach,
          impressions:        a.impressions,
          frequency:          a.frequency,
          ctr:                a.ctr,
          cpm:                a.cpm,
          synced_at:          now,
        })),
        { onConflict: 'meta_ad_account_id,meta_ad_id,date_from,date_to', ignoreDuplicates: false },
      )
  }

  return adsetId ? allAds.filter(a => a.adSetId === adsetId) : allAds
}

function mapCacheRowToManagerAd(row: Record<string, unknown>): ManagerAd {
  return {
    metaAdId:      String(row.meta_ad_id),
    name:          String(row.ad_name),
    status:        String(row.ad_status   ?? ''),
    campaignId:    String(row.campaign_id ?? ''),
    campaignName:  String(row.campaign_name ?? ''),
    adSetId:       String(row.adset_id    ?? ''),
    adSetName:     String(row.adset_name  ?? ''),
    spend:         Number(row.spend),
    results:       Number(row.results),
    costPerResult: Number(row.cost_per_result),
    impressions:   Number(row.impressions),
    reach:         Number(row.reach),
    frequency:     Number(row.frequency),
    ctr:           Number(row.ctr),
    cpm:           Number(row.cpm),
  }
}

function mapCacheRowToTopAd(row: Record<string, unknown>): TopAd {
  return {
    id:            String(row.meta_ad_id),
    name:          String(row.ad_name),
    imageUrl:      row.image_url ? String(row.image_url) : undefined,
    spend:         Number(row.spend),
    results:       Number(row.results),
    costPerResult: Number(row.cost_per_result),
    ctr:           Number(row.ctr),
    reach:         Number(row.reach),
    impressions:   Number(row.impressions),
  }
}

function mapCacheRowToCampaignMetrics(row: Record<string, unknown>): CampaignMetrics {
  const leads = Number(row.leads) || 0
  const messages = Number(row.messages) || 0
  const purchases = Number(row.purchases) || 0
  const totalResults = leads || messages || purchases
  return {
    metaCampaignId: String(row.meta_campaign_id),
    campaignName: String(row.campaign_name),
    campaignStatus: String(row.campaign_status ?? ''),
    totalSpend: Number(row.spend),
    totalLeads: leads,
    totalMessages: messages,
    totalPurchases: purchases,
    totalResults,
    avgCPL: Number(row.cost_per_result),
    avgCTR: Number(row.ctr),
    totalReach: Number(row.reach),
    avgFrequency: Number(row.frequency),
    totalImpressions: Number(row.impressions),
    avgCPM: Number(row.cpm),
  }
}
