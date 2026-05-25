import type { SupabaseClient } from "@supabase/supabase-js";
import {
  aggregateTopSoldProducts,
  DASHBOARD_CARD_ITEM_LIMIT,
  type TopSoldProduct,
} from "@/lib/dashboard-berea";

const SALE_ITEMS_SELECT =
  "product_id, quantity, unit_price, discount_percent, discount_amount, products(name)";
const SALE_ID_CHUNK = 60;
const PAGE_SIZE = 1000;
const EXTENDED_LOOKBACK_DAYS = 90;
/** Límite de ventas a analizar en el dashboard (evita N+1 masivo en días muy movidos). */
const DASHBOARD_MAX_SALES_FOR_TOP = 250;

export type ResolveTopSoldProductsOptions = {
  limit?: number;
  /** No amplía a 90 días si el período trae pocos productos (más rápido en reportes). */
  skipExtendedLookback?: boolean;
  maxSales?: number;
};

type RawSaleItem = {
  product_id: string;
  quantity: number;
  unit_price: number;
  discount_percent?: number | null;
  discount_amount?: number | null;
  products?: { name?: string } | { name?: string }[] | null;
};

function normalizeSaleItem(row: RawSaleItem) {
  const products = row.products;
  return {
    ...row,
    products: Array.isArray(products) ? products[0] ?? null : products,
  };
}

async function fetchSaleItemsForSales(supabase: SupabaseClient, saleIds: string[]) {
  if (saleIds.length === 0) return [];

  const rows: RawSaleItem[] = [];
  for (let i = 0; i < saleIds.length; i += SALE_ID_CHUNK) {
    const chunk = saleIds.slice(i, i + SALE_ID_CHUNK);
    let offset = 0;
    while (true) {
      const { data, error } = await supabase
        .from("sale_items")
        .select(SALE_ITEMS_SELECT)
        .in("sale_id", chunk)
        .range(offset, offset + PAGE_SIZE - 1);
      if (error) throw error;
      if (!data?.length) break;
      rows.push(...(data as RawSaleItem[]));
      if (data.length < PAGE_SIZE) break;
      offset += PAGE_SIZE;
    }
  }
  return rows.map(normalizeSaleItem);
}

async function topSoldProductsInRange(
  supabase: SupabaseClient,
  branchId: string,
  rangeStart: string,
  rangeEnd: string,
  limit = DASHBOARD_CARD_ITEM_LIMIT,
  maxSales = DASHBOARD_MAX_SALES_FOR_TOP
): Promise<TopSoldProduct[]> {
  const { data: sales, error } = await supabase
    .from("sales")
    .select("id")
    .eq("branch_id", branchId)
    .eq("status", "completed")
    .gte("created_at", rangeStart)
    .lte("created_at", rangeEnd)
    .order("created_at", { ascending: false })
    .limit(maxSales);
  if (error) throw error;

  const saleIds = (sales ?? []).map((row) => String(row.id));
  if (saleIds.length === 0) return [];

  const items = await fetchSaleItemsForSales(supabase, saleIds);
  return aggregateTopSoldProducts(items, limit);
}

/** Top N productos vendidos; amplía el rango si el período tiene menos de N. */
export async function resolveTopSoldProducts(
  supabase: SupabaseClient,
  branchId: string,
  start: string,
  end: string,
  limit = DASHBOARD_CARD_ITEM_LIMIT,
  options: ResolveTopSoldProductsOptions = {}
): Promise<TopSoldProduct[]> {
  const maxSales = options.maxSales ?? DASHBOARD_MAX_SALES_FOR_TOP;
  const periodTop = await topSoldProductsInRange(supabase, branchId, start, end, limit, maxSales);
  if (options.skipExtendedLookback || periodTop.length >= limit) return periodTop;

  const extendedStart = new Date(start);
  extendedStart.setDate(extendedStart.getDate() - EXTENDED_LOOKBACK_DAYS);
  const extendedTop = await topSoldProductsInRange(
    supabase,
    branchId,
    extendedStart.toISOString(),
    end,
    limit,
    maxSales
  );
  return extendedTop.slice(0, limit);
}
