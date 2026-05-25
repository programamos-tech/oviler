export const INVENTARIO_LIST_CACHE_MS = 30_000;
export const INVENTARIO_DETAIL_CACHE_MS = 45_000;

export type InventarioProductRow = {
  id: string;
  name: string;
  sku: string | null;
  category_id: string | null;
  base_price: number | null;
  base_cost: number | null;
  apply_iva: boolean;
  description: string | null;
};

export type InventarioListBundle = {
  products: InventarioProductRow[];
  stockSplitByProduct: Record<string, { local: number; bodega: number }>;
  categories: Array<{ id: string; name: string }>;
  hasBodega: boolean;
  totalCount: number;
  page: number;
  pageSize: number;
};

export type InventarioDetailProduct = {
  id: string;
  name: string;
  sku: string | null;
  category_id: string | null;
  category_name?: string | null;
  brand: string | null;
  description: string | null;
  base_price: number | null;
  base_cost: number | null;
  apply_iva: boolean;
};

export type InventarioDetailBundle = {
  product: InventarioDetailProduct;
  hasBodega: boolean;
  stockLocal: number;
  stockBodega: number;
  stockTotal: number;
  stockReserved: number;
  locationRows: Array<{ quantity: number; path: string; locationId: string }>;
};

const listCache = new Map<string, { at: number; payload: InventarioListBundle }>();
const detailCache = new Map<string, { at: number; payload: InventarioDetailBundle }>();
const detailInflight = new Map<string, Promise<InventarioDetailBundle | null>>();

export function inventarioListCacheKey(parts: Record<string, string | number>) {
  return Object.entries(parts)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join("|");
}

export function getCachedInventarioList(key: string): InventarioListBundle | null {
  const hit = listCache.get(key);
  if (!hit || Date.now() - hit.at >= INVENTARIO_LIST_CACHE_MS) return null;
  return hit.payload;
}

export function setCachedInventarioList(key: string, payload: InventarioListBundle) {
  listCache.set(key, { at: Date.now(), payload });
}

export function clearInventarioListCache() {
  listCache.clear();
}

function detailKey(id: string, branchId: string, refreshKey: number) {
  return `${id}|${branchId}|${refreshKey}`;
}

export function getCachedInventarioDetail(
  id: string,
  branchId: string,
  refreshKey = 0
): InventarioDetailBundle | null {
  const hit = detailCache.get(detailKey(id, branchId, refreshKey));
  if (!hit || Date.now() - hit.at >= INVENTARIO_DETAIL_CACHE_MS) return null;
  return hit.payload;
}

export function setCachedInventarioDetail(
  id: string,
  branchId: string,
  refreshKey: number,
  payload: InventarioDetailBundle
) {
  detailCache.set(detailKey(id, branchId, refreshKey), { at: Date.now(), payload });
}

export function invalidateInventarioDetail(id: string) {
  for (const key of detailCache.keys()) {
    if (key.startsWith(`${id}|`)) detailCache.delete(key);
  }
}

export async function fetchInventarioDetailBundle(
  id: string,
  branchId: string,
  refreshKey = 0,
  signal?: AbortSignal
): Promise<InventarioDetailBundle | null> {
  const key = detailKey(id, branchId, refreshKey);
  const cached = getCachedInventarioDetail(id, branchId, refreshKey);
  if (cached) return cached;

  const pending = detailInflight.get(key);
  if (pending) return pending;

  const run = (async () => {
    const params = new URLSearchParams({ branchId });
    const res = await fetch(`/api/inventario/${id}/detail?${params.toString()}`, {
      credentials: "include",
      signal,
    });
    if (res.status === 404) return null;
    if (!res.ok) return null;
    const bundle = (await res.json()) as InventarioDetailBundle;
    setCachedInventarioDetail(id, branchId, refreshKey, bundle);
    return bundle;
  })();

  detailInflight.set(key, run);
  try {
    return await run;
  } finally {
    detailInflight.delete(key);
  }
}

export function prefetchInventarioDetails(ids: string[], branchId: string) {
  if (typeof window === "undefined" || ids.length === 0 || !branchId) return;
  const schedule =
    typeof requestIdleCallback === "function"
      ? (cb: () => void) => requestIdleCallback(cb, { timeout: 2500 })
      : (cb: () => void) => window.setTimeout(cb, 400);
  schedule(() => {
    for (const id of ids.slice(0, 10)) {
      if (getCachedInventarioDetail(id, branchId)) continue;
      void fetchInventarioDetailBundle(id, branchId).catch(() => undefined);
    }
  });
}
