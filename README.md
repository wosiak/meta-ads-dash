# 🚀 Meta Ads Dashboard

Dashboard de análise de Meta Ads para gestores de tráfego. Sistema Multi-Tenant construído com Next.js, TypeScript, Tailwind CSS e Supabase.

## 📋 Funcionalidades

- ✅ Dashboard com métricas principais (Investimento, Leads, CPL, CTR, Alcance, Frequência)
- ✅ Gráficos de período customizáveis
- ✅ Tabela de Top Anúncios (Campeões) por CPL
- ✅ Autenticação por token na URL
- ✅ Sistema Multi-Tenant (Admin vê tudo, Cliente vê apenas seus dados)
- ✅ Integração com Meta Graph API
- ✅ Sincronização manual de dados

## 🛠️ Stack Tecnológica

- **Frontend:** Next.js 15 (App Router), React 19, TypeScript
- **Styling:** Tailwind CSS, shadcn/ui
- **Charts:** Recharts
- **Database:** Supabase (PostgreSQL)
- **API:** Meta Graph API v24.0
- **Hosting:** Vercel (recomendado)

## 📦 Instalação

### 1. Clone o repositório

\`\`\`bash
git clone https://github.com/wosiak/meta-ads-dash.git
cd meta-ads-dash
\`\`\`

### 2. Instale as dependências

\`\`\`bash
npm install
\`\`\`

### 3. Configure as variáveis de ambiente

Crie um arquivo \`.env.local\` na raiz do projeto (use o \`env.example.txt\` como modelo):

\`\`\`bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=sua-url-supabase-aqui
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-anon-key-aqui
SUPABASE_SERVICE_ROLE_KEY=sua-service-role-key-aqui

# Meta API Configuration
META_APP_ACCESS_TOKEN=seu-token-meta-aqui
\`\`\`

**Onde encontrar as keys do Supabase:**
1. Acesse: https://supabase.com/dashboard
2. Selecione seu projeto
3. Vá em: Settings → API
4. Copie `URL` e as keys

### 4. Configure o banco de dados

As tabelas já devem estar criadas no Supabase. Se precisar recriar, execute o SQL disponível na documentação.

### 5. Crie um cliente de teste

Execute no SQL Editor do Supabase:

\`\`\`sql
-- Criar um cliente de teste
INSERT INTO clients (name, slug, access_token, status)
VALUES ('Cliente Teste', 'teste', 'abc123', 'active');

-- Copie o ID gerado e crie uma conta de anúncios
INSERT INTO meta_ad_accounts (client_id, meta_account_id, account_name, currency)
VALUES (
  'ID-DO-CLIENTE-COPIADO-ACIMA',
  'act_123456789',
  'Conta Teste',
  'BRL'
);
\`\`\`

### 6. Rode o projeto

\`\`\`bash
npm run dev
\`\`\`

Acesse: http://localhost:3000?token=abc123

## 🔐 Sistema de Autenticação

### Para Clientes

Os clientes acessam via token na URL:

\`\`\`
http://localhost:3000?token=abc123
\`\`\`

O token é validado no middleware e salvo em cookie por 30 dias.

### Para Admin (em desenvolvimento)

Acesso em: http://localhost:3000/admin

## 📊 Sincronização de Dados

### Manual via API

\`\`\`bash
curl -X POST http://localhost:3000/api/sync \\
  -H "Content-Type: application/json" \\
  -d '{
    "accountId": "UUID-DA-CONTA",
    "dateStart": "2026-02-01",
    "dateStop": "2026-02-21"
  }'
\`\`\`

### Automática (Em desenvolvimento)

Planejado usar Cron Jobs ou Inngest para sincronização automática a cada hora.

## 📁 Estrutura do Projeto

\`\`\`
meta-ads-dash/
├── app/
│   ├── api/
│   │   └── sync/          # API de sincronização
│   ├── login/             # Página de login
│   ├── page.tsx           # Dashboard principal
│   └── layout.tsx         # Layout global
├── components/
│   ├── ui/                # Componentes shadcn/ui
│   └── dashboard/         # Componentes do dashboard
│       ├── MetricsCards.tsx
│       ├── SpendChart.tsx
│       ├── TopAdsTable.tsx
│       └── DateRangePicker.tsx
├── lib/
│   ├── supabase.ts        # Cliente Supabase
│   ├── auth.ts            # Funções de autenticação
│   ├── meta-api.ts        # Cliente Meta API
│   ├── dashboard.ts       # Funções de dados do dashboard
│   └── utils.ts           # Utilitários
├── types/
│   └── database.ts        # Tipos TypeScript
└── middleware.ts          # Middleware de autenticação
\`\`\`

## 🚀 Deploy

### Vercel (Recomendado)

1. Crie uma conta no Vercel
2. Conecte seu repositório GitHub
3. Configure as variáveis de ambiente
4. Deploy automático! 🎉

\`\`\`bash
# Ou via CLI
npm i -g vercel
vercel
\`\`\`

## 📝 Próximas Funcionalidades

- [ ] Área administrativa completa
- [ ] Sincronização automática (Cron Jobs)
- [ ] Comparação de períodos
- [ ] Exportação de dados (CSV/Excel)
- [ ] Alertas de performance
- [ ] Relatórios em PDF
- [ ] Detalhes de campanhas individuais
- [ ] Multi-idioma

## 🤝 Contribuindo

Desenvolvido por Eduardo Wosiak e Gabriel Afinovicz.

## 📄 Licença

Propriedade privada. Todos os direitos reservados.

## 🐛 Problemas Conhecidos

- [ ] Imagens de criativos podem não carregar (depende de permissões da Meta API)
- [ ] Middleware pode ter conflitos em produção (testar RLS policies do Supabase)

## 📧 Suporte

Para dúvidas ou suporte, entre em contato com a equipe de desenvolvimento.

---

**Feito com ❤️ usando Next.js + Supabase**
