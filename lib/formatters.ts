export const formatCurrency = (value: number): string =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)

export const formatNumber = (value: number): string =>
  new Intl.NumberFormat('pt-BR').format(value)

export const formatCompact = (value: number): string => {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`
  return value.toString()
}

export const formatPercent = (value: number): string =>
  `${value.toFixed(1)}%`

/** Returns CSS class for CPL conditional formatting based on target */
export const getCplClass = (cpl: number, target: number): string => {
  if (cpl <= target) return 'cpl-good'
  if (cpl <= target * 1.5) return 'cpl-attention'
  return 'cpl-bad'
}
