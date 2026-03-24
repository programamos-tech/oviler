/**
 * Membresías NOU: precios COP/año y límites (referencias = filas en `products`).
 * Ajusta `pro.annualPriceCop` si cambia la tarifa Pro.
 */

export type PlanId = "free" | "basic" | "pro";

export const PLAN_ORDER: PlanId[] = ["free", "basic", "pro"];

export const PLAN_CATALOG: Record<
  PlanId,
  {
    label: string;
    shortLabel: string;
    /** Texto para UI interna / marketing */
    blurb: string;
    /** COP/año; null en prueba */
    annualPriceCop: number | null;
    maxProducts: number;
    maxUsers: number;
    /** 999999 = sin tope práctico */
    maxBranches: number;
    trialDays: number | null;
  }
> = {
  free: {
    label: "Prueba (15 días)",
    shortLabel: "Prueba",
    blurb: "50 referencias, 1 usuario, 1 sucursal; clientes y ventas sin tope práctico.",
    annualPriceCop: null,
    maxProducts: 50,
    maxUsers: 1,
    maxBranches: 1,
    trialDays: 15,
  },
  basic: {
    label: "Basic",
    shortLabel: "Basic",
    blurb: "Hasta 500 referencias y 3 usuarios; sucursales y CRM sin tope práctico.",
    annualPriceCop: 1_200_000,
    maxProducts: 500,
    maxUsers: 3,
    maxBranches: 999999,
    trialDays: null,
  },
  pro: {
    label: "Pro",
    shortLabel: "Pro",
    blurb: "Hasta 1000 referencias, 3 sucursales y 5 usuarios.",
    annualPriceCop: 2_400_000,
    maxProducts: 1000,
    maxUsers: 5,
    maxBranches: 3,
    trialDays: null,
  },
};

export function isPlanId(v: string): v is PlanId {
  return v === "free" || v === "basic" || v === "pro";
}

/** Migra valores legacy de BD a los planes actuales. */
export function normalizePlanType(p: string): PlanId {
  if (isPlanId(p)) return p;
  if (p === "intermediate" || p === "advanced") return "pro";
  return "basic";
}

export function formatCop(n: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(n);
}

export function planPriceLabel(plan: PlanId): string {
  const p = PLAN_CATALOG[plan].annualPriceCop;
  if (p == null) return "Sin cargo (período de prueba)";
  return `${formatCop(p)} / año`;
}

/** Límites a persistir en `organizations` al asignar o crear plan. */
export function limitsRowForPlan(plan: PlanId, opts?: { trialEndsAt?: Date | null }) {
  const c = PLAN_CATALOG[plan];
  let trial_ends_at: string | null = null;
  if (plan === "free") {
    const end = opts?.trialEndsAt ?? new Date(Date.now() + (c.trialDays ?? 15) * 24 * 60 * 60 * 1000);
    trial_ends_at = end.toISOString();
  }
  return {
    plan_type: plan,
    max_products: c.maxProducts,
    max_users: c.maxUsers,
    max_branches: c.maxBranches,
    trial_ends_at,
  };
}
