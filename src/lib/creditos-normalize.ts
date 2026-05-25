import type { CreditStatus } from "@/app/creditos/credit-ui";

export function pickOne<T>(value: T | T[] | null | undefined): T | null {
  if (value == null) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

type SaleItemRow = {
  id: string;
  quantity: number;
  unit_price: number;
  discount_percent: number;
  discount_amount: number;
  products: { name: string; sku: string | null } | null;
};

type SaleEmbed = {
  id: string;
  invoice_number: string;
  payment_method: string;
  payment_pending: boolean | null;
  status: string;
  users: { name: string } | null;
  sale_items: SaleItemRow[];
};

export type CreditDetailPayload = {
  id: string;
  public_ref: string;
  total_amount: number;
  amount_paid: number;
  due_date: string;
  status: CreditStatus;
  cancelled_at: string | null;
  notes: string | null;
  created_at: string;
  customer_id: string;
  sale_id: string | null;
  branch_id: string;
  customers: { id: string; name: string } | null;
  branches: { name: string } | null;
  created_by_profile: { name: string } | null;
  sales: SaleEmbed | null;
};

export function normalizeCreditRow(raw: Record<string, unknown>): CreditDetailPayload {
  const customers = pickOne(raw.customers as { id: string; name: string } | { id: string; name: string }[] | null);
  const branches = pickOne(raw.branches as { name: string } | { name: string }[] | null);
  const created_by_profile = pickOne(
    raw.created_by_profile as { name: string } | { name: string }[] | null
  );
  const saleRaw = pickOne(raw.sales as Record<string, unknown> | Record<string, unknown>[] | null);
  let sales: SaleEmbed | null = null;
  if (saleRaw && typeof saleRaw === "object" && "id" in saleRaw) {
    const itemsRaw = saleRaw.sale_items;
    const itemsList = Array.isArray(itemsRaw) ? itemsRaw : itemsRaw ? [itemsRaw] : [];
    const saleUsers = pickOne(saleRaw.users as { name: string } | { name: string }[] | null);
    sales = {
      id: String(saleRaw.id),
      invoice_number: String(saleRaw.invoice_number ?? ""),
      payment_method: String(saleRaw.payment_method ?? "transfer"),
      payment_pending: saleRaw.payment_pending === true,
      status: String(saleRaw.status ?? ""),
      users: saleUsers,
      sale_items: itemsList.map((it) => {
        const row = it as Record<string, unknown>;
        const prod = pickOne(
          row.products as { name: string; sku: string | null } | { name: string; sku: string | null }[] | null | undefined
        );
        return {
          id: String(row.id),
          quantity: Number(row.quantity) || 0,
          unit_price: Number(row.unit_price) || 0,
          discount_percent: Number(row.discount_percent) || 0,
          discount_amount: Number(row.discount_amount) || 0,
          products: prod,
        };
      }),
    };
  }
  return {
    id: String(raw.id),
    public_ref: String(raw.public_ref),
    total_amount: Number(raw.total_amount),
    amount_paid: Number(raw.amount_paid),
    due_date: String(raw.due_date),
    status: raw.status as CreditStatus,
    cancelled_at: raw.cancelled_at ? String(raw.cancelled_at) : null,
    notes: raw.notes != null ? String(raw.notes) : null,
    created_at: String(raw.created_at),
    customer_id: String(raw.customer_id),
    sale_id: raw.sale_id ? String(raw.sale_id) : null,
    branch_id: String(raw.branch_id),
    customers,
    branches,
    created_by_profile,
    sales,
  };
}
