export const SELECTED_ACCOUNT_COOKIE = 'selected_account_id'

/**
 * Contas de anúncio que NÃO devem aparecer no sistema.
 * Não são salvas no banco nem exibidas no seletor.
 */
export const EXCLUDED_META_ACCOUNT_IDS = new Set([
  'act_390410388206444',   // Gabriel Afinovicz (pessoal)
  'act_1005202918087273',  // DeskVibe
  'act_727714406369226',   // DeskVibe
  'act_3733791643562620',  // Wosnicz
])
