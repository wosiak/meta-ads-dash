import { supabaseAdmin } from './supabase'
import type { DashboardMetrics, TopAd, ChartData } from '@/types/database'

/**
 * Busca métricas agregadas do dashboard para um cliente
 */
export async function getDashboardMetrics(
  clientId: string,
  dateStart: string,
  dateStop: string
): Promise<DashboardMetrics> {
  try {
    // Buscar todas as contas do cliente
    const { data: accounts } = await supabaseAdmin
      .from('meta_ad_accounts')
      .select('id')
      .eq('client_id', clientId)

    if (!accounts || accounts.length === 0) {
      return {
        totalSpend: 0,
        totalLeads: 0,
        avgCPL: 0,
        avgCTR: 0,
        totalReach: 0,
        avgFrequency: 0,
      }
    }

    const accountIds = accounts.map(a => a.id)

    // Buscar insights agregados
    const { data: insights, error } = await supabaseAdmin
      .from('ad_insights')
      .select('*')
      .in('meta_ad_account_id', accountIds)
      .gte('date_start', dateStart)
      .lte('date_stop', dateStop)

    if (error || !insights || insights.length === 0) {
      return {
        totalSpend: 0,
        totalLeads: 0,
        avgCPL: 0,
        avgCTR: 0,
        totalReach: 0,
        avgFrequency: 0,
      }
    }

    // Calcular métricas
    const totalSpend = insights.reduce((sum, i) => sum + Number(i.spend), 0)
    const totalLeads = insights.reduce((sum, i) => sum + Number(i.leads), 0)
    const totalReach = insights.reduce((sum, i) => sum + Number(i.reach), 0)
    const avgCTR = insights.reduce((sum, i) => sum + Number(i.ctr), 0) / insights.length
    const avgFrequency = insights.reduce((sum, i) => sum + Number(i.frequency), 0) / insights.length
    const avgCPL = totalLeads > 0 ? totalSpend / totalLeads : 0

    return {
      totalSpend,
      totalLeads,
      avgCPL,
      avgCTR,
      totalReach,
      avgFrequency,
    }
  } catch (error) {
    console.error('Error getting dashboard metrics:', error)
    return {
      totalSpend: 0,
      totalLeads: 0,
      avgCPL: 0,
      avgCTR: 0,
      totalReach: 0,
      avgFrequency: 0,
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
  limit: number = 10
): Promise<TopAd[]> {
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
