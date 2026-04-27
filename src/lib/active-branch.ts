"use client";

import type { SupabaseClient } from "@supabase/supabase-js";

export const ACTIVE_BRANCH_STORAGE_KEY = "nou.activeBranchId";
export const ACTIVE_BRANCH_CHANGED_EVENT = "nou:active-branch-changed";

export function readActiveBranchId(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(ACTIVE_BRANCH_STORAGE_KEY);
}

export function setActiveBranchId(branchId: string) {
  if (typeof window === "undefined") return;
  const current = window.localStorage.getItem(ACTIVE_BRANCH_STORAGE_KEY);
  if (current === branchId) return;
  window.localStorage.setItem(ACTIVE_BRANCH_STORAGE_KEY, branchId);
  window.dispatchEvent(new CustomEvent(ACTIVE_BRANCH_CHANGED_EVENT, { detail: { branchId } }));
}

export async function resolveActiveBranchId(
  supabase: SupabaseClient,
  userId: string,
  preferredBranchId?: string | null
): Promise<string | null> {
  const { data: assignments } = await supabase.from("user_branches").select("branch_id").eq("user_id", userId);
  const assignedIds = [...new Set((assignments ?? []).map((a) => a.branch_id).filter(Boolean))];
  if (assignedIds.length === 0) return null;

  const stored = readActiveBranchId();
  const candidate =
    (preferredBranchId && assignedIds.includes(preferredBranchId) && preferredBranchId) ||
    (stored && assignedIds.includes(stored) && stored) ||
    assignedIds[0];

  if (candidate && candidate !== stored) setActiveBranchId(candidate);
  return candidate ?? null;
}

export type ActiveBranchSalesMode = "sales" | "orders";

/**
 * Misma lógica que `resolveActiveBranchId`, pero en **una** query trae `name`, `sales_mode` y
 * `warranty_by_sale` de la sucursal (ahorra idas a `branches` en /ventas, /garantías, etc.).
 */
export async function resolveActiveBranchWithSalesMode(
  supabase: SupabaseClient,
  userId: string,
  preferredBranchId?: string | null
): Promise<{
  branchId: string | null;
  salesMode: ActiveBranchSalesMode;
  branchName: string;
  warrantyBySale: boolean;
}> {
  const { data: rows } = await supabase
    .from("user_branches")
    .select("branch_id, branches(name, sales_mode, warranty_by_sale)")
    .eq("user_id", userId);

  type Br = { name?: string | null; sales_mode?: string | null; warranty_by_sale?: boolean | null };
  type Row = { branch_id: string; branches: Br | Br[] | null };
  const list = (rows ?? []) as Row[];
  const assignedIds = [...new Set(list.map((a) => a.branch_id).filter(Boolean))];
  if (assignedIds.length === 0) {
    return { branchId: null, salesMode: "sales", branchName: "", warrantyBySale: true };
  }

  const stored = readActiveBranchId();
  const candidate =
    (preferredBranchId && assignedIds.includes(preferredBranchId) && preferredBranchId) ||
    (stored && assignedIds.includes(stored) && stored) ||
    assignedIds[0];

  if (candidate && candidate !== stored) {
    setActiveBranchId(candidate);
  }

  const match = list.find((r) => r.branch_id === candidate);
  const br = match?.branches;
  const branchObj = (Array.isArray(br) ? br[0] : br) as Br | null | undefined;
  const salesMode: ActiveBranchSalesMode =
    branchObj && branchObj.sales_mode === "orders" ? "orders" : "sales";
  const branchName = String(branchObj?.name ?? "").trim();
  const warrantyBySale = branchObj?.warranty_by_sale !== false;

  return { branchId: candidate ?? null, salesMode, branchName, warrantyBySale };
}
