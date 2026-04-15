import type { SupabaseClient } from "@supabase/supabase-js";
import { normalizePlanType, type PlanId } from "@/lib/plan-catalog";
import { customerFacingPlanName } from "@/lib/license-display";
import { trialDaysRemaining } from "@/lib/trial-ux";

export type OrgPlanSnapshot = {
  planId: PlanId;
  liteDisplayName: string;
  trialEndsAt: string | null;
  trialDaysRemaining: number | null;
  maxBranches: number;
  maxUsers: number;
  maxProducts: number;
  branchCount: number;
  userCount: number;
  productCount: number;
  canCreateBranch: boolean;
  canCreateUser: boolean;
  canCreateProduct: boolean;
};

export async function loadOrgPlanSnapshot(
  supabase: SupabaseClient,
  organizationId: string
): Promise<OrgPlanSnapshot | null> {
  const { data: org, error } = await supabase
    .from("organizations")
    .select("plan_type, trial_ends_at, max_branches, max_users, max_products")
    .eq("id", organizationId)
    .maybeSingle();

  if (error || !org) return null;

  const planId = normalizePlanType((org as { plan_type?: string }).plan_type ?? "");
  const maxBranches = Number((org as { max_branches?: number }).max_branches) || 1;
  const maxUsers = Number((org as { max_users?: number }).max_users) || 1;
  const maxProducts = Number((org as { max_products?: number }).max_products) || 999999;
  const trialEndsAt = (org as { trial_ends_at?: string | null }).trial_ends_at ?? null;

  const [{ count: bc }, { count: uc }, { count: pc }] = await Promise.all([
    supabase.from("branches").select("id", { count: "exact", head: true }).eq("organization_id", organizationId),
    supabase.from("users").select("id", { count: "exact", head: true }).eq("organization_id", organizationId),
    supabase.from("products").select("id", { count: "exact", head: true }).eq("organization_id", organizationId),
  ]);

  const branchCount = bc ?? 0;
  const userCount = uc ?? 0;
  const productCount = pc ?? 0;

  let trialDays: number | null = null;
  if (planId === "free" && trialEndsAt) {
    trialDays = trialDaysRemaining(trialEndsAt);
  }

  return {
    planId,
    liteDisplayName: customerFacingPlanName((org as { plan_type?: string }).plan_type),
    trialEndsAt,
    trialDaysRemaining: trialDays,
    maxBranches,
    maxUsers,
    maxProducts,
    branchCount,
    userCount,
    productCount,
    canCreateBranch: branchCount < maxBranches,
    canCreateUser: userCount < maxUsers,
    canCreateProduct: productCount < maxProducts,
  };
}
