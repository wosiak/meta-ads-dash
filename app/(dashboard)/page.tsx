import { headers, cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { getCachedOrLiveCampaignMetrics, getAdAccounts, getTopAds } from '@/lib/dashboard'
import { SELECTED_ACCOUNT_COOKIE } from '@/lib/constants'
import type { CampaignMetrics } from '@/types/database'
import { DollarSign, Target, TrendingDown, Users, BarChart2, Eye, Activity } from 'lucide-react'
import { KPICard }             from '@/components/dashboard/KPICard'
import { CampaignMetricsRow }  from '@/components/dashboard/CampaignMetricsRow'
import { DashboardSections }   from '@/components/dashboard/DashboardSections'
import { formatCurrency, formatNumber, formatCompact } from '@/lib/formatters'
import { periodToDates, DEFAULT_PERIOD } from '@/lib/periods'

// Soma as métricas de todas as campanhas para o totalizador
function sumCampaigns(list: CampaignMetrics[]) {
  const totalSpend       = list.reduce((s, c) => s + c.totalSpend,       0)
  const totalResults     = list.reduce((s, c) => s + c.totalResults,     0)
  const totalImpressions = list.reduce((s, c) => s + c.totalImpressions, 0)
  const totalReach       = list.reduce((s, c) => s + c.totalReach,       0)
  // Frequência real = impressões / alcance
  const avgFrequency     = totalReach > 0 ? totalImpressions / totalReach : 0
  // CPM real = (spend / impressões) × 1000
  const avgCPM           = totalImpressions > 0 ? (totalSpend / totalImpressions) * 1000 : 0
  const avgCPL           = totalResults > 0 ? totalSpend / totalResults : 0
  // Prioriza o tipo de resultado mais numeroso para o rótulo
  const totalMsgs  = list.reduce((s, c) => s + c.totalMessages,  0)
  const totalLeads = list.reduce((s, c) => s + c.totalLeads,     0)
  const resultLabel = totalMsgs > 0 ? 'Mensagens' : totalLeads > 0 ? 'Leads' : 'Compras'
  return { totalSpend, totalResults, totalImpressions, totalReach, avgFrequency, avgCPM, avgCPL, resultLabel }
}


interface PageProps {
  searchParams: Promise<{
    token?: string
    from?: string
    to?: string
  }>
}

export default async function OverviewPage({ searchParams }: PageProps) {
  const params       = await searchParams
  const headersList  = await headers()
  const cookieStore  = await cookies()

  const clientId = headersList.get('x-client-id')

  if (!clientId) {
    redirect('/login')
  }

  const defaults = periodToDates(DEFAULT_PERIOD)
  const dateFrom = params.from || defaults.from
  const dateTo   = params.to   || defaults.to

  // Resolve conta efetiva: cookie → primeira conta disponível → sem filtro
  const accounts          = await getAdAccounts(clientId)
  const cookieAccountId   = cookieStore.get(SELECTED_ACCOUNT_COOKIE)?.value
  const effectiveAccountId =
    accounts.find(a => a.id === cookieAccountId)?.id ?? accounts[0]?.id

  const [topAds, campaignMetrics] = await Promise.all([
    getTopAds(clientId, dateFrom, dateTo, 5, effectiveAccountId),
    effectiveAccountId
      ? getCachedOrLiveCampaignMetrics(effectiveAccountId, dateFrom, dateTo)
      : Promise.resolve([]),
  ])

  const cplTarget = 20
  const totals = sumCampaigns(campaignMetrics)

  return (
    <div className="space-y-6 animate-fade-in">

      {/* ── Métricas das campanhas ───────────────────────────────────────────── */}
      {campaignMetrics.length > 0 ? (
        <div className="space-y-5">

          {/* Totalizador */}
          <div className="rounded-lg border border-border/60 border-l-[3px] border-l-primary bg-primary/[0.04] p-3 space-y-2">
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-foreground">
                Total das Campanhas
              </h2>
              <span className="text-xs text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-full font-medium">
                {campaignMetrics.length} {campaignMetrics.length === 1 ? 'campanha' : 'campanhas'}
              </span>
              <span className="text-xs text-muted-foreground ml-auto">Consolidado</span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-3">
              <KPICard icon={DollarSign} label="Investimento"    value={formatCurrency(totals.totalSpend)} />
              <KPICard icon={Target}     label="Resultados"      value={formatNumber(totals.totalResults)} subtitle={totals.resultLabel} />
              <KPICard
                icon={TrendingDown}
                label="Custo/Resultado"
                value={totals.avgCPL > 0 ? formatCurrency(totals.avgCPL) : '—'}
                target={totals.avgCPL > 0 ? {
                  met: totals.avgCPL <= cplTarget,
                  text: totals.avgCPL <= cplTarget
                    ? `≤ ${formatCurrency(cplTarget)} OK`
                    : `> ${formatCurrency(cplTarget)} Atenção`,
                } : undefined}
              />
              <KPICard icon={Users}    label="Alcance"     value={formatCompact(totals.totalReach)} />
              <KPICard icon={Activity} label="Frequência"  value={totals.avgFrequency > 0 ? `${totals.avgFrequency.toFixed(1)}x` : '—'} />
              <KPICard icon={Eye}      label="Impressões"  value={formatCompact(totals.totalImpressions)} />
              <KPICard icon={BarChart2} label="CPM"        value={totals.avgCPM > 0 ? formatCurrency(totals.avgCPM) : '—'} subtitle="Opcional" />
            </div>
          </div>

          {/* Linhas por campanha — recuadas visualmente em relação ao totalizador */}
          <div className="space-y-4 pl-3 border-l border-border/30">
            <p className="text-xs text-muted-foreground">Por campanha</p>
            {campaignMetrics.map((campaign) => (
              <CampaignMetricsRow
                key={campaign.metaCampaignId}
                campaign={campaign}
                cplTarget={cplTarget}
              />
            ))}
          </div>

        </div>
      ) : (
        <div className="flex items-center justify-center h-24 rounded-lg border border-dashed border-border">
          <p className="text-sm text-muted-foreground">
            Nenhuma campanha encontrada para o período selecionado.
          </p>
        </div>
      )}

      {/* Blocos arrastáveis */}
      <DashboardSections
        accountId={effectiveAccountId ?? ''}
        campaigns={campaignMetrics.map(c => ({
          metaCampaignId: c.metaCampaignId,
          campaignName:   c.campaignName,
        }))}
        topAds={topAds}
      />
    </div>
  )
}
