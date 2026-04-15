import type { PlanId } from "@/lib/plan-catalog";

/** Funcionalidades que el plan Lite (`free`) no incluye; desde Estándar (`basic`) en adelante sí. */
export type PlanGatedModule = "catalog_web" | "customer_credits" | "branch_activities";

export function planHasModule(planId: PlanId, module: PlanGatedModule): boolean {
  if (planId === "free") {
    return false;
  }
  return true;
}

/** Rutas que requieren plan distinto de Lite. */
export function planLocksPath(planId: PlanId, pathname: string): boolean {
  if (planId !== "free") return false;
  if (pathname.startsWith("/catalogo")) return true;
  if (pathname.startsWith("/creditos")) return true;
  if (pathname.startsWith("/actividades")) return true;
  return false;
}
