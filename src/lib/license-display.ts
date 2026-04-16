import { normalizePlanType, PLAN_CATALOG, type PlanId } from "@/lib/plan-catalog";
import { trialDaysRemaining, type OrgTrialFields } from "@/lib/trial-ux";

/** Nombre comercial en la app para el plan `free` (Lite). */
export const LITE_PLAN_DISPLAY_NAME = "Lite";

export function customerFacingPlanName(planType: string | null | undefined): string {
  const id = normalizePlanType(planType ?? "");
  if (id === "free") return LITE_PLAN_DISPLAY_NAME;
  return PLAN_CATALOG[id].shortLabel;
}

/** Una línea de estado: «Lite · N días de prueba» o el nombre corto del plan pagado. */
export function litePlanStatusLine(org: Pick<OrgTrialFields, "plan_type" | "trial_ends_at">): string {
  const id = normalizePlanType(org.plan_type ?? "");
  const tier = customerFacingPlanName(org.plan_type);
  if (id === "free" && org.trial_ends_at) {
    const days = trialDaysRemaining(org.trial_ends_at);
    if (days <= 0) return `${tier} · prueba finalizada`;
    if (days === 1) return `${tier} · 1 día de prueba restante`;
    return `${tier} · ${days} días de prueba`;
  }
  return `${tier} · ${PLAN_CATALOG[id].label}`;
}

export function upgradeContextLine(kind: "branches" | "users" | "products"): string {
  if (kind === "branches") return "Tu plan Lite permite 1 sucursal. Para abrir más sucursales necesitas Estándar o Pro.";
  if (kind === "users") return "Tu plan Lite permite 1 usuario. Para invitar colaboradores necesitas Estándar o Pro.";
  return "Alcanzaste el tope de referencias de tu plan. Para ampliar el catálogo necesitas Estándar o Pro.";
}

/** Una línea muy corta para cabeceras (junto al CTA), sin párrafo largo. */
export function upgradeMicroLine(
  kind: "branches" | "users" | "products",
  planType?: PlanId | string | null
): string {
  const id = normalizePlanType(planType ?? "");

  if (id === "basic") {
    if (kind === "branches") return "Estándar: 3 sucursales · amplía con Pro.";
    if (kind === "users") return "Estándar: 8 usuarios · amplía con Pro.";
    return "Tope de referencias del plan Estándar · amplía con Pro.";
  }

  if (kind === "branches") return "Lite: 1 sucursal · amplía con Estándar o Pro.";
  if (kind === "users") return "Lite: 1 usuario · amplía con Estándar o Pro.";
  return "Tope de referencias del plan · amplía con Estándar o Pro.";
}

export type { PlanId };
