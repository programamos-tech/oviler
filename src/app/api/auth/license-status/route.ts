import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { licensePeriodEndIso } from "@/lib/internal-billing";
import { isSuperAdminLicenseExempt } from "@/lib/nou-internal";

export const dynamic = "force-dynamic";

type BillingRow = {
  organization_id: string;
  license_period_start: string | null;
  license_period_months: number;
  license_unlock_salt: string | null;
  license_unlock_code_hash: string | null;
};

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (isSuperAdminLicenseExempt(user.email)) {
    const admin = createAdminClient();
    const { data: me } = await admin.from("users").select("organization_id").eq("id", user.id).maybeSingle();
    const orgId = me?.organization_id as string | undefined;
    const org = orgId
      ? (await admin.from("organizations").select("subscription_status, plan_type, trial_ends_at").eq("id", orgId).maybeSingle()).data
      : null;
    return NextResponse.json({
      requires_unlock: false,
      license_period_end: null,
      organization: org ?? null,
      license_exempt: true,
    });
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
  const [{ data: org }, { data: billing, error: billErr }] = await Promise.all([
    admin
      .from("organizations")
      .select("subscription_status, plan_type, trial_ends_at")
      .eq("id", orgId)
      .maybeSingle(),
    admin
      .from("internal_org_billing")
      .select("organization_id, license_period_start, license_period_months, license_unlock_salt, license_unlock_code_hash")
      .eq("organization_id", orgId)
      .maybeSingle(),
  ]);

  if (billErr) return NextResponse.json({ error: billErr.message }, { status: 500 });
  const bill = (billing as BillingRow | null) ?? null;
  const requires_unlock = Boolean(bill?.license_unlock_salt && bill?.license_unlock_code_hash);
  const license_period_end = bill
    ? licensePeriodEndIso(bill.license_period_start ?? null, bill.license_period_months ?? 12)
    : null;

  return NextResponse.json({
    requires_unlock,
    license_period_end,
    organization: org ?? null,
  });
}
