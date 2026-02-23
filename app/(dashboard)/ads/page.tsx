'use client'

import { useState } from 'react'
import { DataTable } from '@/components/dashboard/DataTable'
import { DetailDrawer } from '@/components/dashboard/DetailDrawer'
import { ads, type EntityRow } from '@/lib/mockData'

export default function AdsPage() {
  const [selected, setSelected] = useState<EntityRow | null>(null)

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">Anúncios</h2>
        <span className="text-sm text-muted-foreground">{ads.length} itens</span>
      </div>

      <DataTable
        data={ads}
        cplTarget={20}
        onRowClick={(row) => setSelected(row)}
      />

      <DetailDrawer
        row={selected}
        open={!!selected}
        onClose={() => setSelected(null)}
      />
    </div>
  )
}
