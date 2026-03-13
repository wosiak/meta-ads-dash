'use server'

import { syncAdAccountsForClient, ensureDefaultClient } from '@/lib/dashboard'
import type { MetaAdAccount } from '@/types/database'

type SyncResult =
  | { accounts: MetaAdAccount[]; count: number; error?: never }
  | { accounts?: never; count?: never; error: string }

export async function syncAdAccounts(): Promise<SyncResult> {
  try {
    const clientId = await ensureDefaultClient()
    const accounts = await syncAdAccountsForClient(clientId)
    return { accounts, count: accounts.length }
  } catch (err) {
    console.error('syncAdAccounts error:', err)
    return { error: err instanceof Error ? err.message : 'Erro ao sincronizar contas' }
  }
}
