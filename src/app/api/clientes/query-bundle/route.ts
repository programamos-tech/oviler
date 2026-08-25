import { NextRequest, NextResponse } from "next/server";
import { assertVentasBranchAccess } from "@/lib/ventas-branch-auth";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const PAGE_SIZE_MAX = 50;

const LIST_SELECT =
  "id, organization_id, name, cedula, email, phone, created_at, customer_addresses(id, label, address, reference_point, is_default, display_order)";

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const branchId = sp.get("branchId");
  const page = Math.max(1, parseInt(sp.get("page") ?? "1", 10) || 1);
  const pageSize = Math.min(PAGE_SIZE_MAX, Math.max(1, parseInt(sp.get("pageSize") ?? "20", 10) || 20));
  const search = (sp.get("search") ?? "").trim();

  if (!branchId) {
    return NextResponse.json({ error: "branchId requerido" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [userRes, allowed] = await Promise.all([
    supabase.from("users").select("organization_id").eq("id", user.id).single(),
    assertVentasBranchAccess(supabase, user.id, branchId),
  ]);

  if (!allowed) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const organizationId = userRes.data?.organization_id;
  if (!organizationId) {
    return NextResponse.json({ customers: [], totalCount: 0, page, pageSize });
  }

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from("customers")
    .select(LIST_SELECT, { count: "exact" })
    .eq("organization_id", organizationId)
    .eq("branch_id", branchId)
    .eq("active", true)
    .order("created_at", { ascending: false })
    .range(from, to);

  if (search) {
    const esc = search.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
    query = query.or(
      `name.ilike.%${esc}%,cedula.ilike.%${esc}%,email.ilike.%${esc}%,phone.ilike.%${esc}%`
    );
  }

  let { data: customersData, count, error } = await query;

  if (error) {
    let fallback = supabase
      .from("customers")
      .select(LIST_SELECT, { count: "exact" })
      .eq("organization_id", organizationId)
      .eq("branch_id", branchId)
      .order("created_at", { ascending: false })
      .range(from, to);
    if (search) {
      const esc = search.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
      fallback = fallback.or(
        `name.ilike.%${esc}%,cedula.ilike.%${esc}%,email.ilike.%${esc}%,phone.ilike.%${esc}%`
      );
    }
    const res2 = await fallback;
    if (res2.error) {
      return NextResponse.json({ error: res2.error.message }, { status: 500 });
    }
    customersData = res2.data;
    count = res2.count;
  }

  return NextResponse.json(
    {
      customers: customersData ?? [],
      totalCount: count ?? 0,
      page,
      pageSize,
    },
    { headers: { "Cache-Control": "private, no-store" } }
  );
}
