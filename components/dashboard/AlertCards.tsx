import { AlertTriangle, AlertCircle, Info } from 'lucide-react'
import { alerts, type AlertItem } from '@/lib/mockData'
import { cn } from '@/lib/utils'

const iconMap = {
  error: AlertCircle,
  warning: AlertTriangle,
  info: Info,
}

const styleMap = {
  error: 'border-destructive/30 bg-destructive/5',
  warning: 'border-warning/30 bg-warning/5',
  info: 'border-primary/30 bg-primary/5',
}

const iconColorMap = {
  error: 'text-destructive',
  warning: 'text-warning',
  info: 'text-primary',
}

export function AlertCards() {
  if (alerts.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4">
        Nenhum alerta no período — tudo certo!
      </p>
    )
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {alerts.map((alert: AlertItem) => {
        const Icon = iconMap[alert.type]
        return (
          <div
            key={alert.id}
            className={cn('flex gap-3 p-3 rounded-lg border', styleMap[alert.type])}
          >
            <Icon className={cn('h-5 w-5 shrink-0 mt-0.5', iconColorMap[alert.type])} />
            <div className="min-w-0">
              <p className="text-sm font-medium text-foreground">{alert.title}</p>
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                {alert.description}
              </p>
            </div>
          </div>
        )
      })}
    </div>
  )
}
