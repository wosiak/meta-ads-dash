import { FunnelChart } from '@/components/dashboard/FunnelChart'

export default function FunnelPage() {
  return (
    <div className="space-y-4 animate-fade-in">
      <div>
        <h2 className="text-lg font-semibold text-foreground">Funil de Conversão</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Visualização do funil: Impressões → Engajamento → Leads → Compras
        </p>
      </div>
      <FunnelChart />
    </div>
  )
}
