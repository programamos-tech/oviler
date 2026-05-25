export const VENTAS_LIST_CACHE_MS = 120_000;

const listCache = new Map<string, { at: number; payload: unknown }>();
const inflight = new Map<string, Promise<unknown>>();

export function ventasListCacheKey(parts: Record<string, string | number>) {
  return Object.entries(parts)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join("|");
}

export function getCachedVentasList(key: string) {
  const hit = listCache.get(key);
  if (!hit || Date.now() - hit.at >= VENTAS_LIST_CACHE_MS) return null;
  return hit.payload;
}

export function setCachedVentasList(key: string, payload: unknown) {
  listCache.set(key, { at: Date.now(), payload });
}

export function clearVentasListCache() {
  listCache.clear();
}

export function defaultVentasListCacheKey(branchId: string, salesMode: string, refreshKey = 0) {
  return ventasListCacheKey({
    branchId,
    page: 1,
    search: "",
    status: "all",
    payment: "all",
    dateStart: "",
    dateEnd: "",
    salesMode,
    refreshKey,
  });
}

export async function prefetchVentasList(
  branchId: string,
  salesMode: string,
  refreshKey = 0
): Promise<void> {
  const cacheKey = defaultVentasListCacheKey(branchId, salesMode, refreshKey);
  if (getCachedVentasList(cacheKey)) return;

  const pending = inflight.get(cacheKey);
  if (pending) {
    await pending;
    return;
  }

  const params = new URLSearchParams({
    branchId,
    salesMode,
    page: "1",
    pageSize: "20",
    search: "",
    status: "all",
    payment: "all",
    skipTotals: "1",
  });

  const run = (async () => {
    const res = await fetch(`/api/ventas/query-bundle?${params.toString()}`, {
      credentials: "include",
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { paymentTotals?: unknown };
    const bundle = { ...json, paymentTotals: json.paymentTotals ?? null };
    setCachedVentasList(cacheKey, bundle);
    return bundle;
  })();

  inflight.set(cacheKey, run);
  try {
    await run;
  } finally {
    inflight.delete(cacheKey);
  }
}
