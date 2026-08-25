import type { CreditDetailPayload } from "@/lib/creditos-normalize";

export const CREDITOS_LIST_CACHE_MS = 120_000;
export const CREDITO_DETAIL_CACHE_MS = 45_000;

export type CreditPaymentRow = {
  id: string;
  amount: number;
  payment_method: "cash" | "transfer" | "mixed";
  amount_cash: number | null;
  amount_transfer: number | null;
  payment_source?: "customer_payment" | "warranty_refund" | string | null;
  notes: string | null;
  created_at: string;
  created_by: string;
  users?: { name: string } | null;
};

export type CreditoDetailBundle = {
  credit: CreditDetailPayload;
  payments: CreditPaymentRow[];
};

export type CreditoClienteBundle = {
  customer: { id: string; name: string };
  credits: Array<{
    id: string;
    public_ref: string;
    total_amount: number;
    amount_paid: number;
    due_date: string;
    status: string;
    cancelled_at: string | null;
    sale_id: string | null;
    sales: { invoice_number: string } | null;
  }>;
};

const listCache = new Map<string, { at: number; payload: unknown }>();
const creditDetailCache = new Map<string, { at: number; payload: CreditoDetailBundle }>();
const clienteCache = new Map<string, { at: number; payload: CreditoClienteBundle }>();
const creditInflight = new Map<string, Promise<CreditoDetailBundle | null>>();
const clienteInflight = new Map<string, Promise<CreditoClienteBundle | null>>();

export function creditosListCacheKey(parts: Record<string, string | number>) {
  return Object.entries(parts)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join("|");
}

export function getCachedCreditosList(key: string) {
  const hit = listCache.get(key);
  if (!hit || Date.now() - hit.at >= CREDITOS_LIST_CACHE_MS) return null;
  return hit.payload;
}

export function setCachedCreditosList(key: string, payload: unknown) {
  listCache.set(key, { at: Date.now(), payload });
}

export function clearCreditosListCache() {
  listCache.clear();
}

const listInflight = new Map<string, Promise<unknown>>();

export function defaultCreditosListCacheKey(branchId: string, refreshKey = 0) {
  return creditosListCacheKey({
    branchId,
    page: 1,
    search: "",
    status: "all",
    refreshKey,
  });
}

export async function prefetchCreditosList(branchId: string, refreshKey = 0): Promise<void> {
  const cacheKey = defaultCreditosListCacheKey(branchId, refreshKey);
  if (getCachedCreditosList(cacheKey)) return;

  const pending = listInflight.get(cacheKey);
  if (pending) {
    await pending;
    return;
  }

  const params = new URLSearchParams({
    branchId,
    page: "1",
    pageSize: "20",
    search: "",
    status: "all",
  });

  const run = (async () => {
    const res = await fetch(`/api/creditos/query-bundle?${params.toString()}`, {
      credentials: "include",
    });
    if (!res.ok) return null;
    const bundle = await res.json();
    setCachedCreditosList(cacheKey, bundle);
    return bundle;
  })();

  listInflight.set(cacheKey, run);
  try {
    await run;
  } finally {
    listInflight.delete(cacheKey);
  }
}

function creditDetailKey(id: string, refreshKey: number) {
  return `${id}|${refreshKey}`;
}

export function getCachedCreditoDetail(id: string, refreshKey = 0): CreditoDetailBundle | null {
  const hit = creditDetailCache.get(creditDetailKey(id, refreshKey));
  if (!hit || Date.now() - hit.at >= CREDITO_DETAIL_CACHE_MS) return null;
  return hit.payload;
}

export function setCachedCreditoDetail(id: string, refreshKey: number, payload: CreditoDetailBundle) {
  creditDetailCache.set(creditDetailKey(id, refreshKey), { at: Date.now(), payload });
}

export function invalidateCreditoDetail(id: string) {
  for (const key of creditDetailCache.keys()) {
    if (key.startsWith(`${id}|`)) creditDetailCache.delete(key);
  }
}

export async function fetchCreditoDetailBundle(
  id: string,
  refreshKey = 0,
  signal?: AbortSignal
): Promise<CreditoDetailBundle | null> {
  const key = creditDetailKey(id, refreshKey);
  const cached = getCachedCreditoDetail(id, refreshKey);
  if (cached) return cached;

  const pending = creditInflight.get(key);
  if (pending) return pending;

  const run = (async () => {
    const res = await fetch(`/api/creditos/${id}/detail`, {
      credentials: "include",
      cache: "no-store",
      signal,
    });
    if (res.status === 404) return null;
    if (!res.ok) return null;
    const bundle = (await res.json()) as CreditoDetailBundle;
    setCachedCreditoDetail(id, refreshKey, bundle);
    return bundle;
  })();

  creditInflight.set(key, run);
  try {
    return await run;
  } finally {
    creditInflight.delete(key);
  }
}

function clienteKey(customerId: string, branchId: string, refreshKey: number) {
  return `${customerId}|${branchId}|${refreshKey}`;
}

export function getCachedCreditoCliente(
  customerId: string,
  branchId: string,
  refreshKey = 0
): CreditoClienteBundle | null {
  const hit = clienteCache.get(clienteKey(customerId, branchId, refreshKey));
  if (!hit || Date.now() - hit.at >= CREDITO_DETAIL_CACHE_MS) return null;
  return hit.payload;
}

export async function fetchCreditoClienteBundle(
  customerId: string,
  branchId: string,
  refreshKey = 0,
  signal?: AbortSignal
): Promise<CreditoClienteBundle | null> {
  const key = clienteKey(customerId, branchId, refreshKey);
  const cached = getCachedCreditoCliente(customerId, branchId, refreshKey);
  if (cached) return cached;

  const pending = clienteInflight.get(key);
  if (pending) return pending;

  const run = (async () => {
    const params = new URLSearchParams({ branchId });
    const res = await fetch(`/api/creditos/cliente/${customerId}?${params.toString()}`, {
      credentials: "include",
      signal,
    });
    if (res.status === 404) return null;
    if (!res.ok) return null;
    const bundle = (await res.json()) as CreditoClienteBundle;
    clienteCache.set(key, { at: Date.now(), payload: bundle });
    return bundle;
  })();

  clienteInflight.set(key, run);
  try {
    return await run;
  } finally {
    clienteInflight.delete(key);
  }
}

export function prefetchCreditoCliente(customerIds: string[], branchId: string) {
  if (typeof window === "undefined" || !branchId || customerIds.length === 0) return;
  const schedule =
    typeof requestIdleCallback === "function"
      ? (cb: () => void) => requestIdleCallback(cb, { timeout: 2500 })
      : (cb: () => void) => window.setTimeout(cb, 400);
  schedule(() => {
    for (const id of customerIds.slice(0, 8)) {
      if (getCachedCreditoCliente(id, branchId)) continue;
      void fetchCreditoClienteBundle(id, branchId).catch(() => undefined);
    }
  });
}

export function prefetchCreditoDetails(creditIds: string[]) {
  if (typeof window === "undefined" || creditIds.length === 0) return;
  const schedule =
    typeof requestIdleCallback === "function"
      ? (cb: () => void) => requestIdleCallback(cb, { timeout: 2500 })
      : (cb: () => void) => window.setTimeout(cb, 400);
  schedule(() => {
    for (const id of creditIds.slice(0, 10)) {
      if (getCachedCreditoDetail(id)) continue;
      void fetchCreditoDetailBundle(id).catch(() => undefined);
    }
  });
}
