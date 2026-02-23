import { cn } from '@/lib/utils'
import { LucideIcon } from 'lucide-react'

interface KPICardProps {
  icon: LucideIcon
  label: string
  value: string
  subtitle?: string
  target?: {
    met: boolean
    text: string
  }
  className?: string
}

export function KPICard({ icon: Icon, label, value, subtitle, target, className }: KPICardProps) {
  return (
    <div className={cn('bg-card rounded-lg border border-border p-4 card-hover', className)}>
      <div className="flex items-start justify-between mb-3">
        <span className="kpi-label">{label}</span>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <p className="kpi-value">{value}</p>
      {subtitle && <p className="kpi-subtitle">{subtitle}</p>}
      {target && (
        <div className="mt-2 flex items-center gap-1.5">
          <span
            className={cn(
              'inline-block w-2 h-2 rounded-full',
              target.met ? 'bg-success' : 'bg-warning'
            )}
          />
          <span className={cn('text-xs', target.met ? 'text-success' : 'text-warning')}>
            {target.text}
          </span>
        </div>
      )}
    </div>
  )
}
