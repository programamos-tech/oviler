/** Valores de `organizations.subscription_status` (ver migración y CHECK en BD). */
export type SubscriptionStatus = "trial" | "active" | "suspended" | "cancelled";

export function licenseLabel(status: string | null): string {
  switch (status) {
    case "trial":
      return "Prueba gratis";
    case "active":
      return "Activa";
    case "suspended":
      return "Suspendida";
    case "cancelled":
      return "Cancelada";
    default:
      return status ?? "—";
  }
}

export function licenseClass(status: string | null): string {
  switch (status) {
    case "trial":
      return "font-bold text-nou-600 dark:text-nou-400";
    case "active":
      return "font-bold text-emerald-600 dark:text-emerald-400";
    case "suspended":
      return "font-bold text-amber-600 dark:text-amber-400";
    case "cancelled":
      return "font-bold text-rose-600 dark:text-rose-400";
    default:
      return "font-medium text-slate-700 dark:text-slate-300";
  }
}
