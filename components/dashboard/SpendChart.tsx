'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import type { ChartData } from '@/types/database'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface SpendChartProps {
  data: ChartData[]
}

export function SpendChart({ data }: SpendChartProps) {
  // Formatar dados para o gráfico
  const chartData = data.map((item) => ({
    date: format(new Date(item.date), 'dd/MMM', { locale: ptBR }),
    Investimento: item.spend,
    Leads: item.leads,
    CPL: item.cpl,
  }))

  // Formatador customizado para valores monetários
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Investimento e Leads por Período</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={350}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="date" 
              tick={{ fontSize: 12 }}
              angle={-45}
              textAnchor="end"
              height={70}
            />
            <YAxis 
              yAxisId="left"
              tick={{ fontSize: 12 }}
              tickFormatter={formatCurrency}
            />
            <YAxis 
              yAxisId="right" 
              orientation="right"
              tick={{ fontSize: 12 }}
            />
            <Tooltip 
              formatter={(value: number | undefined, name: string | undefined) => {
                if (value === undefined || name === undefined) return ''
                if (name === 'Investimento' || name === 'CPL') {
                  return formatCurrency(value)
                }
                return value
              }}
              contentStyle={{
                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                border: '1px solid #ccc',
                borderRadius: '4px',
              }}
            />
            <Legend />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="Investimento"
              stroke="#3b82f6"
              strokeWidth={2}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="Leads"
              stroke="#10b981"
              strokeWidth={2}
              dot={{ r: 3 }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}
