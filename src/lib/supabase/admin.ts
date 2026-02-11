import { createClient } from '@supabase/supabase-js'

/**
 * Cliente Supabase con service_role key. Solo usar en el servidor (API routes, server actions).
 * Bypasea RLS. No exponer nunca esta key al cliente.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceRoleKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
  }
  return createClient(url, serviceRoleKey)
}
