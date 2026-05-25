import { NextRequest, NextResponse } from "next/server";
import type { ClientAggregateStatus } from "@/app/creditos/credit-ui";
import { groupCreditsByClient, type CreditListRow } from "@/lib/creditos-grouping";
import { assertVentasBranchAccess } from "@/lib/ventas-branch-auth";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const PAGE_SIZE_MAX = 50;
const LIST_SELECT =
  "id, customer_id, total_amount, amount_paid, due_date, status, cancelled_at, customers(id, name)";

function pickOne<T>(value: T | T[] | null | undefined): T | null {
  if (value == null) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const branchId = sp.get("branchId");
  const page = Math.max(1, parseInt(sp.get("page") ?? "1", 10) || 1);
  const pageSize = Math.min(PAGE_SIZE_MAX, Math.max(1, parseInt(sp.get("pageSize") ?? "20", 10) || 20));
  const search = (sp.get("search") ?? "").trim();
  const statusFilter = (sp.get("status") ?? "all") as "all" | ClientAggregateStatus;

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

  const { data, error } = await supabase
    .from("customer_credits")
    .select(LIST_SELECT)
    .eq("branch_id", branchId)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows = (data ?? []).map((row) => {
    const r = row as CreditListRow & { customers: CreditListRow["customers"] | CreditListRow["customers"][] };
    return {
      ...r,
      customers: pickOne(r.customers),
    };
  }) as CreditListRow[];

  const groupedAll = groupCreditsByClient(rows, search, statusFilter);
  const totalCount = groupedAll.length;
  const from = (page - 1) * pageSize;
  const grouped = groupedAll.slice(from, from + pageSize);

  return NextResponse.json(
    {
      grouped,
      totalCount,
      creditRowCount: rows.length,
      page,
      pageSize,
    },
    { headers: { "Cache-Control": "private, max-age=20, stale-while-revalidate=40" } }
  );
}
