import { createClient } from "@/lib/supabase/client";
import { escapeSearchForFilter } from "@/lib/escape-search-for-filter";
import { canAccessPath, type AppRole } from "@/lib/permissions";

export const GLOBAL_SEARCH_LIMIT = 40;

export type ProductHit = { id: string; name: string; sku: string | null };
export type CustomerHit = { id: string; name: string; cedula: string | null; phone: string | null };

export type GlobalSearchResult = {
  products: ProductHit[];
  customers: CustomerHit[];
  canProducts: boolean;
  canCustomers: boolean;
};

export async function fetchGlobalSearch(q: string): Promise<GlobalSearchResult> {
  const trimmed = q.trim();
  if (!trimmed) {
    return { products: [], customers: [], canProducts: false, canCustomers: false };
  }

  const supabase = createClient();
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) {
    return { products: [], customers: [], canProducts: false, canCustomers: false };
  }

  const { data: me } = await supabase
    .from("users")
    .select("organization_id, role, permissions")
    .eq("id", user.id)
    .single();

  const orgId = me?.organization_id as string | undefined;
  const role = (me?.role ?? null) as AppRole | null;
  const customPermissions = (me?.permissions ?? null) as string[] | null;

  const showInv = canAccessPath(role, "/inventario", customPermissions);
  const showCust = canAccessPath(role, "/clientes", customPermissions);

  if (!orgId) {
    return { products: [], customers: [], canProducts: showInv, canCustomers: showCust };
  }

  const { data: ub } = await supabase.from("user_branches").select("branch_id").eq("user_id", user.id).limit(1).single();
  const branchId = ub?.branch_id;
  const escaped = escapeSearchForFilter(trimmed);

  const loadProducts = async (): Promise<ProductHit[]> => {
    if (!showInv || !branchId) return [];
    const { data: invScope } = await supabase
      .from("inventory")
      .select("product_id")
      .eq("branch_id", branchId);
    const scopedIds = [...new Set((invScope ?? []).map((r) => r.product_id).filter(Boolean))];
    if (scopedIds.length === 0) return [];
    const { data: prods } = await supabase
      .from("products")
      .select("id, name, sku")
      .eq("organization_id", orgId)
      .in("id", scopedIds)
      .or(`name.ilike.%${escaped}%,sku.ilike.%${escaped}%`)
      .order("name", { ascending: true })
      .limit(GLOBAL_SEARCH_LIMIT);
    return prods ?? [];
  };

  const loadCustomers = async (): Promise<CustomerHit[]> => {
    if (!showCust || !branchId) return [];
    const res1 = await supabase
      .from("customers")
      .select("id, name, cedula, phone")
      .eq("organization_id", orgId)
      .eq("branch_id", branchId)
      .eq("active", true)
      .or(`name.ilike.%${escaped}%,cedula.ilike.%${escaped}%,email.ilike.%${escaped}%,phone.ilike.%${escaped}%`)
      .order("name", { ascending: true })
      .limit(GLOBAL_SEARCH_LIMIT);
    if (res1.error) {
      const res2 = await supabase
        .from("customers")
        .select("id, name, cedula, phone")
        .eq("organization_id", orgId)
        .eq("branch_id", branchId)
        .or(`name.ilike.%${escaped}%,cedula.ilike.%${escaped}%,email.ilike.%${escaped}%,phone.ilike.%${escaped}%`)
        .order("name", { ascending: true })
        .limit(GLOBAL_SEARCH_LIMIT);
      return res2.data ?? [];
    }
    return res1.data ?? [];
  };

  const [products, customers] = await Promise.all([loadProducts(), loadCustomers()]);

  return {
    products,
    customers,
    canProducts: showInv,
    canCustomers: showCust,
  };
}
