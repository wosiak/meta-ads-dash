/**
 * Cria a tabela campaign_metrics_cache no Supabase via API de administração.
 * Execute: node scripts/create-campaign-cache.js
 */
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const client = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

const sql = `
CREATE TABLE IF NOT EXISTS campaign_metrics_cache (
  id                  UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  meta_ad_account_id  UUID        NOT NULL REFERENCES meta_ad_accounts(id) ON DELETE CASCADE,
  meta_campaign_id    VARCHAR(50) NOT NULL,
  campaign_name       TEXT        NOT NULL,
  campaign_status     TEXT,
  date_from           DATE        NOT NULL,
  date_to             DATE        NOT NULL,
  spend               DECIMAL(14, 2)  DEFAULT 0,
  impressions         BIGINT          DEFAULT 0,
  reach               BIGINT          DEFAULT 0,
  frequency           DECIMAL(10, 4)  DEFAULT 0,
  clicks              BIGINT          DEFAULT 0,
  cpm                 DECIMAL(12, 4)  DEFAULT 0,
  ctr                 DECIMAL(10, 6)  DEFAULT 0,
  leads               INTEGER         DEFAULT 0,
  messages            INTEGER         DEFAULT 0,
  purchases           INTEGER         DEFAULT 0,
  cost_per_result     DECIMAL(12, 4)  DEFAULT 0,
  raw_actions         JSONB,
  synced_at           TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_campaign_cache_period UNIQUE (meta_ad_account_id, meta_campaign_id, date_from, date_to)
);

CREATE INDEX IF NOT EXISTS idx_campaign_cache_account_dates
  ON campaign_metrics_cache (meta_ad_account_id, date_from, date_to);

CREATE INDEX IF NOT EXISTS idx_campaign_cache_synced_at
  ON campaign_metrics_cache (synced_at);
`

async function main() {
  console.log('Criando tabela campaign_metrics_cache...')
  const { error } = await client.rpc('exec_sql', { query: sql }).catch(() => ({ error: 'rpc não disponível' }))

  if (error) {
    console.log('\nNão foi possível criar via RPC (esperado).')
    console.log('Execute o seguinte SQL manualmente no Supabase SQL Editor:\n')
    console.log(sql)
  } else {
    console.log('Tabela criada com sucesso!')
  }
}

main()
