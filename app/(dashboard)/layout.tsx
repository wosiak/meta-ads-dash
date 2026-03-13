import { cookies } from 'next/headers'
import { AppLayout } from '@/components/layout/AppLayout'
import { getAllAdAccounts, syncAdAccountsForClient, ensureDefaultClient } from '@/lib/dashboard'
import { SELECTED_ACCOUNT_COOKIE } from '@/lib/constants'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const cookieStore = await cookies()

  // Carrega todas as contas de todos os clientes
  let accounts = await getAllAdAccounts()

  // Se não houver contas, faz auto-sync via Meta API
  if (accounts.length === 0) {
    try {
      const clientId = await ensureDefaultClient()
      accounts = await syncAdAccountsForClient(clientId)
    } catch (err) {
      console.error('Auto-sync falhou:', err)
    }
  }

  const cookieAccountId   = cookieStore.get(SELECTED_ACCOUNT_COOKIE)?.value
  const selectedAccountId = accounts.find(a => a.id === cookieAccountId)?.id ?? accounts[0]?.id

  return (
    <AppLayout accounts={accounts} selectedAccountId={selectedAccountId}>
      {children}
    </AppLayout>
  )
}
