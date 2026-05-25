import type { CreditStatus } from "@/app/creditos/credit-ui";

export const CLIENTE_DETAIL_CACHE_MS = 45_000;

export type ClienteTopProduct = {
  product_id: string;
  product_name: string;
  total_quantity: number;
};

export type ClienteDetailBundle = {
  customer: Record<string, unknown>;
  sales: Array<{
    id: string;
    invoice_number: string;
    total: number;
    status: string;
    created_at: string;
  }>;
  salesTruncated: boolean;
  credits: Array<{
    id: string;
    public_ref: string;
    title: string | null;
    total_amount: number;
    amount_paid: number;
    due_date: string;
    status: CreditStatus;
    cancelled_at: string | null;
    sale_id: string | null;
    sales: { invoice_number: string } | null;
  }>;
  warrantySummary: { total: number; processedRefunds: number };
  topProducts: ClienteTopProduct[];
};

export type ClienteDetailExtras = Pick<ClienteDetailBundle, "topProducts">;

const cache = new Map<string, { at: number; payload: ClienteDetailBundle }>();
const inflight = new Map<string, Promise<ClienteDetailBundle | null>>();

export function clienteDetailCacheKey(id: string, branchId: string, refreshKey = 0) {
  return `${id}|${branchId}|${refreshKey}`;
}

export function getCachedClienteDetail(
  id: string,
  branchId: string,
  refreshKey = 0
): ClienteDetailBundle | null {
  const key = clienteDetailCacheKey(id, branchId, refreshKey);
  const hit = cache.get(key);
  if (!hit || Date.now() - hit.at >= CLIENTE_DETAIL_CACHE_MS) return null;
  return hit.payload;
}

export function setCachedClienteDetail(
  id: string,
  branchId: string,
  refreshKey: number,
  payload: ClienteDetailBundle
) {
  cache.set(clienteDetailCacheKey(id, branchId, refreshKey), { at: Date.now(), payload });
}

export function mergeCachedClienteDetailExtras(
  id: string,
  branchId: string,
  refreshKey: number,
  extras: ClienteDetailExtras
): ClienteDetailBundle | null {
  const key = clienteDetailCacheKey(id, branchId, refreshKey);
  const hit = cache.get(key);
  if (!hit) return null;
  const merged = { ...hit.payload, ...extras };
  cache.set(key, { at: hit.at, payload: merged });
  return merged;
}

function detailUrl(id: string, branchId: string, extras = false) {
  const params = new URLSearchParams({ branchId });
  if (extras) params.set("extras", "1");
  return `/api/clientes/${id}/detail?${params.toString()}`;
}

export async function fetchClienteDetailExtras(
  id: string,
  branchId: string,
  refreshKey = 0,
  signal?: AbortSignal
): Promise<ClienteDetailExtras | null> {
  const res = await fetch(detailUrl(id, branchId, true), { credentials: "include", signal });
  if (!res.ok) return null;
  const extras = (await res.json()) as ClienteDetailExtras;
  mergeCachedClienteDetailExtras(id, branchId, refreshKey, extras);
  return extras;
}

export async function fetchClienteDetailBundle(
  id: string,
  branchId: string,
  refreshKey = 0,
  signal?: AbortSignal
): Promise<ClienteDetailBundle | null> {
  const key = clienteDetailCacheKey(id, branchId, refreshKey);
  const cached = getCachedClienteDetail(id, branchId, refreshKey);
  if (cached) return cached;

  const pending = inflight.get(key);
  if (pending) return pending;

  const run = (async () => {
    const res = await fetch(detailUrl(id, branchId), { credentials: "include", signal });
    if (res.status === 404) return null;
    if (!res.ok) return null;
    const bundle = (await res.json()) as ClienteDetailBundle;
    setCachedClienteDetail(id, branchId, refreshKey, bundle);
    return bundle;
  })();

  inflight.set(key, run);
  try {
    return await run;
  } finally {
    inflight.delete(key);
  }
}

export function prefetchClienteDetails(ids: string[], branchId: string) {
  if (typeof window === "undefined" || ids.length === 0 || !branchId) return;

  const schedule =
    typeof requestIdleCallback === "function"
      ? (cb: () => void) => requestIdleCallback(cb, { timeout: 2500 })
      : (cb: () => void) => window.setTimeout(cb, 400);

  schedule(() => {
    for (const id of ids.slice(0, 10)) {
      if (getCachedClienteDetail(id, branchId)) continue;
      void fetchClienteDetailBundle(id, branchId).catch(() => undefined);
    }
  });
}

const listCache = new Map<string, { at: number; payload: unknown }>();
export const CLIENTES_LIST_CACHE_MS = 30_000;

export function clientesListCacheKey(parts: Record<string, string | number>) {
  return Object.entries(parts)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join("|");
}

export function getCachedClientesList(key: string) {
  const hit = listCache.get(key);
  if (!hit || Date.now() - hit.at >= CLIENTES_LIST_CACHE_MS) return null;
  return hit.payload;
}

export function setCachedClientesList(key: string, payload: unknown) {
  listCache.set(key, { at: Date.now(), payload });
}

export function clearClientesListCache() {
  listCache.clear();
}
