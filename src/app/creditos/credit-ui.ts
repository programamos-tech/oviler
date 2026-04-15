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

export function creditStatusChip(status: CreditStatus): { label: string; className: string } {
  switch (status) {
    case "overdue":
      return {
        label: "Vencido",
        className:
          "inline-flex max-w-full items-center gap-1 rounded-full border border-rose-400/90 bg-rose-50 px-2.5 py-0.5 text-[12px] font-semibold text-rose-900 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-100",
      };
    case "pending":
      return {
        label: "Pendiente",
        className:
          "inline-flex max-w-full items-center gap-1 rounded-full border border-amber-500/85 bg-amber-100 px-2.5 py-0.5 text-[12px] font-semibold text-amber-950 dark:border-amber-900/45 dark:bg-amber-950/30 dark:text-amber-100",
      };
    case "completed":
      return {
        label: "Completado",
        className:
          "inline-flex max-w-full items-center gap-1 rounded-full border border-emerald-600/55 bg-emerald-50 px-2.5 py-0.5 text-[12px] font-semibold text-emerald-950 dark:border-emerald-900/45 dark:bg-emerald-950/35 dark:text-emerald-100",
      };
    case "cancelled":
    default:
      return {
        label: "Anulado",
        className:
          "inline-flex max-w-full items-center gap-1 rounded-full border border-red-200/90 bg-red-50/90 px-2.5 py-0.5 text-[12px] font-semibold text-red-800 dark:border-red-900/55 dark:bg-red-950/35 dark:text-red-200",
      };
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
