export const GARANTIA_DETAIL_CACHE_MS = 45_000;

export type GarantiaDetailBundle = {
  warranty: Record<string, unknown>;
};

const cache = new Map<string, { at: number; payload: GarantiaDetailBundle }>();
const inflight = new Map<string, Promise<GarantiaDetailBundle | null>>();

export function garantiaDetailCacheKey(id: string, branchId: string, refreshKey = 0) {
  return `${id}|${branchId}|${refreshKey}`;
}

export function getCachedGarantiaDetail(
  id: string,
  branchId: string,
  refreshKey = 0
): GarantiaDetailBundle | null {
  const key = garantiaDetailCacheKey(id, branchId, refreshKey);
  const hit = cache.get(key);
  if (!hit || Date.now() - hit.at >= GARANTIA_DETAIL_CACHE_MS) return null;
  return hit.payload;
}

export function setCachedGarantiaDetail(
  id: string,
  branchId: string,
  refreshKey: number,
  payload: GarantiaDetailBundle
) {
  cache.set(garantiaDetailCacheKey(id, branchId, refreshKey), { at: Date.now(), payload });
}

function detailUrl(id: string, branchId: string) {
  return `/api/garantias/${id}/detail?branchId=${encodeURIComponent(branchId)}`;
}

export async function fetchGarantiaDetailBundle(
  id: string,
  branchId: string,
  refreshKey = 0,
  signal?: AbortSignal
): Promise<GarantiaDetailBundle | null> {
  const key = garantiaDetailCacheKey(id, branchId, refreshKey);
  const cached = getCachedGarantiaDetail(id, branchId, refreshKey);
  if (cached) return cached;

  const pending = inflight.get(key);
  if (pending) return pending;

  const run = (async () => {
    const res = await fetch(detailUrl(id, branchId), { credentials: "include", signal });
    if (res.status === 404) return null;
    if (!res.ok) return null;
    const bundle = (await res.json()) as GarantiaDetailBundle;
    setCachedGarantiaDetail(id, branchId, refreshKey, bundle);
    return bundle;
  })();

  inflight.set(key, run);
  try {
    return await run;
  } finally {
    inflight.delete(key);
  }
}

export function prefetchGarantiaDetails(ids: string[], branchId: string) {
  if (typeof window === "undefined" || ids.length === 0 || !branchId) return;

  const schedule =
    typeof requestIdleCallback === "function"
      ? (cb: () => void) => requestIdleCallback(cb, { timeout: 2500 })
      : (cb: () => void) => window.setTimeout(cb, 400);

  schedule(() => {
    for (const id of ids.slice(0, 10)) {
      if (getCachedGarantiaDetail(id, branchId)) continue;
      void fetchGarantiaDetailBundle(id, branchId).catch(() => undefined);
    }
  });
}

const listCache = new Map<string, { at: number; payload: unknown }>();
export const GARANTIAS_LIST_CACHE_MS = 30_000;

export function garantiasListCacheKey(parts: Record<string, string | number>) {
  return Object.entries(parts)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join("|");
}

export function getCachedGarantiasList(key: string) {
  const hit = listCache.get(key);
  if (!hit || Date.now() - hit.at >= GARANTIAS_LIST_CACHE_MS) return null;
  return hit.payload;
}

export function setCachedGarantiasList(key: string, payload: unknown) {
  listCache.set(key, { at: Date.now(), payload });
}

export function clearGarantiasListCache() {
  listCache.clear();
}
