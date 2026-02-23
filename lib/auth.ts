import { supabaseAdmin } from './supabase'
import type { Client } from '@/types/database'

/**
 * Valida token de acesso do cliente
 */
export async function validateClientToken(token: string): Promise<Client | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from('clients')
      .select('*')
      .eq('access_token', token)
      .eq('status', 'active')
      .single()

    if (error || !data) {
      return null
    }

    return data as Client
  } catch (error) {
    console.error('Error validating token:', error)
    return null
  }
}

/**
 * Busca cliente por ID
 */
export async function getClientById(clientId: string): Promise<Client | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from('clients')
      .select('*')
      .eq('id', clientId)
      .single()

    if (error || !data) {
      return null
    }

    return data as Client
  } catch (error) {
    console.error('Error getting client:', error)
    return null
  }
}

/**
 * Valida se é admin (para área administrativa)
 */
export async function validateAdminSession(sessionId: string): Promise<boolean> {
  // TODO: Implementar validação de sessão admin
  // Por enquanto, retorna false
  return false
}
