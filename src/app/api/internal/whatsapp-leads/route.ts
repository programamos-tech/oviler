import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isNouInternalStaff } from "@/lib/nou-internal";
import { listDemoLeads } from "@/lib/whatsapp/store";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { data: profileRow } = await supabase
    .from("users")
    .select("email")
    .eq("id", user.id)
    .maybeSingle();
  const profileEmail = (profileRow as { email?: string | null } | null)?.email ?? null;
  if (!isNouInternalStaff(user.email) && !isNouInternalStaff(profileEmail)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const leads = await listDemoLeads();
    return NextResponse.json({ leads });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Error desconocido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
