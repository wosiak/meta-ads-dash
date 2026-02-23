// types/database.ts
export interface Client {
  id: string
  name: string
  slug: string
  access_token: string
  logo_url?: string
  status: 'active' | 'inactive'
  created_at: string
  updated_at: string
}

export interface MetaAdAccount {
  id: string
  client_id: string
  meta_account_id: string
  account_name: string
  account_status?: string
  currency: string
  last_sync_at?: string
  created_at: string
  updated_at: string
}

export interface Campaign {
  id: string
  meta_ad_account_id: string
  meta_campaign_id: string
  name: string
  effective_status?: string
  daily_budget?: number
  created_at: string
  updated_at: string
}

export interface AdSet {
  id: string
  campaign_id: string
  meta_adset_id: string
  name: string
  effective_status?: string
  daily_budget?: number
  created_at: string
  updated_at: string
}

export interface Ad {
  id: string
  ad_set_id: string
  meta_ad_id: string
  name: string
  effective_status?: string
  creative_image_url?: string
  creative_video_url?: string
  creative_thumbnail_url?: string
  created_at: string
  updated_at: string
}

export interface AdInsight {
  id: string
  meta_ad_account_id?: string
  campaign_id?: string
  ad_set_id?: string
  ad_id?: string
  date_start: string
  date_stop: string
  spend: number
  impressions: number
  reach: number
  frequency: number
  clicks: number
  cpc: number
  cpm: number
  ctr: number
  actions?: MetaAction[]
  cost_per_action_type?: MetaCostPerAction[]
  leads: number
  cost_per_lead: number
  synced_at: string
}

export interface MetaAction {
  action_type: string
  value: string
}

export interface MetaCostPerAction {
  action_type: string
  value: string
}

export interface AdminUser {
  id: string
  email: string
  password_hash: string
  name: string
  created_at: string
}

export interface SyncLog {
  id: string
  meta_ad_account_id?: string
  status: 'running' | 'success' | 'error'
  records_synced: number
  error_message?: string
  started_at: string
  completed_at?: string
}

// Métricas por campanha (nível campaign da Meta API)
export interface CampaignMetrics {
  metaCampaignId: string
  campaignName:   string
  campaignStatus: string
  totalSpend:     number
  totalLeads:     number
  totalMessages:  number
  totalPurchases: number
  totalResults:   number
  avgCPL:         number
  avgCTR:         number
  totalReach:     number
  avgFrequency:   number
  totalImpressions: number
  avgCPM:         number
}

// Tipos agregados para o dashboard
export interface DashboardMetrics {
  totalSpend: number
  totalLeads: number
  avgCPL: number
  avgCTR: number
  totalReach: number
  avgFrequency: number
  totalImpressions: number
  avgCPM: number
}

export interface TopAd {
  id: string
  name: string
  imageUrl?: string
  spend: number
  leads: number
  cpl: number
  ctr: number
  reach: number
}

export interface ChartData {
  date: string
  spend: number
  leads: number
  cpl: number
  reach: number
}
