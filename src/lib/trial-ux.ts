import { normalizePlanType } from "@/lib/plan-catalog";

export type OrgTrialFields = {
  subscription_status: string | null;
  plan_type: string | null;
  trial_ends_at: string | null;
};

/** Prueba gratis vigente: plan free, fin de prueba futura, licencia no cortada. Acepta `subscription_status` `trial` o legacy `active`. */
export function isFreeTrialActive(org: OrgTrialFields | null): boolean {
  if (!org) return false;
  const st = org.subscription_status ?? "";
  if (st === "suspended" || st === "cancelled") return false;
  if (normalizePlanType(org.plan_type ?? "") !== "free") return false;
  if (!org.trial_ends_at) return false;
  return new Date(org.trial_ends_at).getTime() > Date.now();
}

/** Días restantes (mínimo 0). Usa techo para alinear con “te quedan X días”. */
export function trialDaysRemaining(trialEndsAt: string): number {
  const end = new Date(trialEndsAt).getTime();
  const diff = end - Date.now();
  if (diff <= 0) return 0;
  return Math.ceil(diff / (24 * 60 * 60 * 1000));
}

export function trialRemainingLabel(trialEndsAt: string): string {
  const days = trialDaysRemaining(trialEndsAt);
  if (days <= 0) return "0 días";
  if (days === 1) return "1 día";
  return `${days} días`;
}
