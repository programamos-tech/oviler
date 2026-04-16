import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { licensePeriodEndIso } from "@/lib/internal-billing";
import { normalizeUnlockCodeInput, verifyUnlockCode } from "@/lib/license-unlock-code";
import { limitsRowForPlan } from "@/lib/plan-catalog";

export const dynamic = "force-dynamic";

type BillingUnlockRow = {
  license_unlock_salt: string | null;
  license_unlock_code_hash: string | null;
  license_period_start: string | null;
  license_period_months: number;
};

export async function POST(request: Request) {
  let body: { code?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const raw = typeof body.code === "string" ? body.code : "";
  const normalized = normalizeUnlockCodeInput(raw);
  if (normalized.length < 8) {
    return NextResponse.json({ error: "Código inválido" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: me, error: meErr } = await admin
    .from("users")
    .select("organization_id")
    .eq("id", user.id)
    .maybeSingle();

  if (meErr || !me?.organization_id) {
    return NextResponse.json({ error: "Sin organización" }, { status: 400 });
  }

  const orgId = me.organization_id as string;

  const { data: billing, error: billErr } = await admin
    .from("internal_org_billing")
    .select("license_unlock_salt, license_unlock_code_hash, license_period_start, license_period_months")
    .eq("organization_id", orgId)
    .maybeSingle();

  if (billErr) {
    return NextResponse.json({ error: billErr.message }, { status: 500 });
  }

  const row = billing as BillingUnlockRow | null;
  if (!row?.license_unlock_salt || !row.license_unlock_code_hash) {
    return NextResponse.json({ error: "No hay clave activa. Pide una nueva al equipo NOU." }, { status: 403 });
  }

  if (!verifyUnlockCode(normalized, row.license_unlock_salt, row.license_unlock_code_hash)) {
    return NextResponse.json({ error: "Código incorrecto" }, { status: 401 });
  }

  const { data: org, error: orgErr } = await admin
    .from("organizations")
    .select("plan_type, trial_ends_at, subscription_status")
    .eq("id", orgId)
    .maybeSingle();

  if (orgErr || !org) {
    return NextResponse.json({ error: "Organización no encontrada" }, { status: 404 });
  }

  const orgUpdates: Record<string, string | null | number> = {
    subscription_status: "active",
  };

  const trialEnded =
    org.plan_type === "free" &&
    org.trial_ends_at &&
    new Date(org.trial_ends_at as string).getTime() < Date.now();

  if (trialEnded) {
    const months = row.license_period_months ?? 12;
    const periodEnd =
      row.license_period_start && months >= 1
        ? licensePeriodEndIso(row.license_period_start, months)
        : null;
    let nextIso: string;
    if (periodEnd && new Date(periodEnd).getTime() > Date.now()) {
      nextIso = periodEnd;
    } else {
      nextIso = new Date(Date.now() + 14 * 86400000).toISOString();
    }
    orgUpdates.trial_ends_at = nextIso;
  }

  // Si la organización sigue en plan Lite al activar código, pásala a Estándar.
  if (org.plan_type === "free") {
    const standardLimits = limitsRowForPlan("basic");
    orgUpdates.plan_type = standardLimits.plan_type;
    orgUpdates.max_products = standardLimits.max_products;
    orgUpdates.max_users = standardLimits.max_users;
    orgUpdates.max_branches = standardLimits.max_branches;
    orgUpdates.trial_ends_at = null;
  }

  const { error: upOrgErr } = await admin.from("organizations").update(orgUpdates).eq("id", orgId);
  if (upOrgErr) {
    return NextResponse.json({ error: upOrgErr.message }, { status: 500 });
  }

  const periodEnd = licensePeriodEndIso(row.license_period_start, row.license_period_months ?? 12);

  const { error: clearErr } = await admin
    .from("internal_org_billing")
    .update({ license_unlock_salt: null, license_unlock_code_hash: null })
    .eq("organization_id", orgId);

  if (clearErr) {
    return NextResponse.json({ error: clearErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, license_period_end: periodEnd });
}
