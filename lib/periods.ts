import { format, subDays, startOfMonth, subDays as sub } from 'date-fns'

export type PeriodValue = '7d' | '14d' | '30d' | '90d' | 'mtd'

export interface PeriodOption {
  value: PeriodValue
  label: string
}

export const PERIOD_OPTIONS: PeriodOption[] = [
  { value: '7d',  label: 'Últimos 7 dias'        },
  { value: '14d', label: 'Últimos 14 dias'       },
  { value: '30d', label: 'Últimos 30 dias'       },
  { value: '90d', label: 'Últimos 90 dias'       },
  { value: 'mtd', label: '1º do mês até ontem'  },
]

export const DEFAULT_PERIOD: PeriodValue = '30d'

/**
 * Converte um valor de período em datas { from, to } no formato yyyy-MM-dd.
 */
export function periodToDates(period: PeriodValue): { from: string; to: string } {
  const today     = new Date()
  const yesterday = subDays(today, 1)

  switch (period) {
    case '7d':
      return { from: format(subDays(today, 7),  'yyyy-MM-dd'), to: format(today, 'yyyy-MM-dd') }
    case '14d':
      return { from: format(subDays(today, 14), 'yyyy-MM-dd'), to: format(today, 'yyyy-MM-dd') }
    case '30d':
      return { from: format(subDays(today, 30), 'yyyy-MM-dd'), to: format(today, 'yyyy-MM-dd') }
    case '90d':
      return { from: format(subDays(today, 90), 'yyyy-MM-dd'), to: format(today, 'yyyy-MM-dd') }
    case 'mtd':
      return { from: format(startOfMonth(today), 'yyyy-MM-dd'), to: format(yesterday, 'yyyy-MM-dd') }
    default:
      return { from: format(subDays(today, 30), 'yyyy-MM-dd'), to: format(today, 'yyyy-MM-dd') }
  }
}
