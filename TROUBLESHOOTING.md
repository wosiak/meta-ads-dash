# 🔧 Guia de Troubleshooting - Meta Ads Dashboard

## ❌ Problemas Comuns e Soluções

### 1. Erro: "Module not found" ou "Cannot find module"

**Problema:** Dependências não instaladas corretamente.

**Solução:**
```bash
# Deletar node_modules e reinstalar
rm -rf node_modules
rm package-lock.json
npm install
```

---

### 2. Erro: "Supabase connection failed" ou "fetch failed"

**Problema:** Variáveis de ambiente do Supabase incorretas ou não configuradas.

**Solução:**
1. Verifique se o arquivo `.env.local` existe na raiz
2. Verifique se as keys estão corretas:
   - Acesse: https://supabase.com/dashboard/project/SEU_PROJETO/settings/api
   - Copie `Project URL` e `anon public key`
3. Reinicie o servidor:
   ```bash
   # Ctrl+C para parar
   npm run dev
   ```

---

### 3. Erro: "Token inválido" ao acessar dashboard

**Problema:** Cliente não existe no banco ou token está incorreto.

**Solução:**
```sql
-- Verificar se cliente existe
SELECT * FROM clients WHERE access_token = 'abc123';

-- Se não existir, criar:
INSERT INTO clients (name, slug, access_token, status)
VALUES ('Cliente Teste', 'teste', 'abc123', 'active');
```

---

### 4. Dashboard carrega mas não mostra dados (cards em zero)

**Problema:** Não há insights sincronizados no banco.

**Solução:**
1. Verifique se há contas associadas ao cliente:
   ```sql
   SELECT * FROM meta_ad_accounts WHERE client_id = 'ID-DO-CLIENTE';
   ```

2. Se não houver, crie uma:
   ```sql
   INSERT INTO meta_ad_accounts (client_id, meta_account_id, account_name, currency)
   VALUES ('ID-DO-CLIENTE', 'act_123456789', 'Conta Teste', 'BRL');
   ```

3. Execute sincronização (veja seção abaixo)

---

### 5. Erro ao sincronizar: "Meta API Error"

**Possíveis causas:**

#### A) Token da Meta API expirado ou inválido
```bash
# Teste o token diretamente:
curl "https://graph.facebook.com/v24.0/me?access_token=SEU_TOKEN"

# Se retornar erro, o token está inválido
# Solução: Gerar novo token no Meta Business
```

#### B) meta_account_id incorreto
```bash
# Listar contas disponíveis:
curl "https://graph.facebook.com/v24.0/me/adaccounts?fields=id,name&access_token=SEU_TOKEN"

# Use o ID retornado (formato: act_123456789)
```

#### C) Sem permissão para acessar a conta
- Verifique se o token tem acesso à conta de anúncios
- No Meta Business, vá em Configurações → Usuários → Verifique permissões

---

### 6. Erro: "Cannot read properties of undefined"

**Problema:** Dados estão null ou undefined.

**Locais comuns:**
- `ad_insights` vazio (sem dados sincronizados)
- `actions` ou `cost_per_action_type` null da Meta API

**Solução:**
- Os componentes já têm tratamento para dados vazios
- Verifique se a sincronização rodou com sucesso:
  ```sql
  SELECT * FROM sync_logs ORDER BY started_at DESC LIMIT 5;
  ```

---

### 7. Gráfico não renderiza ou fica em branco

**Problema:** Dados do gráfico em formato incorreto ou vazios.

**Solução:**
1. Verifique se há dados no período:
   ```sql
   SELECT COUNT(*) FROM ad_insights 
   WHERE date_start >= '2026-02-01' 
   AND date_stop <= '2026-02-21';
   ```

2. Se retornar 0, execute sincronização

3. Se retornar > 0 mas gráfico não aparece:
   - Abra console do navegador (F12)
   - Veja se há erros do Recharts
   - Verifique se as datas estão no formato correto

---

### 8. Erro: "Headers already sent" no middleware

**Problema:** Middleware tentando enviar resposta múltiplas vezes.

**Solução:**
- Já tratado no código atual
- Se persistir, limpe cookies:
  ```javascript
  // No navegador, abra console (F12):
  document.cookie.split(";").forEach(c => {
    document.cookie = c.trim().split("=")[0] + '=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/';
  });
  ```

---

### 9. Imagens de anúncios não aparecem

**Problema:** Meta API não retorna URL de imagens ou permissão insuficiente.

**Soluções:**

#### A) Adicionar campo `creative` na requisição da API
Edite `lib/meta-api.ts` e adicione campos de criativo:
```typescript
const fields = encodeURIComponent(
  `ads.limit(1000){` +
    `name,effective_status,` +
    `creative{image_url,thumbnail_url,video_id},` + // ← ADICIONE
    // ... resto dos campos
)
```

#### B) Usar OAuth para mais permissões
- Token de App tem limitações
- Para imagens, pode precisar de OAuth do usuário

---

### 10. Erro no deploy no Vercel

**Problemas comuns:**

#### A) Variáveis de ambiente não configuradas
- Vá em: Vercel Dashboard → Seu Projeto → Settings → Environment Variables
- Adicione TODAS as variáveis do `.env.local`

#### B) Build falha
```bash
# Testar build localmente:
npm run build

# Se falhar, veja o erro e corrija
```

#### C) Timeout nas API routes
- Meta API pode demorar
- Configure timeout maior no Vercel (plano Pro)

---

## 🧪 Como Testar Componentes Isoladamente

### Testar cliente Supabase:
```typescript
// Crie um arquivo: test-supabase.ts
import { supabase } from './lib/supabase'

async function test() {
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .limit(1)
  
  console.log('Data:', data)
  console.log('Error:', error)
}

test()
```

Execute: `npx tsx test-supabase.ts`

### Testar Meta API:
```typescript
// Crie um arquivo: test-meta-api.ts
import { fetchAdAccounts } from './lib/meta-api'

async function test() {
  try {
    const accounts = await fetchAdAccounts()
    console.log('Accounts:', accounts)
  } catch (error) {
    console.error('Error:', error)
  }
}

test()
```

Execute: `npx tsx test-meta-api.ts`

---

## 🔍 Logs Úteis para Debug

### Ver últimas sincronizações:
```sql
SELECT 
  sl.*,
  ma.account_name,
  c.name as client_name
FROM sync_logs sl
JOIN meta_ad_accounts ma ON ma.id = sl.meta_ad_account_id
JOIN clients c ON c.id = ma.client_id
ORDER BY sl.started_at DESC
LIMIT 10;
```

### Ver anúncios com mais impressions:
```sql
SELECT 
  a.name,
  SUM(ai.impressions) as total_impressions,
  SUM(ai.spend) as total_spend
FROM ads a
JOIN ad_insights ai ON ai.ad_id = a.id
GROUP BY a.id, a.name
ORDER BY total_impressions DESC
LIMIT 10;
```

### Ver contas sem dados:
```sql
SELECT 
  ma.account_name,
  c.name as client_name,
  ma.last_sync_at,
  COUNT(ai.id) as insights_count
FROM meta_ad_accounts ma
JOIN clients c ON c.id = ma.client_id
LEFT JOIN ad_insights ai ON ai.meta_ad_account_id = ma.id
GROUP BY ma.id, ma.account_name, c.name, ma.last_sync_at
HAVING COUNT(ai.id) = 0;
```

---

## 🚨 Checklist de Depuração

Quando algo não funcionar, siga esta ordem:

1. [ ] `.env.local` existe e está correto?
2. [ ] `npm install` foi executado?
3. [ ] Servidor reiniciado após mudar `.env`?
4. [ ] Cliente existe no banco com token correto?
5. [ ] Conta Meta associada ao cliente?
6. [ ] Token Meta API válido? (testar no curl)
7. [ ] Sincronização executada com sucesso?
8. [ ] Logs de erro no console do navegador (F12)?
9. [ ] Logs de erro no terminal do servidor?
10. [ ] Tabela `ad_insights` tem dados?

---

## 📞 Onde Pedir Ajuda

Se nada disso resolver:

1. **Copie o erro completo** do console
2. **Verifique qual arquivo** está causando o erro
3. **Teste a query SQL** diretamente no Supabase
4. **Veja o log do sync** na tabela `sync_logs`

---

**Lembre-se: 90% dos problemas são variáveis de ambiente ou dados não sincronizados! 🎯**
