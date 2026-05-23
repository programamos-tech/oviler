/** Utilidades UI compartidas del módulo Créditos. */

export function formatMoney(value: number) {
  return new Intl.NumberFormat("es-CO", { style: "decimal", minimumFractionDigits: 0 }).format(value);
}

export function formatDateShort(d: string | Date) {
  const x = typeof d === "string" ? new Date(d) : d;
  return x.toLocaleDateString("es-CO", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function formatDateTime(d: string) {
  return new Date(d).toLocaleString("es-CO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export type CreditStatus = "pending" | "overdue" | "completed" | "cancelled";

export function creditRowPending(total: number, paid: number, cancelled: boolean): number {
  if (cancelled) return 0;
  return Math.max(0, Math.round((total - paid) * 100) / 100);
}

/** Estado visual de una fila de crédito (según BD + saldo). */
export function creditLineDisplayStatus(
  status: CreditStatus,
  total: number,
  paid: number,
  cancelledAt: string | null
): CreditStatus {
  if (cancelledAt || status === "cancelled") return "cancelled";
  if (creditRowPending(total, paid, false) <= 0.005) return "completed";
  return status;
}

const CREDIT_BADGE_BASE =
  "inline-flex max-w-full items-center rounded-md px-2.5 py-1 text-[13px] font-semibold ring-1 ring-inset";

const CREDIT_STATUS_BADGE: Record<CreditStatus, string> = {
  overdue: `${CREDIT_BADGE_BASE} bg-rose-100 text-rose-900 ring-rose-300`,
  pending: `${CREDIT_BADGE_BASE} bg-amber-100 text-amber-950 ring-amber-300`,
  completed: `${CREDIT_BADGE_BASE} bg-emerald-100 text-emerald-900 ring-emerald-300`,
  cancelled: `${CREDIT_BADGE_BASE} bg-red-100 text-red-800 ring-red-300`,
};

export function creditStatusChip(status: CreditStatus): { label: string; className: string } {
  switch (status) {
    case "overdue":
      return { label: "Vencido", className: CREDIT_STATUS_BADGE.overdue };
    case "pending":
      return { label: "Pendiente", className: CREDIT_STATUS_BADGE.pending };
    case "completed":
      return { label: "Completado", className: CREDIT_STATUS_BADGE.completed };
    case "cancelled":
    default:
      return { label: "Anulado", className: CREDIT_STATUS_BADGE.cancelled };
  }
}

export type ClientAggregateStatus = "overdue" | "pending" | "completed" | "cancelled";

export function clientAggregateStatusFromCredits(
  rows: { status: CreditStatus; total_amount: number; amount_paid: number; cancelled_at: string | null }[]
): ClientAggregateStatus {
  if (!rows.length) return "completed";
  if (rows.every((r) => r.cancelled_at || r.status === "cancelled")) return "cancelled";
  const active = rows.filter((r) => !r.cancelled_at && r.status !== "cancelled");
  if (!active.length) return "cancelled";
  const pend = (r: (typeof rows)[0]) => creditRowPending(Number(r.total_amount), Number(r.amount_paid), false);
  if (active.some((r) => pend(r) > 0.005 && r.status === "overdue")) return "overdue";
  if (active.some((r) => pend(r) > 0.005)) return "pending";
  return "completed";
}

export function clientAggregateChip(status: ClientAggregateStatus): { label: string; className: string } {
  if (status === "overdue") return creditStatusChip("overdue");
  if (status === "pending") return creditStatusChip("pending");
  if (status === "cancelled") return creditStatusChip("cancelled");
  return creditStatusChip("completed");
}

export function paymentMethodLabel(m: "cash" | "transfer" | "mixed"): string {
  if (m === "cash") return "Efectivo";
  if (m === "transfer") return "Transferencia";
  return "Mixto";
}
