import { headers, cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { getCachedOrLiveCampaignMetrics, getAdAccounts, getTopAds } from '@/lib/dashboard'
import { SELECTED_ACCOUNT_COOKIE } from '@/lib/constants'
import type { CampaignMetrics } from '@/types/database'
import {
  DollarSign,
  Target,
  TrendingDown,
  Users,
  BarChart2,
  Eye,
  Activity,
} from 'lucide-react'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { KPICard } from '@/components/dashboard/KPICard'
import { TrendChart } from '@/components/dashboard/TrendChart'
import { TopAdsTable } from '@/components/dashboard/TopAdsTable'
import { PainelVisualizacoes } from '@/components/dashboard/PainelVisualizacoes'
import { CampaignMetricsRow } from '@/components/dashboard/CampaignMetricsRow'
import { campaigns, statusCounts, type Status } from '@/lib/mockData'
import { formatCurrency, formatNumber, formatCompact } from '@/lib/formatters'
import { cn } from '@/lib/utils'
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

const statusBadgeClass: Record<Status, string> = {
  active: 'badge-active',
  paused: 'badge-paused',
  review: 'badge-review',
  rejected: 'badge-rejected',
  error: 'badge-error',
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

  const sorted = [...campaigns].sort((a, b) => a.costPerResult - b.costPerResult)
  const top5 = sorted.slice(0, 5)
  const bottom5 = sorted.slice(-5).reverse()

  return (
    <div className="space-y-6 animate-fade-in">

      {/* ── Métricas das campanhas ───────────────────────────────────────────── */}
      {campaignMetrics.length > 0 ? (
        <div className="space-y-5">

          {/* Totalizador */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 px-1">
              <h2 className="text-sm font-semibold text-foreground">
                Total das Campanhas
              </h2>
              <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">
                {campaignMetrics.length} {campaignMetrics.length === 1 ? 'campanha' : 'campanhas'}
              </span>
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

          {/* Separador visual */}
          <div className="border-t border-border/50" />

          {/* Linhas por campanha */}
          <div className="space-y-5">
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

      {/* Accordion sections */}
      <Accordion type="multiple" defaultValue={['trend', 'painel']} className="space-y-3">

        {/* Tendência */}
        <AccordionItem value="trend" className="bg-card rounded-lg border border-border px-4">
          <AccordionTrigger className="text-sm font-medium py-3 hover:no-underline">
            Tendência no Tempo
          </AccordionTrigger>
          <AccordionContent className="pb-4">
            <TrendChart
              accountId={effectiveAccountId ?? ''}
              campaigns={campaignMetrics.map(c => ({
                metaCampaignId: c.metaCampaignId,
                campaignName:   c.campaignName,
              }))}
            />
          </AccordionContent>
        </AccordionItem>

        {/* Painel de Visualizações */}
        <AccordionItem value="painel" className="rounded-lg border border-border overflow-hidden">
          <AccordionTrigger className="text-sm font-medium py-3 px-4 hover:no-underline bg-card">
            Painel de Visualizações
          </AccordionTrigger>
          <AccordionContent className="p-0 bg-background">
            <div className="p-4">
              <PainelVisualizacoes />
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Top Anúncios (dados reais) */}
        <AccordionItem value="top-ads" className="bg-card rounded-lg border border-border px-4">
          <AccordionTrigger className="text-sm font-medium py-3 hover:no-underline">
            Top Anúncios por CPL
          </AccordionTrigger>
          <AccordionContent className="pb-4">
            <TopAdsTable data={topAds} />
          </AccordionContent>
        </AccordionItem>

        {/* Distribuição por status */}
        <AccordionItem value="status" className="bg-card rounded-lg border border-border px-4">
          <AccordionTrigger className="text-sm font-medium py-3 hover:no-underline">
            Distribuição por Status
          </AccordionTrigger>
          <AccordionContent className="pb-4">
            <div className="flex flex-wrap gap-3">
              {statusCounts.map((s) => (
                <div
                  key={s.status}
                  className={cn(
                    'inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium border',
                    statusBadgeClass[s.status]
                  )}
                >
                  {s.label}
                  <span className="text-xs opacity-70">{s.count}</span>
                </div>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Top 5 & Bottom 5 (mock) */}
        <AccordionItem value="ranking" className="bg-card rounded-lg border border-border px-4">
          <AccordionTrigger className="text-sm font-medium py-3 hover:no-underline">
            Top 5 &amp; Bottom 5
          </AccordionTrigger>
          <AccordionContent className="pb-4">
            <div className="grid gap-4 lg:grid-cols-2">
              <div>
                <p className="text-xs text-muted-foreground mb-2">🏆 Melhor CPL</p>
                <div className="space-y-1">
                  {top5.map((c, i) => (
                    <div key={c.id} className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-secondary/30">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-xs text-muted-foreground w-4">{i + 1}.</span>
                        <span className="text-sm truncate">{c.name}</span>
                      </div>
                      <span className="text-sm font-semibold cpl-good shrink-0 ml-2">
                        {formatCurrency(c.costPerResult)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-2">⚠️ Pior CPL</p>
                <div className="space-y-1">
                  {bottom5.map((c, i) => (
                    <div key={c.id} className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-secondary/30">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-xs text-muted-foreground w-4">{i + 1}.</span>
                        <span className="text-sm truncate">{c.name}</span>
                      </div>
                      <span className={cn(
                        'text-sm font-semibold shrink-0 ml-2',
                        c.costPerResult > 30 ? 'cpl-bad' : 'cpl-attention'
                      )}>
                        {formatCurrency(c.costPerResult)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>

      </Accordion>
    </div>
  )
}
