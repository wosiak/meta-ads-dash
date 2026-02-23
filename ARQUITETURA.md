# 📊 Arquitetura do Sistema - Meta Ads Dashboard

## 🏗️ Fluxo de Dados

```
┌─────────────────────────────────────────────────────────┐
│                    USUÁRIO (Cliente)                    │
│         Acessa: dashboard.com?token=abc123              │
└─────────────────────┬───────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────┐
│              MIDDLEWARE (middleware.ts)                 │
│  1. Valida token no banco                               │
│  2. Salva token em cookie                               │
│  3. Adiciona client_id ao header                        │
└─────────────────────┬───────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────┐
│             DASHBOARD PAGE (app/page.tsx)               │
│  1. Lê client_id do header                              │
│  2. Define período (default: 30 dias)                   │
│  3. Busca dados do banco via lib/dashboard.ts          │
└─────────────────────┬───────────────────────────────────┘
                      │
        ┌─────────────┼─────────────┐
        │             │             │
        ▼             ▼             ▼
┌──────────┐  ┌──────────┐  ┌──────────┐
│ Métricas │  │ Gráfico  │  │Top Anúnc.│
│  Cards   │  │  Período │  │  Tabela  │
└──────────┘  └──────────┘  └──────────┘
```

## 🗄️ Estrutura do Banco de Dados (Supabase)

```
clients (Clientes)
  ├── id (UUID)
  ├── name
  ├── access_token (para autenticação)
  └── status
      │
      └── 1:N ──► meta_ad_accounts (Contas Meta)
                      ├── id (UUID)
                      ├── client_id (FK)
                      ├── meta_account_id (act_123...)
                      └── account_name
                          │
                          └── 1:N ──► campaigns (Campanhas)
                                          ├── id (UUID)
                                          ├── meta_campaign_id
                                          └── name
                                              │
                                              └── 1:N ──► ad_sets (Conjuntos)
                                                              ├── id (UUID)
                                                              ├── meta_adset_id
                                                              └── name
                                                                  │
                                                                  └── 1:N ──► ads (Anúncios)
                                                                                  ├── id (UUID)
                                                                                  ├── meta_ad_id
                                                                                  └── name
                                                                                      │
                                                                                      └── 1:N ──► ad_insights
                                                                                                  ├── date_start
                                                                                                  ├── date_stop
                                                                                                  ├── spend
                                                                                                  ├── leads
                                                                                                  ├── cpl
                                                                                                  └── ...
```

## 🔄 Fluxo de Sincronização

```
┌─────────────────────────────────────────────────────────┐
│            1. TRIGGER (Manual ou Cron)                  │
│      POST /api/sync com accountId e período             │
└─────────────────────┬───────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────┐
│      2. API ROUTE (app/api/sync/route.ts)               │
│  - Cria sync_log com status 'running'                   │
│  - Chama Meta Graph API                                 │
└─────────────────────┬───────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────┐
│     3. META GRAPH API (lib/meta-api.ts)                 │
│  GET graph.facebook.com/v24.0/{accountId}               │
│  - Retorna campaigns, ad_sets, ads e insights           │
└─────────────────────┬───────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────┐
│    4. PROCESSAR DADOS (app/api/sync/route.ts)           │
│  Para cada anúncio:                                     │
│    ├── Upsert campaign                                  │
│    ├── Upsert ad_set                                    │
│    ├── Upsert ad                                        │
│    └── Upsert ad_insights (com spend, leads, etc)      │
└─────────────────────┬───────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────┐
│        5. SALVAR NO SUPABASE (lib/supabase.ts)          │
│  - Atualiza sync_log com status 'success'              │
│  - Atualiza last_sync_at da conta                       │
└─────────────────────────────────────────────────────────┘
```

## 📁 Estrutura de Arquivos (Detalhada)

```
meta-ads-dash/
│
├── app/                                # Next.js App Router
│   ├── api/                           # API Routes
│   │   └── sync/
│   │       └── route.ts               # ⭐ API de sincronização
│   │
│   ├── login/
│   │   └── page.tsx                   # Página de login/info
│   │
│   ├── page.tsx                       # ⭐ Dashboard principal
│   ├── layout.tsx                     # Layout global
│   └── globals.css                    # Estilos globais
│
├── components/
│   ├── ui/                            # shadcn/ui components
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── table.tsx
│   │   ├── input.tsx
│   │   ├── calendar.tsx
│   │   └── popover.tsx
│   │
│   └── dashboard/                     # Componentes do dashboard
│       ├── MetricsCards.tsx           # ⭐ Cards de métricas
│       ├── SpendChart.tsx             # ⭐ Gráfico de período
│       ├── TopAdsTable.tsx            # ⭐ Tabela de top ads
│       └── DateRangePicker.tsx        # ⭐ Seletor de data
│
├── lib/                               # Lógica de negócio
│   ├── supabase.ts                    # ⭐ Cliente Supabase
│   ├── auth.ts                        # ⭐ Funções de auth
│   ├── meta-api.ts                    # ⭐ Cliente Meta API
│   ├── dashboard.ts                   # ⭐ Queries do dashboard
│   └── utils.ts                       # Utilitários
│
├── types/
│   └── database.ts                    # ⭐ Tipos TypeScript
│
├── middleware.ts                      # ⭐ Auth middleware
│
├── .env.local                         # ⚠️ NÃO FAZER COMMIT
├── env.example.txt                    # Exemplo de .env
│
├── INSTRUCOES.md                      # 📋 Guia passo a passo
├── README.md                          # Documentação
└── package.json                       # Dependências

⭐ = Arquivo principal
⚠️ = Arquivo sensível
📋 = Documentação
```

## 🔑 Variáveis de Ambiente Necessárias

```bash
# Supabase (3 variáveis)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Meta API (1 variável)
META_APP_ACCESS_TOKEN=EAA8wZA3tSZCuABQze...
```

## 🎯 Componentes e Suas Responsabilidades

### MetricsCards.tsx
```typescript
Input: DashboardMetrics (totalSpend, totalLeads, avgCPL, etc)
Output: 6 cards com ícones e valores formatados
```

### SpendChart.tsx
```typescript
Input: ChartData[] (array com date, spend, leads, cpl, reach)
Output: Gráfico de linhas com 2 eixos Y (Investimento e Leads)
```

### TopAdsTable.tsx
```typescript
Input: TopAd[] (array de anúncios ordenados por CPL)
Output: Tabela com ranking, imagem, métricas
```

### DateRangePicker.tsx
```typescript
Input: URL params (from, to)
Output: Calendário para selecionar período
Ação: Atualiza URL e recarrega página
```

## 🔐 Fluxo de Autenticação

```
1. Cliente acessa: dashboard.com?token=abc123
        │
        ▼
2. Middleware intercepta request
        │
        ├── Valida token no banco (lib/auth.ts)
        │   └── SELECT * FROM clients WHERE access_token = 'abc123'
        │
        ├── Token válido? ✅
        │   ├── Salva em cookie (30 dias)
        │   ├── Adiciona client_id ao header
        │   └── Permite acesso
        │
        └── Token inválido? ❌
            └── Retorna 401 Unauthorized
```

## 📊 Queries Principais do Dashboard

### 1. getDashboardMetrics()
```sql
SELECT 
  SUM(spend) as totalSpend,
  SUM(leads) as totalLeads,
  AVG(ctr) as avgCTR,
  ...
FROM ad_insights
WHERE meta_ad_account_id IN (contas do cliente)
  AND date_start >= '2026-02-01'
  AND date_stop <= '2026-02-21'
```

### 2. getTopAds()
```sql
SELECT 
  a.name,
  SUM(ai.spend) as spend,
  SUM(ai.leads) as leads,
  SUM(ai.spend) / SUM(ai.leads) as cpl
FROM ads a
JOIN ad_insights ai ON ai.ad_id = a.id
GROUP BY a.id
ORDER BY cpl ASC
LIMIT 10
```

### 3. getChartData()
```sql
SELECT 
  date_start as date,
  SUM(spend) as spend,
  SUM(leads) as leads
FROM ad_insights
GROUP BY date_start
ORDER BY date_start ASC
```

## 🚀 Checklist de Deploy

- [ ] Variáveis de ambiente configuradas no Vercel
- [ ] Banco de dados com tabelas criadas
- [ ] Cliente de teste criado no banco
- [ ] Token da Meta API válido
- [ ] Primeira sincronização executada com sucesso
- [ ] Dashboard acessível via URL
- [ ] Gráficos renderizando corretamente
- [ ] Tabela de top ads mostrando dados

---

**Use este guia para entender como tudo se conecta! 🎯**
