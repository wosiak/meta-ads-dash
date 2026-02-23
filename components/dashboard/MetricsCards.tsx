'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { DashboardMetrics } from '@/types/database'

interface MetricsCardsProps {
  data: DashboardMetrics
}

export function MetricsCards({ data }: MetricsCardsProps) {
  const metrics = [
    {
      title: 'Investimento Total',
      value: new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
      }).format(data.totalSpend),
      icon: '💰',
      description: 'Total investido no período',
    },
    {
      title: 'Total de Leads',
      value: data.totalLeads.toLocaleString('pt-BR'),
      icon: '📊',
      description: 'Leads gerados',
    },
    {
      title: 'Custo por Lead (CPL)',
      value: new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
      }).format(data.avgCPL),
      icon: '💵',
      description: 'Média do período',
    },
    {
      title: 'CTR Médio',
      value: `${data.avgCTR.toFixed(2)}%`,
      icon: '👆',
      description: 'Click Through Rate',
    },
    {
      title: 'Alcance Total',
      value: data.totalReach.toLocaleString('pt-BR'),
      icon: '👥',
      description: 'Pessoas alcançadas',
    },
    {
      title: 'Frequência Média',
      value: data.avgFrequency.toFixed(2),
      icon: '🔄',
      description: 'Vezes que viu o anúncio',
    },
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {metrics.map((metric) => (
        <Card key={metric.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {metric.title}
            </CardTitle>
            <span className="text-2xl">{metric.icon}</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metric.value}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {metric.description}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
