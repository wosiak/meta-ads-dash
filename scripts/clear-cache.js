/**
 * Limpa todas as entradas dos caches para forçar novo fetch da Meta API.
 * Execute: node scripts/clear-cache.js
 */
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const client = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function main() {
  const { error: e1, count: c1 } = await client
    .from('account_metrics_cache')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000')
    .select('id', { count: 'exact', head: true })

  const { error: e2, count: c2 } = await client
    .from('campaign_metrics_cache')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000')
    .select('id', { count: 'exact', head: true })

  const { error: e3 } = await client
    .from('ad_metrics_cache')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000')
    .select('id', { count: 'exact', head: true })

  if (e1 || e2 || e3) {
    console.error('Erros:', e1, e2, e3)
  } else {
    console.log('Cache limpo com sucesso!')
    console.log('account_metrics_cache: registros removidos')
    console.log('campaign_metrics_cache: registros removidos')
    console.log('ad_metrics_cache: registros removidos')
    console.log('\nRecarregue a página para buscar dados atualizados da Meta API.')
  }
}

main()
