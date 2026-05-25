/** Filtros compartidos lista de ventas (cliente + API). */

export type SalesListStatusFilter =
  | "all"
  | "completed"
  | "cancelled"
  | "pending"
  | "preparing"
  | "on_the_way"
  | "delivered";

export type SalesListPaymentFilter = "all" | "cash" | "transfer" | "mixed";

export type SalesListFiltersInput = {
  branchId: string;
  salesMode: "sales" | "orders";
  search?: string;
  statusFilter?: SalesListStatusFilter;
  paymentFilter?: SalesListPaymentFilter;
  dateStart?: string | null;
  dateEnd?: string | null;
};

/** Cadena PostgREST/Supabase (tipado laxo para evitar TS2589 en rutas API). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function applySalesListFilters(query: any, filters: SalesListFiltersInput): any {
  let q = query.eq("branch_id", filters.branchId);
  const qTrim = (filters.search ?? "").trim();
  if (qTrim) {
    const esc = qTrim.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
    q = q.or(`invoice_number.ilike.%${esc}%,customers.name.ilike.%${esc}%`);
  }
  const statusFilter = filters.statusFilter ?? "all";
  if (statusFilter !== "all") {
    if (filters.salesMode === "orders" && statusFilter === "preparing") {
      q = q.in("status", ["preparing", "packing"]);
    } else if (filters.salesMode === "orders" && statusFilter === "completed") {
      q = q.in("status", ["completed", "delivered"]);
    } else {
      q = q.eq("status", statusFilter);
    }
  }
  const paymentFilter = filters.paymentFilter ?? "all";
  if (paymentFilter !== "all") {
    q = q.eq("payment_method", paymentFilter);
  }
  if (filters.dateStart && filters.dateEnd) {
    q = q.gte("created_at", filters.dateStart).lte("created_at", filters.dateEnd);
  }
  return q;
}

export function hasSalesDateRange(dateStart?: string | null, dateEnd?: string | null): boolean {
  return Boolean(dateStart && dateEnd);
}

export function getSalesDateBounds(
  dateFrom: Date | null,
  dateTo: Date | null
): { start: string; end: string } | null {
  if (!dateFrom && !dateTo) return null;
  const startDate = dateFrom ?? dateTo!;
  const endDate = dateTo ?? dateFrom!;
  const start = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate(), 0, 0, 0, 0);
  const end = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate(), 23, 59, 59, 999);
  if (start.getTime() > end.getTime()) {
    return {
      start: new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate(), 0, 0, 0, 0).toISOString(),
      end: new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate(), 23, 59, 59, 999).toISOString(),
    };
  }
  return { start: start.toISOString(), end: end.toISOString() };
}
