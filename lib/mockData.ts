export type Status = 'active' | 'paused' | 'review' | 'rejected' | 'error'
export type PerformanceTag = 'good' | 'neutral' | 'bad'

export interface EntityRow {
  id: string
  name: string
  status: Status
  objective: string
  budget: number
  spend: number
  results: number
  costPerResult: number
  reach: number
  frequency: number
  impressions: number
}

export interface Creative {
  id: string
  name: string
  campaignName: string
  spend: number
  results: number
  costPerResult: number
  performanceTag: PerformanceTag
  color: string
}

export interface DailyData {
  date: string
  spend: number
  results: number
}

export interface AlertItem {
  id: string
  type: 'error' | 'warning' | 'info'
  title: string
  description: string
}

export interface FunnelStep {
  label: string
  value: number
  rate?: number
  costPerStep?: number
}

export const kpiSummary = {
  spend: 45230.50,
  results: 1847,
  costPerResult: 24.49,
  reach: 892340,
  frequency: 2.3,
  impressions: 2052382,
  cpm: 22.04,
  cplTarget: 20,
}

export const campaigns: EntityRow[] = [
  { id: 'C001', name: 'Prospecção - Lookalike 1%', status: 'active', objective: 'Conversões', budget: 500, spend: 12450.30, results: 520, costPerResult: 23.94, reach: 234560, frequency: 2.1, impressions: 492576 },
  { id: 'C002', name: 'Remarketing - Carrinho Abandonado', status: 'active', objective: 'Conversões', budget: 300, spend: 8320.00, results: 612, costPerResult: 13.59, reach: 89230, frequency: 3.4, impressions: 303382 },
  { id: 'C003', name: 'Topo de Funil - Interesses', status: 'active', objective: 'Tráfego', budget: 250, spend: 9870.40, results: 245, costPerResult: 40.29, reach: 312450, frequency: 1.8, impressions: 562410 },
  { id: 'C004', name: 'Conversão - Formulário Lead', status: 'paused', objective: 'Leads', budget: 400, spend: 6230.00, results: 198, costPerResult: 31.46, reach: 145670, frequency: 2.5, impressions: 364175 },
  { id: 'C005', name: 'Brand Awareness - Vídeo', status: 'active', objective: 'Alcance', budget: 200, spend: 4560.80, results: 156, costPerResult: 29.24, reach: 198340, frequency: 1.4, impressions: 277676 },
  { id: 'C006', name: 'Teste A/B - Criativos Novos', status: 'review', objective: 'Conversões', budget: 150, spend: 1230.00, results: 42, costPerResult: 29.29, reach: 34560, frequency: 1.2, impressions: 41472 },
  { id: 'C007', name: 'Retargeting - Visitantes 30d', status: 'active', objective: 'Conversões', budget: 350, spend: 2120.00, results: 62, costPerResult: 34.19, reach: 23450, frequency: 4.1, impressions: 96145 },
  { id: 'C008', name: 'Campanha Sazonal - Black Friday', status: 'error', objective: 'Conversões', budget: 600, spend: 449.00, results: 12, costPerResult: 37.42, reach: 12340, frequency: 1.1, impressions: 13574 },
]

export const adSets: EntityRow[] = [
  { id: 'AS001', name: 'LAL 1% - Compradores 180d', status: 'active', objective: 'Conversões', budget: 250, spend: 6200.00, results: 280, costPerResult: 22.14, reach: 123400, frequency: 2.0, impressions: 246800 },
  { id: 'AS002', name: 'LAL 1% - AddToCart 90d', status: 'active', objective: 'Conversões', budget: 250, spend: 6250.30, results: 240, costPerResult: 26.04, reach: 111160, frequency: 2.2, impressions: 244552 },
  { id: 'AS003', name: 'Remarketing - 7 dias', status: 'active', objective: 'Conversões', budget: 150, spend: 4560.00, results: 340, costPerResult: 13.41, reach: 45230, frequency: 3.8, impressions: 171874 },
  { id: 'AS004', name: 'Remarketing - 30 dias', status: 'active', objective: 'Conversões', budget: 150, spend: 3760.00, results: 272, costPerResult: 13.82, reach: 43900, frequency: 3.0, impressions: 131700 },
  { id: 'AS005', name: 'Interesse - Moda Feminina', status: 'paused', objective: 'Tráfego', budget: 125, spend: 4320.40, results: 112, costPerResult: 38.57, reach: 167230, frequency: 1.6, impressions: 267568 },
  { id: 'AS006', name: 'Interesse - Fitness', status: 'active', objective: 'Tráfego', budget: 125, spend: 5550.00, results: 133, costPerResult: 41.73, reach: 145220, frequency: 2.0, impressions: 290440 },
  { id: 'AS007', name: 'Formulário - Desktop', status: 'paused', objective: 'Leads', budget: 200, spend: 3100.00, results: 105, costPerResult: 29.52, reach: 78340, frequency: 2.3, impressions: 180182 },
  { id: 'AS008', name: 'Formulário - Mobile', status: 'paused', objective: 'Leads', budget: 200, spend: 3130.00, results: 93, costPerResult: 33.66, reach: 67330, frequency: 2.7, impressions: 181791 },
]

export const ads: EntityRow[] = [
  { id: 'AD001', name: 'Carrossel - Produtos Top', status: 'active', objective: 'Conversões', budget: 125, spend: 3200.00, results: 148, costPerResult: 21.62, reach: 65000, frequency: 2.0, impressions: 130000 },
  { id: 'AD002', name: 'Vídeo 15s - Oferta Flash', status: 'active', objective: 'Conversões', budget: 125, spend: 3050.30, results: 132, costPerResult: 23.11, reach: 58400, frequency: 2.2, impressions: 128480 },
  { id: 'AD003', name: 'Imagem Estática - Frete Grátis', status: 'active', objective: 'Conversões', budget: 125, spend: 3400.00, results: 128, costPerResult: 26.56, reach: 56000, frequency: 2.3, impressions: 128800 },
  { id: 'AD004', name: 'Stories - Depoimento Cliente', status: 'active', objective: 'Conversões', budget: 125, spend: 2850.00, results: 112, costPerResult: 25.45, reach: 55160, frequency: 1.9, impressions: 104804 },
  { id: 'AD005', name: 'Reels - Unboxing', status: 'active', objective: 'Conversões', budget: 75, spend: 2400.00, results: 180, costPerResult: 13.33, reach: 24000, frequency: 3.5, impressions: 84000 },
  { id: 'AD006', name: 'DPA - Catálogo Completo', status: 'active', objective: 'Conversões', budget: 75, spend: 2160.00, results: 160, costPerResult: 13.50, reach: 21230, frequency: 3.3, impressions: 70059 },
  { id: 'AD007', name: 'Imagem - Desconto 30%', status: 'paused', objective: 'Tráfego', budget: 65, spend: 2100.40, results: 56, costPerResult: 37.51, reach: 89000, frequency: 1.5, impressions: 133500 },
  { id: 'AD008', name: 'Vídeo Longo - Tutorial', status: 'active', objective: 'Alcance', budget: 100, spend: 2200.00, results: 78, costPerResult: 28.21, reach: 104000, frequency: 1.3, impressions: 135200 },
  { id: 'AD009', name: 'Lead Form - Consultoria', status: 'paused', objective: 'Leads', budget: 100, spend: 1560.00, results: 52, costPerResult: 30.00, reach: 39000, frequency: 2.4, impressions: 93600 },
  { id: 'AD010', name: 'Carrossel - Antes/Depois', status: 'review', objective: 'Conversões', budget: 75, spend: 615.00, results: 21, costPerResult: 29.29, reach: 17000, frequency: 1.2, impressions: 20400 },
]

export const creatives: Creative[] = [
  { id: 'CR001', name: 'Carrossel Produtos Top', campaignName: 'Prospecção - Lookalike 1%', spend: 3200, results: 148, costPerResult: 21.62, performanceTag: 'good', color: 'hsl(172, 66%, 50%)' },
  { id: 'CR002', name: 'Vídeo 15s Oferta Flash', campaignName: 'Prospecção - Lookalike 1%', spend: 3050, results: 132, costPerResult: 23.11, performanceTag: 'good', color: 'hsl(200, 95%, 50%)' },
  { id: 'CR003', name: 'Imagem Frete Grátis', campaignName: 'Topo de Funil - Interesses', spend: 3400, results: 128, costPerResult: 26.56, performanceTag: 'neutral', color: 'hsl(38, 92%, 50%)' },
  { id: 'CR004', name: 'Stories Depoimento', campaignName: 'Remarketing - Carrinho', spend: 2850, results: 112, costPerResult: 25.45, performanceTag: 'neutral', color: 'hsl(262, 83%, 58%)' },
  { id: 'CR005', name: 'Reels Unboxing', campaignName: 'Remarketing - Carrinho', spend: 2400, results: 180, costPerResult: 13.33, performanceTag: 'good', color: 'hsl(160, 84%, 39%)' },
  { id: 'CR006', name: 'DPA Catálogo Completo', campaignName: 'Remarketing - Carrinho', spend: 2160, results: 160, costPerResult: 13.50, performanceTag: 'good', color: 'hsl(340, 75%, 55%)' },
  { id: 'CR007', name: 'Imagem Desconto 30%', campaignName: 'Topo de Funil - Interesses', spend: 2100, results: 56, costPerResult: 37.51, performanceTag: 'bad', color: 'hsl(0, 72%, 51%)' },
  { id: 'CR008', name: 'Vídeo Tutorial Longo', campaignName: 'Brand Awareness - Vídeo', spend: 2200, results: 78, costPerResult: 28.21, performanceTag: 'neutral', color: 'hsl(222, 18%, 30%)' },
]

export const dailyTrend: DailyData[] = Array.from({ length: 30 }, (_, i) => {
  const date = new Date(2026, 0, 1 + i)
  const base = 1200 + Math.sin(i / 3) * 400
  const results = Math.round(40 + Math.sin(i / 3) * 15)
  return {
    date: date.toISOString().split('T')[0],
    spend: Math.round(base * 100) / 100,
    results,
  }
})

export const alerts: AlertItem[] = [
  { id: 'A1', type: 'error', title: 'Erro de pagamento', description: 'Conta com método de pagamento expirado. Campanhas podem ser pausadas.' },
  { id: 'A2', type: 'warning', title: 'Gasto alto sem resultado', description: 'Campanha "Topo de Funil - Interesses" gastou R$9.870 com CPL de R$40,29 (2x acima da meta).' },
  { id: 'A3', type: 'warning', title: 'Queda brusca de resultados', description: 'Retargeting - Visitantes 30d teve queda de 45% nos resultados vs. período anterior.' },
  { id: 'A4', type: 'error', title: 'Campanha com erro', description: '"Campanha Sazonal" está com status de erro. Verifique as configurações.' },
]

export const funnelData: FunnelStep[] = [
  { label: 'Impressões', value: 2052382, costPerStep: 22.04 },
  { label: 'Engajamento', value: 342063, rate: 16.7 },
  { label: 'Leads/Conversas', value: 1847, rate: 0.54, costPerStep: 24.49 },
  { label: 'Compras', value: 423, rate: 22.9, costPerStep: 106.93 },
]

export const statusCounts = [
  { status: 'active' as Status, label: 'Ativo', count: 12 },
  { status: 'paused' as Status, label: 'Pausado', count: 5 },
  { status: 'review' as Status, label: 'Em análise', count: 2 },
  { status: 'rejected' as Status, label: 'Rejeitado', count: 0 },
  { status: 'error' as Status, label: 'Com erro', count: 1 },
]
