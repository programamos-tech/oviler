import type { SupabaseClient } from "@supabase/supabase-js";

export type ActivityActor = "user" | "system";

export type LogActivityParams = {
  organizationId: string;
  branchId?: string | null;
  userId?: string | null;
  actorType?: ActivityActor;
  action: string;
  entityType: string;
  entityId?: string | null;
  summary: string;
  metadata?: Record<string, unknown>;
};

export async function logActivity(
  supabase: SupabaseClient,
  params: LogActivityParams
): Promise<{ error?: string }> {
  const {
    organizationId,
    branchId = null,
    userId = null,
    actorType = "user",
    action,
    entityType,
    entityId = null,
    summary,
    metadata = {},
  } = params;

  const { error } = await supabase.from("activities").insert({
    organization_id: organizationId,
    branch_id: branchId,
    user_id: userId,
    actor_type: actorType,
    action,
    entity_type: entityType,
    entity_id: entityId,
    summary,
    metadata,
  });

  if (error) {
    if (typeof console !== "undefined" && console.error) {
      console.error("[logActivity] No se pudo registrar la actividad:", error.message, { action, entityType });
    }
    return { error: error.message };
  }
  return {};
}
