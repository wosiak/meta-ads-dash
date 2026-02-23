const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const client = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function main() {
  const { data, error } = await client
    .from('account_metrics_cache')
    .select('*')
    .order('synced_at', { ascending: false })
    .limit(5)

  if (error) {
    console.error('Erro:', JSON.stringify(error, null, 2))
    return
  }

  if (!data || data.length === 0) {
    console.log('Cache vazio — nenhum registro encontrado ainda')
    return
  }

  data.forEach((row, i) => {
    console.log('\n--- Registro', i + 1, '---')
    console.log('Periodo:', row.date_from, '->', row.date_to)
    console.log('Spend: R$', row.spend)
    console.log('Impressoes:', row.impressions)
    console.log('Alcance:', row.reach)
    console.log('Frequencia:', row.frequency)
    console.log('Clicks:', row.clicks)
    console.log('CPM:', row.cpm)
    console.log('CTR:', row.ctr)
    console.log('Leads:', row.leads, '| Mensagens:', row.messages, '| Compras:', row.purchases)
    console.log('Custo/Resultado: R$', row.cost_per_result)
    console.log('Synced:', row.synced_at)
  })
}

main()
