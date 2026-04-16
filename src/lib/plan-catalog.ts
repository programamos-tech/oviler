/**
 * Membresías Bernabé Comercios (IDs en BD: `free` = Lite, `basic` = Estándar, `pro` = Pro).
 * Precios anuales: `null` = por definir comercialmente.
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
    /** COP/año; null = sin cargo (Lite en prueba) o precio por definir */
    annualPriceCop: number | null;
    maxProducts: number;
    maxUsers: number;
    /** 999999 = sin tope práctico */
    maxBranches: number;
    trialDays: number | null;
  }
> = {
  free: {
    label: "Lite (prueba 15 días)",
    shortLabel: "Lite",
    blurb: "1 sucursal, 1 usuario, hasta 50 referencias. Sin catálogo en línea, créditos ni actividades. Luego aplica plan de pago.",
    annualPriceCop: null,
    maxProducts: 50,
    maxUsers: 1,
    maxBranches: 1,
    trialDays: 15,
  },
  basic: {
    label: "Estándar",
    shortLabel: "Estándar",
    blurb: "Hasta 3 sucursales, 8 usuarios, 500 referencias. Incluye catálogo en línea, créditos a clientes y actividades.",
    annualPriceCop: null,
    maxProducts: 500,
    maxUsers: 8,
    maxBranches: 3,
    trialDays: null,
  },
  pro: {
    label: "Pro",
    shortLabel: "Pro",
    blurb: "Hasta 5 sucursales, 15 usuarios, 1000 referencias. Todo lo del plan Estándar con más capacidad.",
    annualPriceCop: null,
    maxProducts: 1000,
    maxUsers: 15,
    maxBranches: 5,
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
  if (p == null) {
    if (plan === "free") return "Sin cargo (período de prueba)";
    return "Precio por definir";
  }
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
