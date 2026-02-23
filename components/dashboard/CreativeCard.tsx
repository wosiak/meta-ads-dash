import { type Creative } from '@/lib/mockData'
import { formatCurrency, formatNumber } from '@/lib/formatters'
import { cn } from '@/lib/utils'
import { ImageIcon } from 'lucide-react'

interface CreativeCardProps {
  creative: Creative
  onClick?: () => void
}

const tagClass: Record<string, string> = {
  good: 'tag-good',
  neutral: 'tag-neutral',
  bad: 'tag-bad',
}

const tagLabel: Record<string, string> = {
  good: 'Bom',
  neutral: 'Neutro',
  bad: 'Ruim',
}

export function CreativeCard({ creative, onClick }: CreativeCardProps) {
  return (
    <div
      onClick={onClick}
      className="bg-card rounded-lg border border-border overflow-hidden cursor-pointer card-hover group"
    >
      {/* Thumbnail placeholder */}
      <div
        className="h-36 flex items-center justify-center relative"
        style={{ backgroundColor: creative.color + '22' }}
      >
        <ImageIcon
          className="h-10 w-10 transition-transform duration-200 group-hover:scale-110"
          style={{ color: creative.color }}
        />
        <span className={cn('absolute top-2 right-2', tagClass[creative.performanceTag])}>
          {tagLabel[creative.performanceTag]}
        </span>
      </div>

      {/* Info */}
      <div className="p-3 space-y-2">
        <p className="text-sm font-medium text-foreground truncate">{creative.name}</p>
        <p className="text-xs text-muted-foreground truncate">{creative.campaignName}</p>
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">
            Spend: <span className="text-foreground font-medium">{formatCurrency(creative.spend)}</span>
          </span>
          <span className="text-muted-foreground">
            Res: <span className="text-foreground font-medium">{formatNumber(creative.results)}</span>
          </span>
        </div>
        <p className={cn(
          'text-xs font-semibold',
          creative.costPerResult <= 20 ? 'cpl-good' : creative.costPerResult <= 30 ? 'cpl-attention' : 'cpl-bad'
        )}>
          CPR: {formatCurrency(creative.costPerResult)}
        </p>
      </div>
    </div>
  )
}
