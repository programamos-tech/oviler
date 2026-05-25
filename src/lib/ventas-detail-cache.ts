import type { SalesMode } from "@/app/ventas/sales-mode";

export const DETAIL_CACHE_MS = 45_000;

export type LinkedCreditBanner = { id: string; public_ref: string; cancelled_at: string | null };

export type SaleDetailBundle = {
  sale: Record<string, unknown>;
  items: Record<string, unknown>[];
  salesMode: SalesMode;
  branchOrgId: string | null;
  deliveryAddress: Record<string, unknown> | null;
  deliveryPersons: { id: string; name: string; code: string }[];
  linkedCredit: LinkedCreditBanner | null;
  refundWarrantyProcessedCount: number;
  latestRefundWarrantyId: string | null;
  paymentProofSignedUrl: string | null;
};

export type SaleDetailExtras = Pick<SaleDetailBundle, "deliveryPersons" | "paymentProofSignedUrl">;

const cache = new Map<string, { at: number; payload: SaleDetailBundle }>();
const inflight = new Map<string, Promise<SaleDetailBundle | null>>();

export function detailCacheKey(id: string, refreshKey = 0) {
  return `${id}|${refreshKey}`;
}

export function getCachedSaleDetail(id: string, refreshKey = 0): SaleDetailBundle | null {
  const key = detailCacheKey(id, refreshKey);
  const hit = cache.get(key);
  if (!hit || Date.now() - hit.at >= DETAIL_CACHE_MS) return null;
  return hit.payload;
}

export function setCachedSaleDetail(id: string, refreshKey: number, payload: SaleDetailBundle) {
  cache.set(detailCacheKey(id, refreshKey), { at: Date.now(), payload });
}

export function mergeCachedSaleDetailExtras(
  id: string,
  refreshKey: number,
  extras: SaleDetailExtras
): SaleDetailBundle | null {
  const key = detailCacheKey(id, refreshKey);
  const hit = cache.get(key);
  if (!hit) return null;
  const merged = { ...hit.payload, ...extras };
  cache.set(key, { at: hit.at, payload: merged });
  return merged;
}

export async function fetchSaleDetailExtras(
  id: string,
  refreshKey = 0,
  signal?: AbortSignal
): Promise<SaleDetailExtras | null> {
  const res = await fetch(`/api/ventas/${id}/detail?extras=1`, {
    credentials: "include",
    signal,
  });
  if (!res.ok) return null;
  const extras = (await res.json()) as SaleDetailExtras;
  mergeCachedSaleDetailExtras(id, refreshKey, extras);
  return extras;
}

export async function fetchSaleDetailBundle(
  id: string,
  refreshKey = 0,
  opts?: { signal?: AbortSignal }
): Promise<SaleDetailBundle | null> {
  const key = detailCacheKey(id, refreshKey);
  const cached = getCachedSaleDetail(id, refreshKey);
  if (cached) return cached;

  const pending = inflight.get(key);
  if (pending) return pending;

  const run = (async () => {
    const res = await fetch(`/api/ventas/${id}/detail`, {
      credentials: "include",
      signal: opts?.signal,
    });
    if (res.status === 404) return null;
    if (!res.ok) return null;

    const bundle = (await res.json()) as SaleDetailBundle;
    setCachedSaleDetail(id, refreshKey, bundle);
    return bundle;
  })();

  inflight.set(key, run);
  try {
    return await run;
  } finally {
    inflight.delete(key);
  }
}

export function prefetchSaleDetails(ids: string[]) {
  if (typeof window === "undefined" || ids.length === 0) return;

  const schedule =
    typeof requestIdleCallback === "function"
      ? (cb: () => void) => requestIdleCallback(cb, { timeout: 2500 })
      : (cb: () => void) => window.setTimeout(cb, 400);

  schedule(() => {
    for (const id of ids.slice(0, 10)) {
      if (getCachedSaleDetail(id)) continue;
      void fetchSaleDetailBundle(id).catch(() => undefined);
    }
  });
}
