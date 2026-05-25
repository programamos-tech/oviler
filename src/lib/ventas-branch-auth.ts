import type { SupabaseClient } from "@supabase/supabase-js";

export async function assertVentasBranchAccess(
  supabase: SupabaseClient,
  userId: string,
  branchId: string
): Promise<boolean> {
  const { data } = await supabase
    .from("user_branches")
    .select("branch_id")
    .eq("user_id", userId)
    .eq("branch_id", branchId)
    .maybeSingle();
  return Boolean(data);
}
