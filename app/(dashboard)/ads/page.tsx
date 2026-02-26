import { headers, cookies } from 'next/headers'
import { getAdAccounts } from '@/lib/dashboard'
import { SELECTED_ACCOUNT_COOKIE } from '@/lib/constants'
import { AdsClient } from './AdsClient'

export default async function AdsPage() {
  const [headersList, cookieStore] = await Promise.all([headers(), cookies()])
  const clientId = headersList.get('x-client-id') || ''

  const accounts        = clientId ? await getAdAccounts(clientId) : []
  const cookieAccountId = cookieStore.get(SELECTED_ACCOUNT_COOKIE)?.value
  const accountId       = accounts.find(a => a.id === cookieAccountId)?.id ?? accounts[0]?.id ?? ''

  return <AdsClient accountId={accountId} />
}
