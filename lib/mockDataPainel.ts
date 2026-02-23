import { campaigns, adSets, ads, type Status } from './mockData'

// ─── Shared chart colors ─────────────────────────────────────────────────────
export const C = {
  teal:    'hsl(172, 66%, 50%)',
  amber:   'hsl(38, 92%, 50%)',
  red:     'hsl(0, 72%, 51%)',
  success: 'hsl(160, 84%, 39%)',
  cyan:    'hsl(200, 95%, 50%)',
  purple:  'hsl(262, 83%, 58%)',
  muted:   'hsl(215, 15%, 55%)',
  grid:    'hsl(222, 14%, 18%)',
  popover: 'hsl(222, 16%, 14%)',
  border:  'hsl(222, 14%, 18%)',
  fg:      'hsl(210, 20%, 92%)',
  secondary: 'hsl(222, 15%, 16%)',
} as const

export const TOOLTIP_STYLE = {
  backgroundColor: C.popover,
  border: `1px solid ${C.border}`,
  borderRadius: '8px',
  fontSize: '12px',
  color: C.fg,
}

export const STATUS_COLOR: Record<Status, string> = {
  active:   C.success,
  paused:   C.amber,
  review:   C.cyan,
  rejected: C.red,
  error:    C.red,
}

export const CPL_TARGET = 20

// ─── Tab 1: Tendência — série diária enriquecida ─────────────────────────────
export interface DailyEnriched {
  date: string
  spend: number
  results: number
  cpl: number
  prevSpend: number
  prevResults: number
  prevCpl: number
}

export const dailyEnriched: DailyEnriched[] = Array.from({ length: 30 }, (_, i) => {
  const date = new Date(2026, 0, 1 + i)
  const base  = 1200 + Math.sin(i / 3) * 380 + (i % 5) * 40
  const spend = Math.round(base * 100) / 100
  const results = Math.round(42 + Math.sin(i / 3) * 14 + (i % 4) * 1.5)
  const cpl = results > 0 ? Math.round((spend / results) * 100) / 100 : 0
  // Previous period: ~15-25% variation
  const prevSpend   = Math.round(base * (0.78 + Math.sin(i / 4) * 0.12) * 100) / 100
  const prevResults = Math.round(results * (0.82 + Math.cos(i / 5) * 0.1))
  const prevCpl     = prevResults > 0 ? Math.round((prevSpend / prevResults) * 100) / 100 : 0
  return {
    date: date.toISOString().split('T')[0],
    spend, results, cpl,
    prevSpend, prevResults, prevCpl,
  }
})

// ─── Tab 2A: Top 10 por impacto ──────────────────────────────────────────────
export interface RankedItem {
  id: string
  name: string
  status: Status
  spend: number
  results: number
  cpl: number
}

// Combina campanhas + conjuntos, top 10 por spend
const allForRanking: RankedItem[] = [
  ...campaigns.map(c => ({ id: c.id, name: c.name, status: c.status, spend: c.spend, results: c.results, cpl: c.costPerResult })),
  ...adSets.map(a   => ({ id: a.id, name: a.name, status: a.status, spend: a.spend, results: a.results, cpl: a.costPerResult })),
]
export const top10Items: RankedItem[] = allForRanking
  .sort((a, b) => b.spend - a.spend)
  .slice(0, 10)

// ─── Tab 2B: Distribuição % do gasto por dimensão (4 semanas) ────────────────
export interface StackedWeek {
  week: string
  [key: string]: number | string
}

export const stackedByObjective: StackedWeek[] = [
  { week: 'Sem 1', Conversões: 46, Tráfego: 24, Leads: 19, Alcance: 11 },
  { week: 'Sem 2', Conversões: 44, Tráfego: 26, Leads: 20, Alcance: 10 },
  { week: 'Sem 3', Conversões: 50, Tráfego: 21, Leads: 18, Alcance: 11 },
  { week: 'Sem 4', Conversões: 43, Tráfego: 27, Leads: 21, Alcance: 9  },
]

export const stackedByPlacement: StackedWeek[] = [
  { week: 'Sem 1', Feed: 48, Stories: 26, Reels: 17, Outros: 9  },
  { week: 'Sem 2', Feed: 46, Stories: 27, Reels: 18, Outros: 9  },
  { week: 'Sem 3', Feed: 50, Stories: 25, Reels: 16, Outros: 9  },
  { week: 'Sem 4', Feed: 45, Stories: 28, Reels: 18, Outros: 9  },
]

export const stackedByDevice: StackedWeek[] = [
  { week: 'Sem 1', Mobile: 64, Desktop: 30, Tablet: 6 },
  { week: 'Sem 2', Mobile: 66, Desktop: 28, Tablet: 6 },
  { week: 'Sem 3', Mobile: 62, Desktop: 31, Tablet: 7 },
  { week: 'Sem 4', Mobile: 67, Desktop: 27, Tablet: 6 },
]

export const stackedDimensionKeys: Record<string, string[]> = {
  objective: ['Conversões', 'Tráfego', 'Leads', 'Alcance'],
  placement: ['Feed', 'Stories', 'Reels', 'Outros'],
  device:    ['Mobile', 'Desktop', 'Tablet'],
}

export const stackedDimensionColors: Record<string, string[]> = {
  objective: [C.teal, C.amber, C.cyan, C.purple],
  placement: [C.teal, C.amber, C.purple, C.muted],
  device:    [C.teal, C.amber, C.cyan],
}

// ─── Tab 2C: Donut de status (≤6 fatias → donut) ────────────────────────────
export const statusDonut = [
  { name: 'Ativo',      value: 12, color: C.success },
  { name: 'Pausado',    value: 5,  color: C.amber   },
  { name: 'Em análise', value: 2,  color: C.cyan    },
  { name: 'Rejeitado',  value: 0,  color: C.red     },
  { name: 'Com erro',   value: 1,  color: C.red     },
].filter(d => d.value > 0) // remove fatias vazias (respeita regra ≤6)

// ─── Tab 3A: Scatter / Bubble — diagnóstico de desperdício ───────────────────
export interface ScatterItem {
  id: string
  name: string
  status: Status
  spend: number
  cpl: number
  results: number
  type: 'campaign' | 'adset' | 'ad'
}

export const scatterData: ScatterItem[] = [
  ...campaigns.map(c => ({ id: c.id, name: c.name, status: c.status, spend: c.spend, cpl: c.costPerResult, results: c.results, type: 'campaign' as const })),
  ...adSets.map(a   => ({ id: a.id, name: a.name, status: a.status, spend: a.spend, cpl: a.costPerResult, results: a.results, type: 'adset'    as const })),
  ...ads.map(a      => ({ id: a.id, name: a.name, status: a.status, spend: a.spend, cpl: a.costPerResult, results: a.results, type: 'ad'        as const })),
]

// ─── Tab 3B: Histograma CPL ──────────────────────────────────────────────────
export interface HistoBin {
  range: string
  count: number
  items: string[]
}

function buildCplHistogram(): HistoBin[] {
  const allItems = [...campaigns, ...adSets, ...ads]
  const bins: HistoBin[] = [
    { range: '≤ R$10',   count: 0, items: [] },
    { range: 'R$10–20',  count: 0, items: [] },
    { range: 'R$20–30',  count: 0, items: [] },
    { range: 'R$30–40',  count: 0, items: [] },
    { range: '> R$40',   count: 0, items: [] },
  ]
  allItems.forEach(item => {
    const cpl = item.costPerResult
    const idx = cpl <= 10 ? 0 : cpl <= 20 ? 1 : cpl <= 30 ? 2 : cpl <= 40 ? 3 : 4
    bins[idx].count++
    bins[idx].items.push(item.name)
  })
  return bins
}
export const cplHistogram = buildCplHistogram()

// ─── Tab 3C: Pacing ──────────────────────────────────────────────────────────
export const pacingData = {
  spent:        45230.50,
  planned:      60000,
  daysElapsed:  21,
  totalDays:    30,
  get expectedAtToday() { return (this.planned / this.totalDays) * this.daysElapsed },
  get pctSpent()        { return (this.spent / this.planned) * 100 },
  get pctExpected()     { return (this.expectedAtToday / this.planned) * 100 },
  get deltaVsExpected() { return ((this.spent - this.expectedAtToday) / this.expectedAtToday) * 100 },
}

// ─── Tab 4: Breakdowns ───────────────────────────────────────────────────────
export interface BreakdownRow { label: string; spend: number; results: number; cpl: number }

export const breakdownPlacement: BreakdownRow[] = [
  { label: 'Feed',    spend: 21880, results: 890, cpl: 24.59 },
  { label: 'Stories', spend: 11810, results: 512, cpl: 23.07 },
  { label: 'Reels',   spend:  8210, results: 298, cpl: 27.55 },
]

export const breakdownDevice: BreakdownRow[] = [
  { label: 'Mobile',  spend: 28948, results: 1175, cpl: 24.63 },
  { label: 'Desktop', spend: 13569, results:  567, cpl: 23.93 },
  { label: 'Tablet',  spend:  2713, results:  105, cpl: 25.84 },
]

export const breakdownWeekday: BreakdownRow[] = [
  { label: 'Segunda', spend: 7340, results: 290, cpl: 25.31 },
  { label: 'Terça',   spend: 7890, results: 323, cpl: 24.43 },
  { label: 'Quarta',  spend: 8120, results: 355, cpl: 22.87 },
  { label: 'Quinta',  spend: 7650, results: 298, cpl: 25.67 },
  { label: 'Sexta',   spend: 7980, results: 312, cpl: 25.58 },
  { label: 'Sábado',  spend: 4230, results: 154, cpl: 27.47 },
  { label: 'Domingo', spend: 2020, results:  85, cpl: 23.76 },
]

// Heatmap 7×24: value = resultados simulados por hora/dia
export interface HeatCell { day: number; hour: number; results: number; cpl: number }

function buildHeatmap(): HeatCell[] {
  const cells: HeatCell[] = []
  // padrão realista: dias 0=Seg, 6=Dom
  const dayMod   = [1.0, 1.05, 1.1, 1.05, 0.95, 0.65, 0.45]
  const hourMod  = [0.1, 0.05, 0.05, 0.05, 0.1, 0.2, 0.4, 0.7, 1.0, 1.2, 1.3, 1.25,
                    1.15, 1.2, 1.25, 1.3, 1.4, 1.5, 1.6, 1.5, 1.3, 1.0, 0.7, 0.4]
  for (let d = 0; d < 7; d++) {
    for (let h = 0; h < 24; h++) {
      const base = 12 * dayMod[d] * hourMod[h]
      const results = Math.max(0, Math.round(base + (Math.random() * 3 - 1.5)))
      const cpl = results > 0 ? Math.round((1800 * dayMod[d] * (2 - hourMod[h] * 0.5) / results) * 10) / 10 : 999
      cells.push({ day: d, hour: h, results, cpl })
    }
  }
  return cells
}
export const heatmapData = buildHeatmap()
