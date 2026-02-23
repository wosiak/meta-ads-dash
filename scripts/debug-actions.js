/**
 * Diagnóstico: mostra todos os action_types brutos da API para a conta e campanhas.
 * Execute: node scripts/debug-actions.js
 */
const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const client = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function main() {
  // 1. Pegar raw_actions da conta
  console.log('=== ACCOUNT LEVEL raw_actions ===')
  const { data: acc } = await client
    .from('account_metrics_cache')
    .select('date_from, date_to, raw_actions, leads, messages, purchases, cost_per_result')
    .order('synced_at', { ascending: false })
    .limit(1)
    .single()

  if (acc?.raw_actions) {
    console.log('\nTodos os action_types retornados pela API (conta):')
    acc.raw_actions.forEach(a => {
      console.log(`  [${a.action_type}] = ${a.value}`)
    })
    console.log('\nCampos salvos → leads:', acc.leads, '| messages:', acc.messages, '| cost_per_result:', acc.cost_per_result)
  }

  // 2. Pegar raw_actions das campanhas
  console.log('\n\n=== CAMPAIGN LEVEL raw_actions ===')
  const { data: camps } = await client
    .from('campaign_metrics_cache')
    .select('campaign_name, date_from, date_to, raw_actions, leads, messages, purchases, cost_per_result, spend')
    .order('spend', { ascending: false })

  if (camps && camps.length > 0) {
    for (const camp of camps) {
      console.log(`\n--- Campanha: ${camp.campaign_name} ---`)
      console.log(`Período: ${camp.date_from} -> ${camp.date_to}`)
      console.log(`Spend: R$ ${camp.spend} | leads: ${camp.leads} | messages: ${camp.messages} | CPR: R$ ${camp.cost_per_result}`)
      if (camp.raw_actions && camp.raw_actions.length > 0) {
        console.log('Action types:')
        camp.raw_actions.forEach(a => {
          console.log(`  [${a.action_type}] = ${a.value}`)
        })
      } else {
        console.log('  (sem raw_actions)')
      }
    }
  } else {
    console.log('Nenhum registro encontrado na campaign_metrics_cache ainda.')
  }
}

main()
