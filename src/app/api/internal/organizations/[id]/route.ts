import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isNouInternalStaff } from "@/lib/nou-internal";
import { licensePeriodEndIso } from "@/lib/internal-billing";
import {
  generateUnlockCodePlain,
  hashUnlockCode,
  normalizeUnlockCodeInput,
} from "@/lib/license-unlock-code";
import { isPlanId, limitsRowForPlan, type PlanId } from "@/lib/plan-catalog";

export const dynamic = "force-dynamic";

const ALLOWED_STATUS = new Set(["trial", "active", "suspended", "cancelled"] as const);
const ALLOWED_BILLING = new Set(["paid", "pending", "overdue"] as const);

const ORG_STATS_FIELDS =
  "id, name, plan_type, subscription_status, created_at, max_branches, max_users, max_products, trial_ends_at, user_count, branch_count, product_count, customer_count, sale_count, expense_count";

async function requireStaff() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  if (!isNouInternalStaff(user.email)) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { user };
}

type RouteContext = { params: Promise<{ id: string }> };

type BillingRow = {
  organization_id: string;
  license_period_start: string | null;
  license_period_months: number;
  billing_status: string;
  notes: string | null;
  updated_at?: string;
  license_unlock_salt?: string | null;
  license_unlock_code_hash?: string | null;
};

function mergeBillingPayload(row: BillingRow | null) {
  const license_period_months = row?.license_period_months ?? 12;
  const license_period_start = row?.license_period_start ?? null;
  const billing_status = row?.billing_status ?? "pending";
  const notes = row?.notes ?? null;
  const hasUnlockConfigured = Boolean(row?.license_unlock_code_hash && row?.license_unlock_salt);
  return {
    license_period_start,
    license_period_months,
    billing_status,
    notes,
    license_period_end: licensePeriodEndIso(license_period_start, license_period_months),
    /** true si hay clave generada en servidor (el texto plano no se guarda ni se reenvía) */
    license_unlock_active: hasUnlockConfigured,
  };
}

export async function GET(_request: Request, context: RouteContext) {
  const staff = await requireStaff();
  if ("error" in staff) return staff.error;

  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  try {
    const admin = createAdminClient();

    const { data: orgRow, error: orgErr } = await admin
      .from("internal_dashboard_org_stats")
      .select(ORG_STATS_FIELDS)
      .eq("id", id)
      .maybeSingle();

    if (orgErr) {
      return NextResponse.json({ error: orgErr.message }, { status: 500 });
    }
    if (!orgRow) {
      return NextResponse.json({ error: "Organización no encontrada" }, { status: 404 });
    }

    const [{ data: orgMeta }, { data: billingRow }, { data: users }, { data: branches }] = await Promise.all([
      admin.from("organizations").select("updated_at").eq("id", id).maybeSingle(),
      admin.from("internal_org_billing").select("*").eq("organization_id", id).maybeSingle(),
      admin
        .from("users")
        .select("id, email, name, role, status, created_at, last_seen_at")
        .eq("organization_id", id)
        .order("created_at", { ascending: false }),
      admin.from("branches").select("id, name, phone, created_at").eq("organization_id", id).order("name"),
    ]);

    return NextResponse.json({
      organization: {
        ...orgRow,
        updated_at: orgMeta?.updated_at ?? null,
      },
      billing: mergeBillingPayload((billingRow as BillingRow | null) ?? null),
      users: users ?? [],
      branches: branches ?? [],
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Error desconocido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  const staff = await requireStaff();
  if ("error" in staff) return staff.error;

  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  let body: {
    subscription_status?: string;
    plan_type?: string;
    /** ISO; solo para plan `free` (fecha fin de prueba) */
    trial_ends_at?: string | null;
    billing?: {
      license_period_start?: string | null;
      license_period_months?: number;
      billing_status?: string;
      notes?: string | null;
    };
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const hasSub = body.subscription_status != null;
  const hasBilling = body.billing != null && typeof body.billing === "object";
  const hasPlan = body.plan_type != null;

  if (!hasSub && !hasBilling && !hasPlan) {
    return NextResponse.json(
      { error: "Envía subscription_status, plan_type y/o billing" },
      { status: 400 }
    );
  }

  try {
    const admin = createAdminClient();
    let licenseUnlockCodePlain: string | undefined;

    if (hasPlan) {
      const p = body.plan_type;
      if (typeof p !== "string" || !isPlanId(p)) {
        return NextResponse.json({ error: "plan_type debe ser free, basic o pro" }, { status: 400 });
      }
      let trialEnds: Date | undefined;
      if (p === "free") {
        if (typeof body.trial_ends_at === "string" && body.trial_ends_at.trim() !== "") {
          const d = new Date(body.trial_ends_at);
          if (Number.isNaN(d.getTime())) {
            return NextResponse.json({ error: "trial_ends_at no es una fecha válida" }, { status: 400 });
          }
          trialEnds = d;
        }
      }
      const row = limitsRowForPlan(p as PlanId, p === "free" ? { trialEndsAt: trialEnds } : undefined);
      const subscription_status = p === "free" ? "trial" : "active";
      const { data: planData, error: planErr } = await admin
        .from("organizations")
        .update({ ...row, subscription_status })
        .eq("id", id)
        .select("id")
        .maybeSingle();

      if (planErr) {
        return NextResponse.json({ error: planErr.message }, { status: 500 });
      }
      if (!planData) {
        return NextResponse.json({ error: "Organización no encontrada" }, { status: 404 });
      }
    }

    if (hasSub) {
      const next = body.subscription_status;
      if (typeof next !== "string" || !ALLOWED_STATUS.has(next as "trial" | "active" | "suspended" | "cancelled")) {
        return NextResponse.json(
          { error: "subscription_status debe ser trial, active, suspended o cancelled" },
          { status: 400 }
        );
      }
      const { data, error } = await admin
        .from("organizations")
        .update({ subscription_status: next })
        .eq("id", id)
        .select("id, name, subscription_status, plan_type, updated_at")
        .maybeSingle();

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
      if (!data) {
        return NextResponse.json({ error: "Organización no encontrada" }, { status: 404 });
      }
    }

    if (hasBilling) {
      const b = body.billing!;
      let license_period_start: string | null | undefined = b.license_period_start;
      if (license_period_start === "") license_period_start = null;
      if (license_period_start != null && typeof license_period_start !== "string") {
        return NextResponse.json({ error: "license_period_start inválido" }, { status: 400 });
      }

      let months = b.license_period_months ?? 12;
      if (typeof months !== "number" || !Number.isFinite(months) || months < 1 || months > 120) {
        return NextResponse.json({ error: "license_period_months debe ser 1–120" }, { status: 400 });
      }

      const status = b.billing_status ?? "pending";
      if (typeof status !== "string" || !ALLOWED_BILLING.has(status as "paid" | "pending" | "overdue")) {
        return NextResponse.json(
          { error: "billing_status debe ser paid, pending o overdue" },
          { status: 400 }
        );
      }

      let notes: string | null = b.notes ?? null;
      if (notes !== null && typeof notes !== "string") {
        return NextResponse.json({ error: "notes inválido" }, { status: 400 });
      }
      if (notes && notes.length > 4000) {
        return NextResponse.json({ error: "notes máximo 4000 caracteres" }, { status: 400 });
      }

      licenseUnlockCodePlain = generateUnlockCodePlain();
      const normalizedUnlock = normalizeUnlockCodeInput(licenseUnlockCodePlain);
      const { saltB64, hashB64 } = hashUnlockCode(normalizedUnlock);

      const { error: billErr } = await admin.from("internal_org_billing").upsert(
        {
          organization_id: id,
          license_period_start: license_period_start ?? null,
          license_period_months: months,
          billing_status: status,
          notes,
          license_unlock_salt: saltB64,
          license_unlock_code_hash: hashB64,
        },
        { onConflict: "organization_id" }
      );

      if (billErr) {
        return NextResponse.json({ error: billErr.message }, { status: 500 });
      }

    }

    const [{ data: orgRow }, { data: billingRow }, { data: orgMeta }] = await Promise.all([
      admin.from("internal_dashboard_org_stats").select(ORG_STATS_FIELDS).eq("id", id).maybeSingle(),
      admin.from("internal_org_billing").select("*").eq("organization_id", id).maybeSingle(),
      admin.from("organizations").select("updated_at").eq("id", id).maybeSingle(),
    ]);

    const billingPayload = mergeBillingPayload((billingRow as BillingRow | null) ?? null);

    return NextResponse.json({
      organization: orgRow ? { ...orgRow, updated_at: orgMeta?.updated_at ?? null } : null,
      billing: billingPayload,
      ...(licenseUnlockCodePlain ? { license_unlock_code: licenseUnlockCodePlain } : {}),
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Error desconocido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
