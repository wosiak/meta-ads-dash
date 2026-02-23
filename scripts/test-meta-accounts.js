/**
 * Testa o endpoint /me/adaccounts da Meta API com o token atual.
 * Execute: node scripts/test-meta-accounts.js
 */
require('dotenv').config({ path: '.env.local' })

const TOKEN = process.env.META_APP_ACCESS_TOKEN
const BASE  = 'https://graph.facebook.com/v24.0'

async function main() {
  console.log('Token (primeiros 30 chars):', TOKEN?.substring(0, 30) + '...')
  console.log('')

  // 1. /me — verifica o que o token representa
  console.log('=== GET /me ===')
  const meRes  = await fetch(`${BASE}/me?fields=id,name&access_token=${TOKEN}`)
  const meData = await meRes.json()
  console.log(JSON.stringify(meData, null, 2))

  // 2. /me/adaccounts
  console.log('\n=== GET /me/adaccounts ===')
  const accRes  = await fetch(`${BASE}/me/adaccounts?fields=id,name,account_status,currency&limit=50&access_token=${TOKEN}`)
  const accData = await accRes.json()
  console.log(JSON.stringify(accData, null, 2))
}

main().catch(console.error)
