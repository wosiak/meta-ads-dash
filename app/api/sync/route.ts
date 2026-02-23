import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { fetchAccountInsights, extractLeads, extractCostPerLead } from '@/lib/meta-api'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { accountId, dateStart, dateStop } = body

    if (!accountId || !dateStart || !dateStop) {
      return NextResponse.json(
        { error: 'Missing required parameters' },
        { status: 400 }
      )
    }

    // Criar log de sync
    const { data: syncLog } = await supabaseAdmin
      .from('sync_logs')
      .insert({
        meta_ad_account_id: accountId,
        status: 'running',
        started_at: new Date().toISOString(),
      })
      .select()
      .single()

    try {
      // Buscar dados da Meta API
      const data = await fetchAccountInsights(accountId, dateStart, dateStop)
      
      let recordsSynced = 0

      // Processar cada anúncio
      for (const ad of data.ads?.data || []) {
        // 1. Upsert Campaign
        const { data: campaign } = await supabaseAdmin
          .from('campaigns')
          .upsert({
            meta_ad_account_id: accountId,
            meta_campaign_id: ad.campaign.id,
            name: ad.campaign.name,
            effective_status: ad.campaign.effective_status,
            daily_budget: ad.campaign.daily_budget ? parseFloat(ad.campaign.daily_budget) : null,
            updated_at: new Date().toISOString(),
          }, {
            onConflict: 'meta_campaign_id'
          })
          .select()
          .single()

        if (!campaign) continue

        // 2. Upsert AdSet
        const { data: adSet } = await supabaseAdmin
          .from('ad_sets')
          .upsert({
            campaign_id: campaign.id,
            meta_adset_id: ad.adset.id,
            name: ad.adset.name,
            effective_status: ad.adset.effective_status,
            updated_at: new Date().toISOString(),
          }, {
            onConflict: 'meta_adset_id'
          })
          .select()
          .single()

        if (!adSet) continue

        // 3. Upsert Ad
        const { data: adRecord } = await supabaseAdmin
          .from('ads')
          .upsert({
            ad_set_id: adSet.id,
            meta_ad_id: ad.id,
            name: ad.name,
            effective_status: ad.effective_status,
            updated_at: new Date().toISOString(),
          }, {
            onConflict: 'meta_ad_id'
          })
          .select()
          .single()

        if (!adRecord) continue

        // 4. Upsert Insights (se existirem)
        if (ad.insights?.data?.[0]) {
          const insight = ad.insights.data[0]
          const leads = extractLeads(insight.actions)
          const costPerLead = extractCostPerLead(insight.cost_per_action_type)

          await supabaseAdmin
            .from('ad_insights')
            .upsert({
              ad_id: adRecord.id,
              campaign_id: campaign.id,
              ad_set_id: adSet.id,
              meta_ad_account_id: accountId,
              date_start: dateStart,
              date_stop: dateStop,
              spend: parseFloat(insight.spend || '0'),
              impressions: parseInt(insight.impressions || '0'),
              reach: parseInt(insight.reach || '0'),
              frequency: parseFloat(insight.frequency || '0'),
              clicks: parseInt(insight.clicks || '0'),
              cpc: parseFloat(insight.cpc || '0'),
              cpm: parseFloat(insight.cpm || '0'),
              ctr: parseFloat(insight.ctr || '0'),
              actions: insight.actions || null,
              cost_per_action_type: insight.cost_per_action_type || null,
              leads,
              cost_per_lead: costPerLead,
              synced_at: new Date().toISOString(),
            }, {
              onConflict: 'ad_id,date_start,date_stop',
              ignoreDuplicates: false
            })

          recordsSynced++
        }
      }

      // Atualizar log de sync como sucesso
      await supabaseAdmin
        .from('sync_logs')
        .update({
          status: 'success',
          records_synced: recordsSynced,
          completed_at: new Date().toISOString(),
        })
        .eq('id', syncLog.id)

      // Atualizar last_sync_at da conta
      await supabaseAdmin
        .from('meta_ad_accounts')
        .update({ last_sync_at: new Date().toISOString() })
        .eq('id', accountId)

      return NextResponse.json({
        success: true,
        recordsSynced,
        message: `Sincronizados ${recordsSynced} registros com sucesso`,
      })

    } catch (error: any) {
      // Atualizar log de sync como erro
      await supabaseAdmin
        .from('sync_logs')
        .update({
          status: 'error',
          error_message: error.message,
          completed_at: new Date().toISOString(),
        })
        .eq('id', syncLog.id)

      throw error
    }

  } catch (error: any) {
    console.error('Sync error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to sync data' },
      { status: 500 }
    )
  }
}
