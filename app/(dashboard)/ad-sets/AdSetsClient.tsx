'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { EntityManagerTable, type EntityManagerRow } from '@/components/dashboard/EntityManagerTable'
import { fetchAdSetData } from '@/app/actions/getManagerData'
import type { ManagerAdSet } from '@/lib/dashboard'
import { periodToDates, DEFAULT_PERIOD } from '@/lib/periods'
import { X, Megaphone } from 'lucide-react'

const RETRY_SECONDS = 30

interface Props {
  accountId: string
}

export function AdSetsClient({ accountId }: Props) {
  const searchParams = useSearchParams()
  const router       = useRouter()
  const [adSets, setAdSets]       = useState<ManagerAdSet[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError]         = useState<string | null>(null)
  const [retryIn, setRetryIn]     = useState(0)

  const defaults     = periodToDates(DEFAULT_PERIOD)
  const dateFrom     = searchParams.get('from')         ?? defaults.from
  const dateTo       = searchParams.get('to')           ?? defaults.to
  const campaignId   = searchParams.get('campaignId')   ?? undefined
  const campaignName = searchParams.get('campaignName') ?? undefined

  const load = useCallback(async () => {
    if (!accountId) return
    setIsLoading(true)
    setError(null)
    setRetryIn(0)
    try {
      const data = await fetchAdSetData(accountId, dateFrom, dateTo, campaignId)
      setAdSets(data)
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      if (msg.includes('RATE_LIMIT')) {
        setError('RATE_LIMIT')
        setRetryIn(RETRY_SECONDS)
      } else {
        setError('Erro ao carregar conjuntos da Meta API.')
      }
    } finally {
      setIsLoading(false)
    }
  }, [accountId, dateFrom, dateTo, campaignId])

  useEffect(() => { load() }, [load])

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
    adSets.map(a => ({
      id:             a.metaAdSetId,
      name:           a.name,
      status:         a.status,
      type:           'adset',
      campaignId:     a.campaignId,
      campaignName:   a.campaignName,
      dailyBudget:    a.dailyBudget,
      lifetimeBudget: a.lifetimeBudget,
      spend:          a.spend,
      results:        a.results,
      costPerResult:  a.costPerResult,
      impressions:    a.impressions,
      reach:          a.reach,
      frequency:      a.frequency,
      ctr:            a.ctr,
      cpm:            a.cpm,
    })),
    [adSets],
  )

  const clearFilter = () => router.push(`/ad-sets?from=${dateFrom}&to=${dateTo}`)

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-foreground">Conjuntos de Anúncios</h2>
          {campaignId && campaignName && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs text-primary">
              <Megaphone className="h-3 w-3" />
              <span className="max-w-[180px] truncate">{decodeURIComponent(campaignName)}</span>
              <button
                onClick={clearFilter}
                className="ml-0.5 hover:text-primary/70 transition-colors cursor-pointer"
                title="Remover filtro"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          )}
        </div>
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
        drillDownLabel="Ver Anúncios"
        drillDownHref={(id, name) =>
          `/ads?adsetId=${encodeURIComponent(id)}&adsetName=${encodeURIComponent(name)}&from=${dateFrom}&to=${dateTo}`
        }
      />
    </div>
  )
}
