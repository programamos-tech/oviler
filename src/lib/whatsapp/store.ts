import { createAdminClient } from "@/lib/supabase/admin";
import type { BotStep, SessionState } from "./flow";
import { emptySession } from "./flow";

export async function claimMessage(wamid: string): Promise<boolean> {
  const admin = createAdminClient();
  const { error } = await admin.from("whatsapp_processed_messages").insert({ wamid });
  if (!error) return true;
  if (error.code === "23505") return false;
  throw error;
}

export async function loadSession(waId: string, profileName: string | null): Promise<SessionState> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("whatsapp_bot_sessions")
    .select("wa_id, profile_name, step, store_status, inventory_system, wants_demo")
    .eq("wa_id", waId)
    .maybeSingle();
  if (error) throw error;
  if (!data) {
    return emptySession(waId, profileName);
  }
  return {
    wa_id: data.wa_id,
    profile_name: profileName ?? data.profile_name,
    step: data.step as BotStep,
    store_status: data.store_status,
    inventory_system: data.inventory_system,
    wants_demo: data.wants_demo,
  };
}

export async function saveSession(session: SessionState): Promise<void> {
  const admin = createAdminClient();
  const { error } = await admin.from("whatsapp_bot_sessions").upsert(
    {
      wa_id: session.wa_id,
      profile_name: session.profile_name,
      step: session.step,
      store_status: session.store_status,
      inventory_system: session.inventory_system,
      wants_demo: session.wants_demo,
    },
    { onConflict: "wa_id" }
  );
  if (error) throw error;
}

export async function saveLead(session: SessionState): Promise<void> {
  if (!session.store_status || !session.inventory_system || session.wants_demo == null) {
    return;
  }
  const admin = createAdminClient();
  const { error } = await admin.from("whatsapp_demo_leads").insert({
    wa_id: session.wa_id,
    profile_name: session.profile_name,
    store_status: session.store_status,
    inventory_system: session.inventory_system,
    wants_demo: session.wants_demo,
  });
  if (error) throw error;
}

export type DemoLeadRow = {
  id: string;
  wa_id: string;
  profile_name: string | null;
  store_status: string;
  inventory_system: string;
  wants_demo: boolean;
  created_at: string;
};

export async function listDemoLeads(limit = 80): Promise<DemoLeadRow[]> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("whatsapp_demo_leads")
    .select("id, wa_id, profile_name, store_status, inventory_system, wants_demo, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []) as DemoLeadRow[];
}
