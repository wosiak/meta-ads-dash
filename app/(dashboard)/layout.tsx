import { headers, cookies } from 'next/headers'
import { AppLayout } from '@/components/layout/AppLayout'
import { getAdAccounts, syncAdAccountsForClient } from '@/lib/dashboard'
import { SELECTED_ACCOUNT_COOKIE } from '@/lib/constants'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const headersList  = await headers()
  const cookieStore  = await cookies()
  const clientId     = headersList.get('x-client-id') || undefined

  let accounts = clientId ? await getAdAccounts(clientId) : []

  // Auto-sync: se não houver nenhuma conta registrada, busca automaticamente na Meta API.
  // Isso garante que novos clientes vejam as contas sem nenhuma configuração manual.
  if (accounts.length === 0 && clientId) {
    try {
      accounts = await syncAdAccountsForClient(clientId)
    } catch (err) {
      console.error('Auto-sync de contas falhou:', err)
    }
  }

  // Usa o cookie se existir e for válido; caso contrário, seleciona a primeira conta
  const cookieAccountId    = cookieStore.get(SELECTED_ACCOUNT_COOKIE)?.value
  const selectedAccountId  = accounts.find(a => a.id === cookieAccountId)?.id ?? accounts[0]?.id

  return (
    <AppLayout accounts={accounts} selectedAccountId={selectedAccountId}>
      {children}
    </AppLayout>
  )
}
