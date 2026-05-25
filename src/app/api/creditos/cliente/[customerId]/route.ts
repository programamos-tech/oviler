import { NextRequest, NextResponse } from "next/server";
import { assertVentasBranchAccess } from "@/lib/ventas-branch-auth";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const CACHE_SECONDS = 25;

const CREDIT_SELECT =
  "id, public_ref, total_amount, amount_paid, due_date, status, cancelled_at, sale_id, sales(invoice_number)";

function pickOne<T>(value: T | T[] | null | undefined): T | null {
  if (value == null) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ customerId: string }> }
) {
  const { customerId } = await context.params;
  const branchId = request.nextUrl.searchParams.get("branchId");

  if (!customerId) {
    return NextResponse.json({ error: "ID requerido" }, { status: 400 });
  }
  if (!branchId) {
    return NextResponse.json({ error: "branchId requerido" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const allowed = await assertVentasBranchAccess(supabase, user.id, branchId);
  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const [custRes, crRes] = await Promise.all([
    supabase.from("customers").select("id, name").eq("id", customerId).eq("branch_id", branchId).maybeSingle(),
    supabase
      .from("customer_credits")
      .select(CREDIT_SELECT)
      .eq("branch_id", branchId)
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false }),
  ]);

  if (custRes.error) {
    return NextResponse.json({ error: custRes.error.message }, { status: 500 });
  }
  if (!custRes.data) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (crRes.error) {
    return NextResponse.json({ error: crRes.error.message }, { status: 500 });
  }

  const credits = (crRes.data ?? []).map((row) => {
    const r = row as {
      sales: { invoice_number: string } | { invoice_number: string }[] | null;
    };
    return { ...row, sales: pickOne(r.sales) };
  });

  return NextResponse.json(
    {
      customer: custRes.data,
      credits,
    },
    {
      headers: {
        "Cache-Control": `private, max-age=${CACHE_SECONDS}, stale-while-revalidate=${CACHE_SECONDS * 2}`,
      },
    }
  );
}
