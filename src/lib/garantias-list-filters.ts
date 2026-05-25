/** Filtros compartidos lista de garantías (cliente + API). */

export type GarantiasListStatusFilter = "all" | "pending" | "approved" | "rejected" | "processed";
export type GarantiasListTypeFilter = "all" | "exchange" | "refund" | "repair";

export type GarantiasListFiltersInput = {
  branchId: string;
  statusFilter?: GarantiasListStatusFilter;
  typeFilter?: GarantiasListTypeFilter;
  search?: string;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function applyGarantiasListFilters(query: any, filters: GarantiasListFiltersInput): any {
  let q = query;
  const status = filters.statusFilter ?? "all";
  if (status !== "all") q = q.eq("status", status);
  const type = filters.typeFilter ?? "all";
  if (type !== "all") q = q.eq("warranty_type", type);
  return q.order("created_at", { ascending: false });
}

export function warrantyMatchesSearch(
  row: {
    id: string;
    customers?: { name: string } | null;
    products?: { name: string } | null;
    sales?: { invoice_number: string } | null;
  },
  search: string
): boolean {
  const q = search.trim().toLowerCase();
  if (!q) return true;
  const shortId = row.id.slice(0, 8).toLowerCase();
  return (
    row.id.toLowerCase().includes(q) ||
    shortId.includes(q) ||
    Boolean(row.customers?.name?.toLowerCase().includes(q)) ||
    Boolean(row.products?.name?.toLowerCase().includes(q)) ||
    Boolean(row.sales?.invoice_number?.toLowerCase().includes(q))
  );
}
