import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isNouInternalStaff } from "@/lib/nou-internal";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isNouInternalStaff(user.email)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const admin = createAdminClient();

    const [
      orgsRes,
      usersRes,
      productsRes,
      branchesRes,
      customersRes,
      salesRes,
      expensesRes,
      orgStatsRes,
    ] = await Promise.all([
      admin.from("organizations").select("*", { count: "exact", head: true }),
      admin.from("users").select("*", { count: "exact", head: true }),
      admin.from("products").select("*", { count: "exact", head: true }),
      admin.from("branches").select("*", { count: "exact", head: true }),
      admin.from("customers").select("*", { count: "exact", head: true }),
      admin.from("sales").select("*", { count: "exact", head: true }),
      admin.from("expenses").select("*", { count: "exact", head: true }),
      admin
        .from("internal_dashboard_org_stats")
        .select(
          "id, name, plan_type, subscription_status, created_at, max_branches, max_users, max_products, trial_ends_at, user_count, branch_count, product_count, customer_count, sale_count, expense_count"
        )
        .order("created_at", { ascending: false }),
    ]);

    if (orgStatsRes.error) {
      return NextResponse.json(
        {
          error: "No se pudo leer la vista internal_dashboard_org_stats. ¿Corriste las migraciones?",
          details: orgStatsRes.error.message,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      totals: {
        organizations: orgsRes.count ?? 0,
        users: usersRes.count ?? 0,
        products: productsRes.count ?? 0,
        branches: branchesRes.count ?? 0,
        customers: customersRes.count ?? 0,
        sales: salesRes.count ?? 0,
        expenses: expensesRes.count ?? 0,
      },
      organizations: orgStatsRes.data ?? [],
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Error desconocido";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
