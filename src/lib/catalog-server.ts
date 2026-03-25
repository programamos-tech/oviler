import type { SupabaseClient } from '@supabase/supabase-js'

export function normalizeCatalogSlug(raw: string): string {
  return raw.trim().toLowerCase()
}

export type CatalogBranchRow = {
  id: string
  organization_id: string
  name: string
  logo_url: string | null
  catalog_slug: string | null
  catalog_enabled: boolean
  catalog_delivery_fee_cop: number
  payment_nequi: string | null
  payment_bancolombia: string | null
  payment_llave: string | null
}

export async function getBranchByCatalogSlug(
  admin: SupabaseClient,
  slug: string
): Promise<CatalogBranchRow | null> {
  const n = normalizeCatalogSlug(slug)
  if (!n) return null
  const { data, error } = await admin
    .from('branches')
    .select(
      'id, organization_id, name, logo_url, catalog_slug, catalog_enabled, catalog_delivery_fee_cop, payment_nequi, payment_bancolombia, payment_llave'
    )
    .eq('catalog_enabled', true)
    .ilike('catalog_slug', n)
    .maybeSingle()

  if (error || !data) return null
  const row = data as CatalogBranchRow
  return {
    ...row,
    catalog_delivery_fee_cop: Math.max(0, Math.floor(Number(row.catalog_delivery_fee_cop) || 0)),
  }
}

/** Primer dueño de la organización; si no hay, cualquier usuario de la org (para atribuir venta web). */
export async function resolveSaleUserIdForCatalog(admin: SupabaseClient, organizationId: string): Promise<string | null> {
  const { data: owner } = await admin
    .from('users')
    .select('id')
    .eq('organization_id', organizationId)
    .eq('role', 'owner')
    .limit(1)
    .maybeSingle()
  if (owner?.id) return owner.id
  const { data: anyUser } = await admin
    .from('users')
    .select('id')
    .eq('organization_id', organizationId)
    .limit(1)
    .maybeSingle()
  return anyUser?.id ?? null
}
