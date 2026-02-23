import { funnelData } from '@/lib/mockData'
import { formatCompact, formatCurrency, formatPercent } from '@/lib/formatters'

export function FunnelChart() {
  const maxVal = funnelData[0]?.value || 1

  return (
    <div className="space-y-4 max-w-2xl">
      {funnelData.map((step, i) => {
        const widthPct = Math.max((step.value / maxVal) * 100, 8)
        return (
          <div key={step.label} className="space-y-1.5">
            <div className="flex items-baseline justify-between">
              <span className="text-sm font-medium text-foreground">{step.label}</span>
              <div className="flex items-center gap-3">
                <span className="text-lg font-bold text-foreground">
                  {formatCompact(step.value)}
                </span>
                {step.rate !== undefined && (
                  <span className="text-xs text-muted-foreground">
                    ({formatPercent(step.rate)})
                  </span>
                )}
              </div>
            </div>
            <div className="h-8 bg-secondary rounded-md overflow-hidden">
              <div
                className="h-full bg-primary/20 rounded-md flex items-center transition-all duration-700 ease-out"
                style={{ width: `${widthPct}%` }}
              >
                <div
                  className="h-full bg-primary rounded-md transition-all duration-700 ease-out"
                  style={{ width: '100%', opacity: 1 - i * 0.15 }}
                />
              </div>
            </div>
            {step.costPerStep !== undefined && (
              <p className="text-xs text-muted-foreground">
                Custo por etapa:{' '}
                <span className="text-foreground font-medium">
                  {formatCurrency(step.costPerStep)}
                </span>
              </p>
            )}
          </div>
        )
      })}
    </div>
  )
}
