import { NextRequest, NextResponse } from "next/server";
import { normalizeCreditRow } from "@/lib/creditos-normalize";
import { assertVentasBranchAccess } from "@/lib/ventas-branch-auth";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const CREDIT_SELECT = `id, public_ref, total_amount, amount_paid, due_date, status, cancelled_at, notes, created_at, customer_id, sale_id, branch_id, created_by,
  customers(id, name),
  branches(name),
  created_by_profile:users!customer_credits_created_by_fkey(name),
  sales(
    id,
    invoice_number,
    payment_method,
    payment_pending,
    status,
    users!user_id(name),
    sale_items(
      id,
      quantity,
      unit_price,
      discount_percent,
      discount_amount,
      products(name, sku)
    )
  )`;

const PAY_SELECT =
  "id, amount, payment_method, amount_cash, amount_transfer, payment_source, notes, created_at, created_by, users!credit_payments_created_by_fkey(name)";

function pickOne<T>(value: T | T[] | null | undefined): T | null {
  if (value == null) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ creditId: string }> }
) {
  const { creditId } = await context.params;
  if (!creditId) {
    return NextResponse.json({ error: "ID requerido" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [{ data: cRow, error: cErr }, { data: pays, error: pErr }] = await Promise.all([
    supabase.from("customer_credits").select(CREDIT_SELECT).eq("id", creditId).maybeSingle(),
    supabase
      .from("credit_payments")
      .select(PAY_SELECT)
      .eq("credit_id", creditId)
      .order("created_at", { ascending: false }),
  ]);

  if (cErr) {
    return NextResponse.json({ error: cErr.message }, { status: 500 });
  }
  if (!cRow) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const branchId = String(cRow.branch_id ?? "");
  const allowed = await assertVentasBranchAccess(supabase, user.id, branchId);
  if (!allowed) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (pErr) {
    return NextResponse.json({ error: pErr.message }, { status: 500 });
  }

  const payments = (pays ?? []).map((row) => {
    const r = row as { users?: { name: string } | { name: string }[] | null };
    return { ...row, users: pickOne(r.users) };
  });

  return NextResponse.json(
    {
      credit: normalizeCreditRow(cRow as Record<string, unknown>),
      payments,
    },
    {
      headers: {
        "Cache-Control": "private, no-store",
      },
    }
  );
}
