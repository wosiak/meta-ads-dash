-- ============================================================
-- PASSO 0 — Constraint única em meta_ad_accounts (necessária para
-- o upsert de sincronização funcionar sem duplicatas)
-- Execute ANTES das tabelas de cache se ainda não existir.
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'uq_meta_ad_accounts_client_account'
  ) THEN
    ALTER TABLE meta_ad_accounts
      ADD CONSTRAINT uq_meta_ad_accounts_client_account
      UNIQUE (client_id, meta_account_id);
  END IF;
END $$;


-- ============================================================
-- Tabela de cache de métricas por conta + período
-- Execute este SQL no painel do Supabase (SQL Editor)
-- ============================================================

CREATE TABLE IF NOT EXISTS account_metrics_cache (
  id                  UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  meta_ad_account_id  UUID        NOT NULL REFERENCES meta_ad_accounts(id) ON DELETE CASCADE,
  date_from           DATE        NOT NULL,
  date_to             DATE        NOT NULL,

  -- Métricas agregadas do nível de conta (todas as campanhas somadas)
  spend               DECIMAL(14, 2)  DEFAULT 0,
  impressions         BIGINT          DEFAULT 0,
  reach               BIGINT          DEFAULT 0,
  frequency           DECIMAL(10, 4)  DEFAULT 0,
  clicks              BIGINT          DEFAULT 0,
  cpm                 DECIMAL(12, 4)  DEFAULT 0,
  ctr                 DECIMAL(10, 6)  DEFAULT 0,

  -- Resultados por tipo (mantidos separados para o seletor "Resultado principal")
  leads               INTEGER         DEFAULT 0,
  messages            INTEGER         DEFAULT 0,
  purchases           INTEGER         DEFAULT 0,
  cost_per_result     DECIMAL(12, 4)  DEFAULT 0,

  -- Dados brutos para auditoria / futuros cruzamentos
  raw_actions         JSONB,

  -- Controle de validade do cache (invalidado no dia seguinte)
  synced_at           TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

  -- Chave única: uma linha por (conta, período)
  CONSTRAINT uq_cache_account_period UNIQUE (meta_ad_account_id, date_from, date_to)
);

-- Índice de busca rápida
CREATE INDEX IF NOT EXISTS idx_cache_account_dates
  ON account_metrics_cache (meta_ad_account_id, date_from, date_to);

-- Índice para limpeza de registros antigos (tarefa futura de manutenção)
CREATE INDEX IF NOT EXISTS idx_cache_synced_at
  ON account_metrics_cache (synced_at);


-- ============================================================
-- Tabela de cache de métricas POR CAMPANHA
-- Execute junto com a tabela acima
-- ============================================================

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


-- ============================================================
-- Tabela de cache de tendência diária por campanha
-- ============================================================

CREATE TABLE IF NOT EXISTS campaign_trend_cache (
  id                  UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  meta_ad_account_id  UUID        NOT NULL REFERENCES meta_ad_accounts(id) ON DELETE CASCADE,
  -- NULL = todas as campanhas da conta (opção "Geral")
  meta_campaign_id    VARCHAR(50),
  date_from           DATE        NOT NULL,
  date_to             DATE        NOT NULL,
  -- Array JSON: [{date, spend, results, cpl}, ...]
  trend_data          JSONB       NOT NULL DEFAULT '[]',
  synced_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_trend_cache UNIQUE (meta_ad_account_id, meta_campaign_id, date_from, date_to)
);

CREATE INDEX IF NOT EXISTS idx_trend_cache_lookup
  ON campaign_trend_cache (meta_ad_account_id, meta_campaign_id, date_from, date_to);


-- ============================================================
-- Tabela de cache de métricas POR ANÚNCIO (Diagnóstico)
-- ============================================================

CREATE TABLE IF NOT EXISTS ad_metrics_cache (
  id                  UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  meta_ad_account_id  UUID        NOT NULL REFERENCES meta_ad_accounts(id) ON DELETE CASCADE,
  meta_ad_id          VARCHAR(50) NOT NULL,
  ad_name             TEXT        NOT NULL,
  ad_status           TEXT,
  date_from           DATE        NOT NULL,
  date_to             DATE        NOT NULL,

  spend               DECIMAL(14, 2)  DEFAULT 0,
  results             INTEGER         DEFAULT 0,
  cost_per_result     DECIMAL(12, 4)  DEFAULT 0,

  synced_at           TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_ad_cache_period UNIQUE (meta_ad_account_id, meta_ad_id, date_from, date_to)
);

CREATE INDEX IF NOT EXISTS idx_ad_cache_account_dates
  ON ad_metrics_cache (meta_ad_account_id, date_from, date_to);

CREATE INDEX IF NOT EXISTS idx_ad_cache_synced_at
  ON ad_metrics_cache (synced_at);


-- ============================================================
-- Tabela de configuração de orçamento manual (Pacing)
-- ============================================================

CREATE TABLE IF NOT EXISTS budget_config (
  id                  UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  meta_ad_account_id  UUID        NOT NULL REFERENCES meta_ad_accounts(id) ON DELETE CASCADE,
  frequency           TEXT        NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly')),
  amount              DECIMAL(14, 2) NOT NULL,
  date_from           DATE        NOT NULL,
  date_to             DATE        NOT NULL,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_budget_config_period UNIQUE (meta_ad_account_id, date_from, date_to)
);

CREATE INDEX IF NOT EXISTS idx_budget_config_account
  ON budget_config (meta_ad_account_id);
