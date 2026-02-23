'use server'

import { cookies } from 'next/headers'
import { validateClientToken } from '@/lib/auth'
import { syncAdAccountsForClient } from '@/lib/dashboard'
import type { MetaAdAccount } from '@/types/database'

/**
 * Server Action: busca todas as contas da Meta API e sincroniza no Supabase.
 *
 * Autentica exclusivamente via cookie (client_token), pois esta action é
 * chamada do TopBar (Client Component) — headers de middleware não ficam
 * disponíveis nesse contexto.
 */
export async function syncAdAccounts(): Promise<
  { accounts: MetaAdAccount[]; count: number; error?: never } |
  { accounts?: never; count?: never; error: string }
> {
  try {
    const cookieStore = await cookies()
    const token       = cookieStore.get('client_token')?.value

    if (!token) return { error: 'Sessão não encontrada. Faça login novamente.' }

    const client = await validateClientToken(token)
    if (!client) return { error: 'Token de acesso inválido ou expirado.' }

    const accounts = await syncAdAccountsForClient(client.id)
    return { accounts, count: accounts.length }
  } catch (err) {
    console.error('syncAdAccounts error:', err)
    return { error: err instanceof Error ? err.message : 'Erro ao sincronizar contas' }
  }
}
