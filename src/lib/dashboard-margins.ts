/** Cálculo de margen bruto para el dashboard (servidor y cliente). */

export type SaleItemMarginRow = {
  quantity: number;
  unit_price: number;
  discount_percent: number;
  discount_amount: number;
  products: { name: string; base_cost: number | null } | null;
};

export type CreditPaymentMarginRow = {
  amount: number;
  payment_source?: string | null;
  customer_credits:
    | { sale_id?: string | null; public_ref?: string | null }
    | Array<{ sale_id?: string | null; public_ref?: string | null }>
    | null;
};

function normalizeProduct<T extends { name?: string; base_cost?: number | null }>(
  products: T | T[] | null | undefined
): { name: string; base_cost: number | null } | null {
  if (!products) return null;
  const p = Array.isArray(products) ? products[0] : products;
  return p ? { name: p.name ?? "—", base_cost: p.base_cost ?? null } : null;
}

export function normalizeSaleItemMarginRows(
  rows: Array<{
    sale_id?: string;
    quantity: number;
    unit_price: number;
    discount_percent?: number | null;
    discount_amount?: number | null;
    products?: { name?: string; base_cost?: number | null } | Array<{ name?: string; base_cost?: number | null }> | null;
  }>
): Array<SaleItemMarginRow & { sale_id?: string }> {
  return rows.map((it) => ({
    sale_id: it.sale_id,
    quantity: Number(it.quantity ?? 0),
    unit_price: Number(it.unit_price ?? 0),
    discount_percent: Number(it.discount_percent ?? 0),
    discount_amount: Number(it.discount_amount ?? 0),
    products: normalizeProduct(it.products),
  }));
}

export function grossMarginFromItemRows(itemRows: SaleItemMarginRow[]): number {
  return itemRows.reduce((sum, it) => {
    const unitPrice = Number(it.unit_price ?? 0);
    const discountPercent = Number(it.discount_percent ?? 0);
    const discountAmount = Number(it.discount_amount ?? 0);
    const quantity = Number(it.quantity ?? 0);
    const baseCost = Number(it.products?.base_cost ?? 0);
    const salePriceWithDiscount = Math.max(
      0,
      unitPrice * (1 - discountPercent / 100) - discountAmount
    );
    if (baseCost > 0) {
      return sum + (salePriceWithDiscount - baseCost) * quantity;
    }
    return sum;
  }, 0);
}

function isCreditPaymentCashInflow(p: CreditPaymentMarginRow): boolean {
  return p.payment_source !== "warranty_refund";
}

/** Margen atribuido a abonos a crédito en el período (misma lógica que el dashboard). */
export function computeMarginFromCreditAbonos(
  abonosPeriod: CreditPaymentMarginRow[],
  abonoSaleItems: Array<SaleItemMarginRow & { sale_id?: string }>,
  salesForAbono: Array<{ id: string; total: number; delivery_fee?: number | null }>
): number {
  const storeRevBySale = new Map<string, number>();
  for (const s of salesForAbono) {
    const df = Number(s.delivery_fee) || 0;
    storeRevBySale.set(String(s.id), Math.max(0, Number(s.total) - df));
  }

  const grouped = new Map<string, SaleItemMarginRow[]>();
  for (const it of abonoSaleItems) {
    const sid = it.sale_id ? String(it.sale_id) : "";
    if (!sid) continue;
    const row: SaleItemMarginRow = {
      quantity: it.quantity,
      unit_price: it.unit_price,
      discount_percent: it.discount_percent,
      discount_amount: it.discount_amount,
      products: it.products,
    };
    const list = grouped.get(sid) ?? [];
    list.push(row);
    grouped.set(sid, list);
  }

  const marginBySale = new Map<string, number>();
  for (const [sid, list] of grouped) {
    marginBySale.set(sid, grossMarginFromItemRows(list));
  }

  const payBySale = new Map<string, number>();
  for (const p of abonosPeriod) {
    if (!isCreditPaymentCashInflow(p)) continue;
    const c = p.customer_credits;
    const row = Array.isArray(c) ? c[0] : c;
    const sid = row?.sale_id ? String(row.sale_id) : null;
    if (!sid) continue;
    const pay = Number(p.amount ?? 0);
    if (pay <= 0) continue;
    payBySale.set(sid, (payBySale.get(sid) ?? 0) + pay);
  }

  let marginFromAbonos = 0;
  for (const [sid, totalPayInPeriod] of payBySale) {
    const saleM = marginBySale.get(sid) ?? 0;
    if (saleM <= 0) continue;
    const storeRev = storeRevBySale.get(sid) ?? 0;
    const denom = Math.max(storeRev, totalPayInPeriod, 1);
    const frac = Math.min(1, totalPayInPeriod / denom);
    marginFromAbonos += frac * saleM;
  }

  return marginFromAbonos;
}
