import 'server-only';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL } from './config';

/**
 * Cliente com a chave SERVICE ROLE: ignora RLS. Só existe no servidor (import 'server-only').
 * Use SOMENTE depois de verificar o usuário, e apenas para o que RLS não permite
 * (criar/cancelar pedidos pelas funções seguras).
 */
export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY não configurada');
  return createClient(SUPABASE_URL, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
