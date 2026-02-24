const META_API_BASE = 'https://graph.facebook.com/v24.0'
const META_APP_TOKEN = process.env.META_APP_ACCESS_TOKEN!

export interface MetaAdAccountResponse {
  id: string
  name: string
  account_status: number
}

export interface MetaInsightsResponse {
  ads: {
    data: MetaAdData[]
  }
}

export interface MetaAdData {
  id: string
  name: string
  effective_status: string
  campaign: {
    id: string
    name: string
    effective_status: string
    daily_budget?: string
  }
  adset: {
    id: string
    name: string
    effective_status: string
  }
  insights?: {
    data: MetaInsightData[]
  }
}

export interface MetaInsightData {
  spend: string
  impressions: string
  reach: string
  frequency: string
  clicks: string
  cpc: string
  cpm: string
  ctr: string
  actions?: Array<{
    action_type: string
    value: string
  }>
  cost_per_action_type?: Array<{
    action_type: string
    value: string
  }>
}

/**
 * Busca todas as contas de anúncios
 */
export async function fetchAdAccounts(): Promise<MetaAdAccountResponse[]> {
  try {
    const url = `${META_API_BASE}/me/adaccounts?fields=id,name,account_status&limit=200&access_token=${META_APP_TOKEN}`
    
    const response = await fetch(url)
    const data = await response.json()

    if (data.error) {
      throw new Error(`Meta API Error: ${data.error.message}`)
    }

    return data.data || []
  } catch (error) {
    console.error('Error fetching ad accounts:', error)
    throw error
  }
}

/**
 * Busca insights de uma conta de anúncios
 */
export async function fetchAccountInsights(
  accountId: string,
  dateStart: string,
  dateStop: string
): Promise<MetaInsightsResponse> {
  try {
    const fields = encodeURIComponent(
      `ads.limit(1000){` +
        `name,effective_status,` +
        `campaign{name,effective_status,daily_budget},` +
        `adset{name,effective_status},` +
        `insights.time_range({'since':'${dateStart}','until':'${dateStop}'}){` +
          `spend,reach,frequency,impressions,clicks,actions,` +
          `cpc,cost_per_action_type,cpm,ctr` +
        `}` +
      `}`
    )

    const url = `${META_API_BASE}/${accountId}?fields=${fields}&access_token=${META_APP_TOKEN}`
    
    const response = await fetch(url)
    const data = await response.json()

    if (data.error) {
      throw new Error(`Meta API Error: ${data.error.message}`)
    }

    return data
  } catch (error) {
    console.error('Error fetching account insights:', error)
    throw error
  }
}

// ─── Listagem de contas de anúncio do usuário ────────────────────────────────

export interface MetaAdAccountInfo {
  /** ID no formato act_XXXXXXXXX */
  id:             string
  name:           string
  /** 1=ACTIVE 2=DISABLED 3=UNSETTLED 7=PENDING_RISK_REVIEW 100=PENDING_CLOSURE 101=CLOSED */
  account_status: number
  currency:       string
  timezone_name:  string
}

// ─── Orçamento de campanhas ───────────────────────────────────────────────────
export interface CampaignBudgetInfo {
  id:               string
  name:             string
  status:           string
  /** Orçamento diário em centavos (string) — presente apenas se a campanha usar orçamento diário */
  daily_budget?:    string
  /** Orçamento vitalício em centavos (string) — presente apenas se a campanha usar orçamento vitalício */
  lifetime_budget?: string
}

/**
 * Busca orçamentos das campanhas de uma conta.
 * Retorna todas as campanhas independente de status.
 */
export async function fetchCampaignBudgets(
  metaAccountId: string,
): Promise<CampaignBudgetInfo[]> {
  const accountId = metaAccountId.startsWith('act_')
    ? metaAccountId
    : `act_${metaAccountId}`

  const fields = 'id,name,status,daily_budget,lifetime_budget'
  const url    = `${META_API_BASE}/${accountId}/campaigns?fields=${fields}&limit=100&access_token=${META_APP_TOKEN}`

  const response: Response                = await fetch(url, { cache: 'no-store' })
  const data:     Record<string, unknown> = await response.json()

  if (data.error) {
    const err = data.error as { message?: string }
    throw new Error(`Meta API Error (campaign budgets): ${err.message}`)
  }

  return (data.data as CampaignBudgetInfo[]) ?? []
}

/**
 * Busca todas as contas de anúncio às quais o token tem acesso.
 * Percorre todas as páginas automaticamente (paginação por cursor).
 */
export async function fetchAdAccountsFromMeta(): Promise<MetaAdAccountInfo[]> {
  const fields  = 'id,name,account_status,currency,timezone_name'
  const all: MetaAdAccountInfo[] = []

  // Primeira página
  let nextUrl: string | null =
    `${META_API_BASE}/me/adaccounts?fields=${fields}&limit=50&access_token=${META_APP_TOKEN}`

  while (nextUrl) {
    const response: Response                    = await fetch(nextUrl, { cache: 'no-store' })
    const data:     Record<string, unknown>     = await response.json()

    if (data.error) {
      const err = data.error as { message?: string }
      throw new Error(`Meta API Error (adaccounts): ${err.message ?? JSON.stringify(data.error)}`)
    }

    all.push(...((data.data as MetaAdAccountInfo[] | undefined) ?? []))

    // Avança para a próxima página se existir
    const paging = data.paging as { next?: string } | undefined
    nextUrl = paging?.next ?? null
  }

  return all
}

// ─── Resumo de métricas agregadas no nível de conta ──────────────────────────
export interface AccountInsightSummary {
  spend:         number
  impressions:   number
  reach:         number
  frequency:     number
  clicks:        number
  cpm:           number
  ctr:           number
  leads:         number
  messages:      number
  purchases:     number
  costPerResult: number
  rawActions:    Array<{ action_type: string; value: string }>
}

/**
 * Busca métricas agregadas de uma conta inteira (level=account).
 * Soma todas as campanhas em uma única requisição, sem necessidade de sync prévio.
 */
export async function fetchAccountLevelInsights(
  metaAccountId: string,
  dateFrom: string,
  dateTo: string,
): Promise<AccountInsightSummary> {
  // Garante prefixo act_
  const accountId = metaAccountId.startsWith('act_')
    ? metaAccountId
    : `act_${metaAccountId}`

  const fields     = 'spend,impressions,reach,frequency,clicks,cpm,ctr,actions,cost_per_action_type'
  const timeRange  = encodeURIComponent(JSON.stringify({ since: dateFrom, until: dateTo }))
  const url        = `${META_API_BASE}/${accountId}/insights?fields=${fields}&time_range=${timeRange}&level=account&access_token=${META_APP_TOKEN}`

  const response = await fetch(url, { cache: 'no-store' })
  const data     = await response.json()

  if (data.error) {
    throw new Error(`Meta API Error: ${data.error.message}`)
  }

  const insight = data.data?.[0]
  if (!insight) {
    return {
      spend: 0, impressions: 0, reach: 0, frequency: 0,
      clicks: 0, cpm: 0, ctr: 0,
      leads: 0, messages: 0, purchases: 0,
      costPerResult: 0, rawActions: [],
    }
  }

  const actions = (insight.actions ?? []) as Array<{ action_type: string; value: string }>
  const leads    = sumActions(actions, ['lead', 'onsite_conversion.lead_grouped'])
  // Usa apenas o tipo que o Meta exibe como "Resultado" em campanhas de mensagem.
  // messaging_first_reply e total_messaging_connection são métricas auxiliares.
  const messages  = sumActions(actions, ['onsite_conversion.messaging_conversation_started_7d'])
  const purchases = sumActions(actions, ['purchase', 'omni_purchase'])

  const spend         = parseFloat(insight.spend    ?? '0')
  const totalResults  = leads || messages || purchases
  const costPerResult = totalResults > 0 ? spend / totalResults : 0

  return {
    spend,
    impressions:   parseInt(insight.impressions ?? '0'),
    reach:         parseInt(insight.reach       ?? '0'),
    frequency:     parseFloat(insight.frequency ?? '0'),
    clicks:        parseInt(insight.clicks      ?? '0'),
    cpm:           parseFloat(insight.cpm       ?? '0'),
    ctr:           parseFloat(insight.ctr       ?? '0'),
    leads,
    messages,
    purchases,
    costPerResult,
    rawActions: actions,
  }
}

// ─── Métricas por campanha ────────────────────────────────────────────────────
export interface CampaignInsightSummary extends AccountInsightSummary {
  metaCampaignId: string
  campaignName:   string
  campaignStatus: string
}

/**
 * Busca métricas de todas as campanhas de uma conta (level=campaign).
 * Retorna um array — uma entrada por campanha com spend > 0 no período.
 */
export async function fetchCampaignLevelInsights(
  metaAccountId: string,
  dateFrom: string,
  dateTo: string,
): Promise<CampaignInsightSummary[]> {
  const accountId = metaAccountId.startsWith('act_')
    ? metaAccountId
    : `act_${metaAccountId}`

  const fields    = 'campaign_id,campaign_name,spend,impressions,reach,frequency,clicks,cpm,ctr,actions,cost_per_action_type'
  const timeRange = encodeURIComponent(JSON.stringify({ since: dateFrom, until: dateTo }))
  // Filtra apenas campanhas com spend > 0 para não poluir com campanhas inativas
  const filtering = encodeURIComponent(JSON.stringify([{ field: 'spend', operator: 'GREATER_THAN', value: '0' }]))
  const url       = `${META_API_BASE}/${accountId}/insights?fields=${fields}&time_range=${timeRange}&level=campaign&filtering=${filtering}&limit=100&access_token=${META_APP_TOKEN}`

  const response = await fetch(url, { cache: 'no-store' })
  const data     = await response.json()

  if (data.error) {
    throw new Error(`Meta API Error (campaign level): ${data.error.message}`)
  }

  const rows: CampaignInsightSummary[] = []

  for (const insight of (data.data ?? [])) {
    const actions   = (insight.actions ?? []) as Array<{ action_type: string; value: string }>
    const leads     = sumActions(actions, ['lead', 'onsite_conversion.lead_grouped'])
    const messages  = sumActions(actions, ['onsite_conversion.messaging_conversation_started_7d'])
    const purchases = sumActions(actions, ['purchase', 'omni_purchase'])

    const spend         = parseFloat(insight.spend ?? '0')
    const totalResults  = leads || messages || purchases
    const costPerResult = totalResults > 0 ? spend / totalResults : 0

    rows.push({
      metaCampaignId: insight.campaign_id,
      campaignName:   insight.campaign_name ?? 'Campanha sem nome',
      campaignStatus: insight.effective_status ?? '',
      spend,
      impressions:    parseInt(insight.impressions ?? '0'),
      reach:          parseInt(insight.reach       ?? '0'),
      frequency:      parseFloat(insight.frequency ?? '0'),
      clicks:         parseInt(insight.clicks      ?? '0'),
      cpm:            parseFloat(insight.cpm       ?? '0'),
      ctr:            parseFloat(insight.ctr       ?? '0'),
      leads,
      messages,
      purchases,
      costPerResult,
      rawActions: actions,
    })
  }

  // Ordena por gasto decrescente
  return rows.sort((a, b) => b.spend - a.spend)
}

// ─── Métricas por anúncio ────────────────────────────────────────────────────
export interface AdInsightSummary {
  metaAdId:     string
  adName:       string
  adStatus:     string
  campaignId:   string
  campaignName: string
  adSetId:      string
  adSetName:    string
  spend:        number
  results:      number
  cpl:          number
}

/**
 * Busca métricas de todos os anúncios de uma conta (level=ad).
 * Etapa 1: insights com spend > 0 para o período.
 * Etapa 2: batch de status para os ad_ids retornados.
 */
export async function fetchAdLevelInsights(
  metaAccountId: string,
  dateFrom:       string,
  dateTo:         string,
): Promise<AdInsightSummary[]> {
  const accountId = metaAccountId.startsWith('act_')
    ? metaAccountId
    : `act_${metaAccountId}`

  const fields    = 'ad_id,ad_name,campaign_id,campaign_name,adset_id,adset_name,spend,actions'
  const timeRange = encodeURIComponent(JSON.stringify({ since: dateFrom, until: dateTo }))
  const filtering = encodeURIComponent(JSON.stringify([{ field: 'spend', operator: 'GREATER_THAN', value: '0' }]))
  const url = `${META_API_BASE}/${accountId}/insights?fields=${fields}&time_range=${timeRange}&level=ad&filtering=${filtering}&limit=200&access_token=${META_APP_TOKEN}`

  const response: Response                = await fetch(url, { cache: 'no-store' })
  const data:     Record<string, unknown> = await response.json()

  if (data.error) {
    const err = data.error as { message?: string }
    throw new Error(`Meta API Error (ad level insights): ${err.message}`)
  }

  const rows = (data.data as Array<Record<string, unknown>>) ?? []
  if (rows.length === 0) return []

  // Busca effective_status de cada ad via batch endpoint
  const adIds    = rows.map(r => r.ad_id as string).filter(Boolean)
  const statusMap: Record<string, string> = {}

  if (adIds.length > 0) {
    try {
      const idsParam  = encodeURIComponent(adIds.join(','))
      const statusUrl = `${META_API_BASE}/?ids=${idsParam}&fields=id,effective_status&access_token=${META_APP_TOKEN}`
      const sr: Response                = await fetch(statusUrl, { cache: 'no-store' })
      const sd: Record<string, unknown> = await sr.json()
      Object.entries(sd).forEach(([id, val]) => {
        const v = val as { id?: string; effective_status?: string }
        if (v.effective_status) statusMap[id] = v.effective_status
      })
    } catch {
      // Status indisponível — todos serão tratados como ACTIVE
    }
  }

  return rows
    .map(row => {
      const actions  = (row.actions as Array<{ action_type: string; value: string }>) ?? []
      const leads    = sumActions(actions, ['lead', 'onsite_conversion.lead_grouped'])
      const messages = sumActions(actions, ['onsite_conversion.messaging_conversation_started_7d'])
      const purchases = sumActions(actions, ['purchase', 'omni_purchase'])
      const results  = leads || messages || purchases
      const spend    = parseFloat((row.spend as string) ?? '0')
      const cpl      = results > 0 ? spend / results : 0
      const adId     = row.ad_id as string

      return {
        metaAdId:     adId,
        adName:       (row.ad_name       as string) ?? 'Anúncio sem nome',
        adStatus:     statusMap[adId]               ?? 'ACTIVE',
        campaignId:   (row.campaign_id   as string) ?? '',
        campaignName: (row.campaign_name as string) ?? '',
        adSetId:      (row.adset_id      as string) ?? '',
        adSetName:    (row.adset_name    as string) ?? '',
        spend,
        results,
        cpl,
      }
    })
    .filter(a => a.spend > 0)
}

// ─── Dados diários de tendência por campanha ─────────────────────────────────

export interface TrendPoint {
  date:    string  // YYYY-MM-DD
  spend:   number
  results: number
  cpl:     number
}

/**
 * Busca dados diários de uma campanha específica (time_increment=1).
 * Usado para o gráfico de Tendência no Tempo.
 */
export async function fetchCampaignDailyInsights(
  metaCampaignId: string,
  dateFrom: string,
  dateTo: string,
): Promise<TrendPoint[]> {
  const fields    = 'spend,actions,date_start'
  const timeRange = encodeURIComponent(JSON.stringify({ since: dateFrom, until: dateTo }))
  const url       = `${META_API_BASE}/${metaCampaignId}/insights?fields=${fields}&time_range=${timeRange}&time_increment=1&access_token=${META_APP_TOKEN}`

  const response = await fetch(url, { cache: 'no-store' })
  const data: Record<string, unknown> = await response.json()

  if (data.error) {
    const err = data.error as { message?: string }
    throw new Error(`Meta API Error (daily): ${err.message}`)
  }

  const rows = (data.data as Array<Record<string, unknown>>) ?? []

  return rows.map(row => {
    const actions  = (row.actions as Array<{ action_type: string; value: string }>) ?? []
    const leads    = sumActions(actions, ['lead', 'onsite_conversion.lead_grouped'])
    const messages = sumActions(actions, ['onsite_conversion.messaging_conversation_started_7d'])
    const purchases = sumActions(actions, ['purchase', 'omni_purchase'])
    const results  = leads || messages || purchases
    const spend    = parseFloat((row.spend as string) ?? '0')
    const cpl      = results > 0 ? spend / results : 0

    return {
      date:    row.date_start as string,
      spend,
      results,
      cpl,
    }
  })
}

/**
 * Busca dados diários agregados de TODAS as campanhas da conta (level=account, time_increment=1).
 */
export async function fetchAccountDailyInsights(
  metaAccountId: string,
  dateFrom: string,
  dateTo: string,
): Promise<TrendPoint[]> {
  const accountId = metaAccountId.startsWith('act_') ? metaAccountId : `act_${metaAccountId}`
  const fields    = 'spend,actions,date_start'
  const timeRange = encodeURIComponent(JSON.stringify({ since: dateFrom, until: dateTo }))
  const url       = `${META_API_BASE}/${accountId}/insights?fields=${fields}&time_range=${timeRange}&time_increment=1&level=account&access_token=${META_APP_TOKEN}`

  const response = await fetch(url, { cache: 'no-store' })
  const data: Record<string, unknown> = await response.json()

  if (data.error) {
    const err = data.error as { message?: string }
    throw new Error(`Meta API Error (account daily): ${err.message}`)
  }

  const rows = (data.data as Array<Record<string, unknown>>) ?? []

  return rows.map(row => {
    const actions  = (row.actions as Array<{ action_type: string; value: string }>) ?? []
    const leads    = sumActions(actions, ['lead', 'onsite_conversion.lead_grouped'])
    const messages = sumActions(actions, ['onsite_conversion.messaging_conversation_started_7d'])
    const purchases = sumActions(actions, ['purchase', 'omni_purchase'])
    const results  = leads || messages || purchases
    const spend    = parseFloat((row.spend as string) ?? '0')
    return { date: row.date_start as string, spend, results, cpl: results > 0 ? spend / results : 0 }
  })
}

/** Soma os values de todas as actions que correspondem aos tipos fornecidos */
function sumActions(
  actions: Array<{ action_type: string; value: string }>,
  types: string[],
): number {
  return actions
    .filter(a => types.includes(a.action_type))
    .reduce((sum, a) => sum + parseInt(a.value || '0'), 0)
}

/**
 * Extrai número de leads do array de actions
 */
export function extractLeads(actions?: Array<{ action_type: string; value: string }>): number {
  if (!actions) return 0
  
  const leadAction = actions.find(
    action => 
      action.action_type === 'lead' || 
      action.action_type === 'onsite_conversion.lead_grouped'
  )
  
  return leadAction ? parseInt(leadAction.value) : 0
}

/**
 * Extrai custo por lead do array de cost_per_action_type
 */
export function extractCostPerLead(
  costPerActionType?: Array<{ action_type: string; value: string }>
): number {
  if (!costPerActionType) return 0
  
  const cplAction = costPerActionType.find(
    action => 
      action.action_type === 'lead' || 
      action.action_type === 'onsite_conversion.lead_grouped'
  )
  
  return cplAction ? parseFloat(cplAction.value) : 0
}
