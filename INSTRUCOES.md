# 🎯 INSTRUÇÕES PARA VOCÊ - PRÓXIMOS PASSOS

## ✅ O QUE JÁ FOI FEITO

1. ✅ Projeto Next.js criado com TypeScript e Tailwind
2. ✅ Todas as dependências instaladas
3. ✅ Estrutura de tipos TypeScript criada
4. ✅ Cliente Supabase configurado
5. ✅ Cliente Meta API implementado
6. ✅ Middleware de autenticação por token
7. ✅ Componentes do dashboard (Cards, Gráfico, Tabela)
8. ✅ Página principal do dashboard
9. ✅ API de sincronização manual
10. ✅ Date range picker

## 🔧 O QUE VOCÊ PRECISA FAZER AGORA

### 1. Configurar Variáveis de Ambiente

Crie o arquivo `.env.local` na raiz do projeto com o seguinte conteúdo:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-anon-key-aqui
SUPABASE_SERVICE_ROLE_KEY=sua-service-role-key-aqui

# Meta API Configuration
META_APP_ACCESS_TOKEN=EAA8wZA3tSZCuABQzeiINKCfQ2ZB05v88FDS9FyphTlFwYEdBC11lcNMVxcI0LD1qxx6lcomFpgRymQJi1QazjIlZCnE7x3bNu4KIDhsrOrB2BPDSXYOPn9xXuZAn8sgZAfXwZBlSugBgccZCHDyB3yHcJmhqXEvZBHyZA2WiGXPZAUMpHGPCkq0ZCnc5RJlG5YOmvN7M
```

**Onde encontrar as keys do Supabase:**
1. Acesse: https://supabase.com/dashboard/project/SEU_PROJETO/settings/api
2. Copie:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` → `SUPABASE_SERVICE_ROLE_KEY` (cuidado, é secreta!)

### 2. Criar Cliente de Teste no Supabase

Acesse o SQL Editor do Supabase e execute:

```sql
-- 1. Criar um cliente de teste
INSERT INTO clients (name, slug, access_token, status)
VALUES ('Jean - Cliente Teste', 'jean', 'abc123', 'active')
RETURNING id;

-- 2. COPIE O ID GERADO ACIMA e use no próximo comando
-- Substitua 'ID-COPIADO-AQUI' pelo UUID gerado

-- 3. Criar conta de anúncios (use o meta_account_id real do Jean)
INSERT INTO meta_ad_accounts (
  client_id, 
  meta_account_id, 
  account_name, 
  currency
)
VALUES (
  'ID-COPIADO-AQUI',
  'act_123456789',  -- SUBSTITUA pelo ID real da conta Meta do Jean
  'Conta Jean',
  'BRL'
);
```

### 3. Testar o Projeto Localmente

```bash
# No terminal, dentro da pasta do projeto
npm run dev
```

Depois acesse no navegador:
```
http://localhost:3000?token=abc123
```

Você deve ver o dashboard (ainda sem dados).

### 4. Sincronizar Dados do Meta

Você tem 2 opções:

#### Opção A - Via API (Recomendado para teste)

Crie um arquivo `test-sync.js` na raiz do projeto:

```javascript
// test-sync.js
const accountId = 'UUID-DA-CONTA-QUE-VOCE-CRIOU-NO-PASSO-2'

fetch('http://localhost:3000/api/sync', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    accountId: accountId,
    dateStart: '2026-02-01',
    dateStop: '2026-02-21',
  }),
})
  .then(res => res.json())
  .then(data => console.log('Sync result:', data))
  .catch(err => console.error('Sync error:', err))
```

Execute:
```bash
node test-sync.js
```

#### Opção B - Via Postman/Thunder Client

POST para: `http://localhost:3000/api/sync`

Body (JSON):
```json
{
  "accountId": "UUID-DA-CONTA",
  "dateStart": "2026-02-01",
  "dateStop": "2026-02-21"
}
```

### 5. Verificar se Dados Foram Sincronizados

No Supabase SQL Editor:

```sql
-- Ver quantos anúncios foram sincronizados
SELECT COUNT(*) FROM ads;

-- Ver insights
SELECT COUNT(*) FROM ad_insights;

-- Ver top 5 anúncios com mais leads
SELECT 
  a.name,
  SUM(ai.leads) as total_leads,
  SUM(ai.spend) as total_spend
FROM ads a
JOIN ad_insights ai ON ai.ad_id = a.id
GROUP BY a.id, a.name
ORDER BY total_leads DESC
LIMIT 5;
```

### 6. Atualizar o Dashboard

Depois de sincronizar, atualize a página:
```
http://localhost:3000?token=abc123
```

Agora você deve ver:
- ✅ Cards com métricas
- ✅ Gráfico de investimento
- ✅ Tabela de top anúncios

## 🚀 FAZER COMMIT E PUSH PARA GITHUB

```bash
# 1. Verificar status
git status

# 2. Adicionar todos os arquivos
git add .

# 3. Fazer commit
git commit -m "🚀 Initial commit: Dashboard funcional com Next.js + Supabase"

# 4. Push para o GitHub
git push -u origin main
```

## ☁️ DEPLOY NO VERCEL (OPCIONAL)

### Via Interface Web:
1. Acesse: https://vercel.com
2. Clique em "Add New Project"
3. Conecte seu GitHub
4. Selecione o repositório `meta-ads-dash`
5. Configure as variáveis de ambiente (TODAS do .env.local)
6. Clique em "Deploy"

### Via CLI:
```bash
# Instalar Vercel CLI
npm i -g vercel

# Fazer deploy
vercel

# Seguir as instruções na tela
```

## 🐛 POSSÍVEIS PROBLEMAS

### Erro: "Cannot find module X"
```bash
npm install
```

### Erro: "Supabase connection failed"
- Verifique se as keys do .env.local estão corretas
- Verifique se copiou as keys certas (URL, anon key, service role)

### Erro: "Token inválido"
- Verifique se criou o cliente no banco com token 'abc123'
- Verifique se o status do cliente é 'active'

### Dashboard vazio (sem dados)
- Execute a sincronização via API
- Verifique se o meta_account_id está correto
- Verifique se o META_APP_ACCESS_TOKEN está válido

### Erro na sincronização
- Verifique se o token da Meta API está válido
- Verifique se o meta_account_id existe e você tem acesso

## 📞 PRÓXIMOS PASSOS PARA PRODUÇÃO

1. [ ] Testar com conta real do Jean
2. [ ] Criar tokens únicos para cada cliente
3. [ ] Configurar sincronização automática (Cron)
4. [ ] Criar área administrativa
5. [ ] Deploy em produção
6. [ ] Configurar domínio customizado

## 💡 DICAS

- Mantenha o `.env.local` seguro e NUNCA faça commit dele
- Use tokens diferentes para cada cliente
- Teste sempre em desenvolvimento antes de ir para produção
- O token da Meta API expira, você precisará renovar

---

**Se tiver qualquer problema, me chame! Estou aqui para ajudar! 🚀**
