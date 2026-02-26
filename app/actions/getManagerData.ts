'use server'

import { getManagerCampaigns, getManagerAdSets, getManagerAds } from '@/lib/dashboard'
import type { ManagerCampaign, ManagerAdSet, ManagerAd } from '@/lib/dashboard'

export async function fetchCampaignData(
  accountId: string,
  dateFrom: string,
  dateTo: string,
): Promise<ManagerCampaign[]> {
  if (!accountId) return []
  return getManagerCampaigns(accountId, dateFrom, dateTo)
}

export async function fetchAdSetData(
  accountId: string,
  dateFrom: string,
  dateTo: string,
  campaignId?: string,
): Promise<ManagerAdSet[]> {
  if (!accountId) return []
  return getManagerAdSets(accountId, dateFrom, dateTo, campaignId)
}

export async function fetchAdData(
  accountId: string,
  dateFrom: string,
  dateTo: string,
  adsetId?: string,
): Promise<ManagerAd[]> {
  if (!accountId) return []
  return getManagerAds(accountId, dateFrom, dateTo, adsetId)
}
