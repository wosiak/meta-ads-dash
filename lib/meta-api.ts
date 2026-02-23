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
