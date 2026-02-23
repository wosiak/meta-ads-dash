'use client'

/**
 * PainelVisualizacoes
 * 
 * Card principal de análise da conta de tráfego.
 * Objetivo: gestor bater o olho e decidir (o que cortar, escalar, onde está caro),
 * e o cliente entender sem se perder.
 *
 * Estrutura:
 *  → Header fixo com controles globais (resultado, granularidade, modo cliente, comparar)
 *  → 4 abas: Tendência · Distribuição · Diagnóstico · Breakdowns
 */

import React, { useState } from 'react'
import { Users, Eye } from 'lucide-react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { TabTendencia }    from './painel/TabTendencia'
import { TabDistribuicao } from './painel/TabDistribuicao'
import { TabDiagnostico }  from './painel/TabDiagnostico'
import { TabBreakdowns }   from './painel/TabBreakdowns'
import { type ScatterItem, C, dailyEnriched, CPL_TARGET } from '@/lib/mockDataPainel'
import { formatCurrency }  from '@/lib/formatters'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, ResponsiveContainer,
} from 'recharts'

// ─── Tipos ──────────────────────────────────────────────────────────────────
type ResultMetric = 'leads' | 'messages' | 'purchases'
type Granularity  = 'day' | 'week'

const RESULT_LABEL: Record<ResultMetric, string> = {
  leads:     'Leads',
  messages:  'Mensagens',
  purchases: 'Compras',
}

const HELP_TEXT =
  'Analise tendência, distribuição de gasto, eficiência (CPL vs meta) e ' +
  'performance por posicionamento, dispositivo e horário. ' +
  'Ative "Modo Cliente" para simplificar a visualização.'

// ─── Mini-série para o drawer de detalhe do scatter ──────────────────────────
function miniSeries(itemId: string) {
  // Usa os últimos 14 dias da tendência, escalado para o item
  return dailyEnriched.slice(-14).map(d => ({
    date:    d.date,
    spend:   Math.round(d.spend * 0.18),
    results: Math.round(d.results * 0.15),
  }))
}

// ─── Drawer lateral: detalhes do item clicado no scatter ─────────────────────
function ItemDrawer({ item, onClose }: { item: ScatterItem | null; onClose: () => void }) {
  if (!item) return null
  const series = miniSeries(item.id)

  const STATUS_LABEL: Record<string, string> = {
    active: 'Ativo', paused: 'Pausado', review: 'Em análise', rejected: 'Rejeitado', error: 'Com erro',
  }
  const STATUS_COLOR: Record<string, string> = {
    active: C.success, paused: C.amber, review: C.cyan, rejected: C.red, error: C.red,
  }

  return (
    <Sheet open={!!item} onOpenChange={() => onClose()}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-sm font-semibold text-foreground line-clamp-2">
            {item.name}
          </SheetTitle>
        </SheetHeader>

        <div className="mt-4 space-y-4">
          {/* Métricas principais */}
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Gasto',       value: formatCurrency(item.spend), color: C.teal    },
              { label: 'Resultados',  value: String(item.results),       color: C.amber   },
              { label: 'CPL',         value: formatCurrency(item.cpl),   color: item.cpl > CPL_TARGET ? C.red : C.success },
              { label: 'Status',      value: STATUS_LABEL[item.status],  color: STATUS_COLOR[item.status] },
            ].map(m => (
              <div key={m.label} className="rounded-lg border border-border bg-secondary p-3">
                <p className="text-xs text-muted-foreground">{m.label}</p>
                <p className="text-sm font-bold mt-0.5" style={{ color: m.color }}>{m.value}</p>
              </div>
            ))}
          </div>

          {item.cpl > CPL_TARGET && (
            <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              ⚠ CPL acima da meta de {formatCurrency(CPL_TARGET)}. Avalie pausar ou revisar criativos.
            </p>
          )}

          {/* Mini série temporal */}
          <div>
            <p className="text-xs text-muted-foreground mb-2">Últimos 14 dias — Gasto estimado</p>
            <ResponsiveContainer width="100%" height={140}>
              <LineChart data={series} margin={{ top: 4, right: 8, bottom: 0, left: -16 }}>
                <CartesianGrid stroke={C.grid} strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" tick={{ fill: C.muted, fontSize: 9 }} axisLine={false} tickLine={false} interval={3} />
                <YAxis tick={{ fill: C.muted, fontSize: 9 }} axisLine={false} tickLine={false} tickFormatter={v => `R$${v}`} />
                <RechartsTooltip
                  contentStyle={{ backgroundColor: C.popover, border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 11 }}
                  labelStyle={{ color: C.fg }}
                />
                <Line dataKey="spend" name="Gasto" stroke={C.teal} strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <p className="text-xs text-muted-foreground">
            Tipo: <strong className="text-foreground capitalize">{item.type === 'campaign' ? 'Campanha' : item.type === 'adset' ? 'Conjunto' : 'Anúncio'}</strong>
          </p>
        </div>
      </SheetContent>
    </Sheet>
  )
}

// ─── Componente principal ────────────────────────────────────────────────────
export function PainelVisualizacoes() {
  const [resultMetric, setResultMetric] = useState<ResultMetric>('leads')
  const [granularity,  setGranularity]  = useState<Granularity>('day')
  const [clientMode,   setClientMode]   = useState(false)
  const [selectedItem, setSelectedItem] = useState<ScatterItem | null>(null)
  const [activeTab,    setActiveTab]    = useState('tendencia')

  const resultLabel = RESULT_LABEL[resultMetric]

  return (
    <TooltipProvider>
      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">

        {/* ── Header fixo ─────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-3 p-4 border-b border-border bg-secondary/40">
          <h3 className="text-sm font-semibold text-foreground mr-auto">
            Painel de Visualizações
          </h3>

          {/* Modo Cliente */}
          <button
            onClick={() => setClientMode(v => !v)}
            className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md border transition-colors ${clientMode ? 'border-teal-500 text-teal-400 bg-teal-500/10' : 'border-border text-muted-foreground hover:border-muted-foreground'}`}
          >
            {clientMode ? <Eye size={13} /> : <Users size={13} />}
            {clientMode ? 'Modo Gestor' : 'Modo Cliente'}
          </button>
        </div>

        {/* ── Abas ──────────────────────────────────────────────────────── */}
        <div className="p-4">
          {clientMode && (
            <div className="mb-3 flex items-center gap-2 text-xs text-teal-400 bg-teal-500/10 border border-teal-500/20 rounded-lg px-3 py-2">
              <Eye size={13} />
              Modo Cliente ativo — gráficos avançados ocultados para simplificar a visualização.
            </div>
          )}

          <Tabs defaultValue="tendencia" onValueChange={setActiveTab}>
            {/* Linha das abas + controles de Tendência alinhados à direita */}
            <div className="flex flex-wrap items-center gap-3 mb-2">
              <TabsList>
                <TabsTrigger value="tendencia">Tendência</TabsTrigger>
                <TabsTrigger value="distribuicao">Distribuição</TabsTrigger>
                <TabsTrigger value="diagnostico">Diagnóstico</TabsTrigger>
                {!clientMode && <TabsTrigger value="breakdowns">Breakdowns</TabsTrigger>}
              </TabsList>

              {/* Seletor de Resultado + toggle Dia/Semana — visíveis apenas na aba Tendência */}
              {activeTab === 'tendencia' && (
                <>
                  <div className="flex items-center gap-1.5 ml-auto">
                    <span className="text-xs text-muted-foreground">Resultado:</span>
                    <select
                      value={resultMetric}
                      onChange={e => setResultMetric(e.target.value as ResultMetric)}
                      className="text-xs bg-secondary border border-border text-foreground rounded-md px-2 py-1 focus:outline-none focus:border-primary"
                    >
                      {(Object.entries(RESULT_LABEL) as [ResultMetric, string][]).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                      ))}
                    </select>
                  </div>

                  <div className="flex gap-0.5 bg-secondary rounded-md p-0.5">
                    {(['day', 'week'] as Granularity[]).map(g => (
                      <button
                        key={g}
                        onClick={() => setGranularity(g)}
                        className={`text-xs px-2.5 py-1 rounded transition-colors ${granularity === g ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                      >
                        {g === 'day' ? 'Dia' : 'Semana'}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            <TabsContent value="tendencia">
              <TabTendencia
                resultLabel={resultLabel}
                granularity={granularity}
              />
            </TabsContent>

            <TabsContent value="distribuicao">
              <TabDistribuicao clientMode={clientMode} />
            </TabsContent>

            <TabsContent value="diagnostico">
              <TabDiagnostico
                onSelectItem={setSelectedItem}
                clientMode={clientMode}
              />
            </TabsContent>

            {!clientMode && (
              <TabsContent value="breakdowns">
                <TabBreakdowns />
              </TabsContent>
            )}
          </Tabs>
        </div>
      </div>

      {/* Drawer de detalhe do item clicado no scatter */}
      <ItemDrawer item={selectedItem} onClose={() => setSelectedItem(null)} />
    </TooltipProvider>
  )
}
