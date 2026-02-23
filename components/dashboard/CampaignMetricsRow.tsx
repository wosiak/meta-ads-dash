import {
  DollarSign,
  Target,
  TrendingDown,
  Users,
  Activity,
  Eye,
  BarChart2,
  Circle,
} from 'lucide-react'
import { KPICard } from './KPICard'
import { formatCurrency, formatNumber, formatCompact } from '@/lib/formatters'
import { cn } from '@/lib/utils'
import type { CampaignMetrics } from '@/types/database'

interface CampaignMetricsRowProps {
  campaign: CampaignMetrics
  cplTarget?: number
}

const STATUS_LABEL: Record<string, string> = {
  ACTIVE:         'Ativa',
  PAUSED:         'Pausada',
  DELETED:        'Excluída',
  ARCHIVED:       'Arquivada',
  IN_PROCESS:     'Em análise',
  WITH_ISSUES:    'Com problemas',
}

const STATUS_COLOR: Record<string, string> = {
  ACTIVE:      'text-success',
  PAUSED:      'text-muted-foreground',
  DELETED:     'text-destructive',
  ARCHIVED:    'text-muted-foreground',
  IN_PROCESS:  'text-warning',
  WITH_ISSUES: 'text-destructive',
}

export function CampaignMetricsRow({ campaign, cplTarget = 20 }: CampaignMetricsRowProps) {
  const cplMet      = campaign.avgCPL > 0 && campaign.avgCPL <= cplTarget
  const statusKey   = campaign.campaignStatus?.toUpperCase() ?? ''
  const statusLabel = STATUS_LABEL[statusKey] ?? campaign.campaignStatus
  const statusColor = STATUS_COLOR[statusKey] ?? 'text-muted-foreground'

  // Rótulo do resultado principal (prioriza mensagens > leads > compras)
  const resultLabel = campaign.totalMessages > 0
    ? 'Mensagens'
    : campaign.totalLeads > 0
    ? 'Leads'
    : 'Compras'

  return (
    <div className="space-y-2">
      {/* Cabeçalho da campanha */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-1">
        {/* Nome + status */}
        <h4 className="text-sm font-semibold text-foreground truncate">
          {campaign.campaignName}
        </h4>
        {statusLabel && (
          <span className={cn('flex items-center gap-1 text-xs shrink-0', statusColor)}>
            <Circle className="h-2 w-2 fill-current" />
            {statusLabel}
          </span>
        )}

        {/* Indicador Meta CPL — mostra apenas se há custo/resultado */}
        {campaign.avgCPL > 0 && (
          <span className={cn(
            'flex items-center gap-1 text-xs shrink-0 ml-auto',
            cplMet ? 'text-success' : 'text-warning'
          )}>
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-current" />
            Meta CPL {formatCurrency(cplTarget)}
            {' · '}
            Atual {formatCurrency(campaign.avgCPL)}
            {' · '}
            {Math.abs(((campaign.avgCPL / cplTarget) - 1) * 100).toFixed(0)}%
            {' '}{cplMet ? 'dentro da meta' : 'acima da meta'}
          </span>
        )}
      </div>

      {/* Grid de KPI cards — idêntico ao layout da conta */}
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-3">
        <KPICard
          icon={DollarSign}
          label="Investimento"
          value={formatCurrency(campaign.totalSpend)}
        />
        <KPICard
          icon={Target}
          label="Resultados"
          value={formatNumber(campaign.totalResults)}
          subtitle={resultLabel}
        />
        <KPICard
          icon={TrendingDown}
          label="Custo/Resultado"
          value={campaign.avgCPL > 0 ? formatCurrency(campaign.avgCPL) : '—'}
          target={
            campaign.avgCPL > 0
              ? {
                  met: cplMet,
                  text: cplMet
                    ? `≤ ${formatCurrency(cplTarget)} OK`
                    : `> ${formatCurrency(cplTarget)} Atenção`,
                }
              : undefined
          }
        />
        <KPICard
          icon={Users}
          label="Alcance"
          value={formatCompact(campaign.totalReach)}
        />
        <KPICard
          icon={Activity}
          label="Frequência"
          value={campaign.avgFrequency > 0 ? `${campaign.avgFrequency.toFixed(1)}x` : '—'}
        />
        <KPICard
          icon={Eye}
          label="Impressões"
          value={formatCompact(campaign.totalImpressions)}
        />
        <KPICard
          icon={BarChart2}
          label="CPM"
          value={campaign.avgCPM > 0 ? formatCurrency(campaign.avgCPM) : '—'}
          subtitle="Opcional"
        />
      </div>
    </div>
  )
}
