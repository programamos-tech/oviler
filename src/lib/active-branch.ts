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
