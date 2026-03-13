import { cookies } from 'next/headers'
import { getAllAdAccounts } from '@/lib/dashboard'
import { SELECTED_ACCOUNT_COOKIE } from '@/lib/constants'
import { AdsClient } from './AdsClient'

export default async function AdsPage() {
  const cookieStore     = await cookies()
  const accounts        = await getAllAdAccounts()
  const cookieAccountId = cookieStore.get(SELECTED_ACCOUNT_COOKIE)?.value
  const accountId       = accounts.find(a => a.id === cookieAccountId)?.id ?? accounts[0]?.id ?? ''

  return <AdsClient accountId={accountId} />
}
