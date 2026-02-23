'use client'

import { useState } from 'react'
import { creatives, type Creative } from '@/lib/mockData'
import { CreativeCard } from '@/components/dashboard/CreativeCard'
import { formatCurrency, formatNumber } from '@/lib/formatters'
import { cn } from '@/lib/utils'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { ImageIcon } from 'lucide-react'

export default function CreativesPage() {
  const [selected, setSelected] = useState<Creative | null>(null)

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Criativos</h2>
        <span className="text-sm text-muted-foreground">{creatives.length} criativos</span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
        {creatives.map((c) => (
          <CreativeCard key={c.id} creative={c} onClick={() => setSelected(c)} />
        ))}
      </div>

      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="bg-card border-border max-w-lg">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="text-foreground">{selected.name}</DialogTitle>
              </DialogHeader>
              <div
                className="h-48 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: selected.color + '22' }}
              >
                <ImageIcon className="h-16 w-16" style={{ color: selected.color }} />
              </div>
              <div className="grid grid-cols-2 gap-3 mt-4">
                <div className="bg-secondary/50 rounded-md p-3">
                  <p className="text-xs text-muted-foreground">Campanha</p>
                  <p className="text-sm font-medium mt-0.5">{selected.campaignName}</p>
                </div>
                <div className="bg-secondary/50 rounded-md p-3">
                  <p className="text-xs text-muted-foreground">ID</p>
                  <p className="text-sm font-medium mt-0.5">{selected.id}</p>
                </div>
                <div className="bg-secondary/50 rounded-md p-3">
                  <p className="text-xs text-muted-foreground">Investimento</p>
                  <p className="text-sm font-medium mt-0.5">{formatCurrency(selected.spend)}</p>
                </div>
                <div className="bg-secondary/50 rounded-md p-3">
                  <p className="text-xs text-muted-foreground">Resultados</p>
                  <p className="text-sm font-medium mt-0.5">{formatNumber(selected.results)}</p>
                </div>
                <div className="bg-secondary/50 rounded-md p-3">
                  <p className="text-xs text-muted-foreground">Custo/Resultado</p>
                  <p className={cn(
                    'text-sm font-semibold mt-0.5',
                    selected.costPerResult <= 20 ? 'cpl-good' : selected.costPerResult <= 30 ? 'cpl-attention' : 'cpl-bad'
                  )}>
                    {formatCurrency(selected.costPerResult)}
                  </p>
                </div>
                <div className="bg-secondary/50 rounded-md p-3">
                  <p className="text-xs text-muted-foreground">Performance</p>
                  <span className={cn(
                    'mt-1 inline-block',
                    selected.performanceTag === 'good' ? 'tag-good' : selected.performanceTag === 'neutral' ? 'tag-neutral' : 'tag-bad'
                  )}>
                    {selected.performanceTag === 'good' ? 'Bom' : selected.performanceTag === 'neutral' ? 'Neutro' : 'Ruim'}
                  </span>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
