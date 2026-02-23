'use server'

import { cookies } from 'next/headers'
import { SELECTED_ACCOUNT_COOKIE } from '@/lib/constants'

/**
 * Server Action: persiste a conta de anúncio selecionada em cookie.
 * Chamada pelo TopBar ao trocar de conta — o router.refresh() no cliente
 * faz o layout/page re-renderizar com a nova conta.
 */
export async function setSelectedAccount(accountId: string): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.set(SELECTED_ACCOUNT_COOKIE, accountId, {
    path:     '/',
    maxAge:   60 * 60 * 24 * 30, // 30 dias
    sameSite: 'lax',
    secure:   process.env.NODE_ENV === 'production',
  })
}
