'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import { EntityManagerTable, type EntityManagerRow } from '@/components/dashboard/EntityManagerTable'
import { fetchCampaignData } from '@/app/actions/getManagerData'
import type { ManagerCampaign } from '@/lib/dashboard'
import { periodToDates, DEFAULT_PERIOD } from '@/lib/periods'

const RETRY_SECONDS = 30

interface Props {
  accountId: string
}

export function CampaignsClient({ accountId }: Props) {
  const searchParams = useSearchParams()
  const [campaigns, setCampaigns] = useState<ManagerCampaign[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError]         = useState<string | null>(null)
  const [retryIn, setRetryIn]     = useState(0)

  const defaults = periodToDates(DEFAULT_PERIOD)
  const dateFrom = searchParams.get('from') ?? defaults.from
  const dateTo   = searchParams.get('to')   ?? defaults.to

  const load = useCallback(async () => {
    if (!accountId) return
    setIsLoading(true)
    setError(null)
    setRetryIn(0)
    try {
      const data = await fetchCampaignData(accountId, dateFrom, dateTo)
      setCampaigns(data)
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      if (msg.includes('RATE_LIMIT')) {
        setError('RATE_LIMIT')
        setRetryIn(RETRY_SECONDS)
      } else {
        setError('Erro ao carregar campanhas da Meta API.')
      }
    } finally {
      setIsLoading(false)
    }
  }, [accountId, dateFrom, dateTo])

  useEffect(() => { load() }, [load])

  // Countdown + auto-retry quando chegar em 0
  useEffect(() => {
    if (retryIn <= 0) return
    const t = setTimeout(() => {
      setRetryIn(n => {
        if (n <= 1) { load(); return 0 }
        return n - 1
      })
    }, 1000)
    return () => clearTimeout(t)
  }, [retryIn, load])

  const rows = useMemo<EntityManagerRow[]>(() =>
    campaigns.map(c => ({
      id:             c.metaCampaignId,
      name:           c.name,
      status:         c.status,
      type:           'campaign',
      dailyBudget:    c.dailyBudget,
      lifetimeBudget: c.lifetimeBudget,
      spend:          c.spend,
      results:        c.results,
      costPerResult:  c.costPerResult,
      impressions:    c.impressions,
      reach:          c.reach,
      frequency:      c.frequency,
      ctr:            c.ctr,
      cpm:            c.cpm,
    })),
    [campaigns],
  )

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Campanhas</h2>
        {!isLoading && !error && (
          <span className="text-sm text-muted-foreground">{rows.length} itens</span>
        )}
      </div>

      <EntityManagerTable
        rows={rows}
        isLoading={isLoading}
        error={error}
        retryIn={retryIn}
        onRetry={load}
        drillDownLabel="Ver Conjuntos"
        drillDownHref={(id, name) =>
          `/ad-sets?campaignId=${encodeURIComponent(id)}&campaignName=${encodeURIComponent(name)}&from=${dateFrom}&to=${dateTo}`
        }
      />
    </div>
  )
}
