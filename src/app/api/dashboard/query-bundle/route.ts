import { NextRequest, NextResponse } from "next/server";
import { DASHBOARD_CARD_ITEM_LIMIT } from "@/lib/dashboard-berea";
import { resolveTopSoldProducts } from "@/lib/dashboard-top-products";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const CREDIT_PAY_SELECT =
  "amount, payment_method, amount_cash, amount_transfer, payment_source, created_at, customer_credits!inner(branch_id, public_ref, sale_id, total_amount)";

export async function GET(request: NextRequest) {
  const branchId = request.nextUrl.searchParams.get("branchId");
  const start = request.nextUrl.searchParams.get("start");
  const end = request.nextUrl.searchParams.get("end");
  const yStart = request.nextUrl.searchParams.get("yStart");
  const yEnd = request.nextUrl.searchParams.get("yEnd");
  const trendStart = request.nextUrl.searchParams.get("trendStart");
  const trendEnd = request.nextUrl.searchParams.get("trendEnd");

  if (!branchId || !start || !end || !yStart || !yEnd || !trendStart || !trendEnd) {
    return NextResponse.json({ error: "Parámetros incompletos" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: assignment } = await supabase
    .from("user_branches")
    .select("branch_id")
    .eq("user_id", user.id)
    .eq("branch_id", branchId)
    .maybeSingle();
  if (!assignment) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { data: branchMeta } = await supabase
    .from("branches")
    .select("organization_id")
    .eq("id", branchId)
    .maybeSingle();
  const organizationId = branchMeta?.organization_id ?? null;

  const [
    salesDay,
    salesPrevDay,
    expensesPrevDay,
    salesTrendWindow,
    creditPaymentsPeriod,
    creditPaymentsPrev,
    creditPaymentsTrend,
    customerCreditsBranch,
    inventoryData,
    defectiveData,
    expensesPeriod,
    warrantiesInPeriod,
    systemActivitiesRes,
    recentSales,
    newCustomers,
    newCustomersPrev,
    inventoryForStock,
  ] = await Promise.all([
    supabase
      .from("sales")
      .select(
        "id, total, payment_method, amount_cash, amount_transfer, is_delivery, status, invoice_number, delivery_fee, delivery_paid, payment_pending, created_at"
      )
      .eq("branch_id", branchId)
      .gte("created_at", start)
      .lte("created_at", end),
    supabase
      .from("sales")
      .select(
        "id, total, payment_method, amount_cash, amount_transfer, is_delivery, status, invoice_number, delivery_fee, delivery_paid, payment_pending, created_at"
      )
      .eq("branch_id", branchId)
      .gte("created_at", yStart)
      .lte("created_at", yEnd),
    supabase
      .from("expenses")
      .select("amount, payment_method")
      .eq("branch_id", branchId)
      .eq("status", "active")
      .gte("created_at", yStart)
      .lte("created_at", yEnd),
    supabase
      .from("sales")
      .select("total, created_at, delivery_fee, payment_pending")
      .eq("branch_id", branchId)
      .eq("status", "completed")
      .gte("created_at", trendStart)
      .lte("created_at", trendEnd),
    supabase
      .from("credit_payments")
      .select(CREDIT_PAY_SELECT)
      .eq("customer_credits.branch_id", branchId)
      .gte("created_at", start)
      .lte("created_at", end),
    supabase
      .from("credit_payments")
      .select(CREDIT_PAY_SELECT)
      .eq("customer_credits.branch_id", branchId)
      .gte("created_at", yStart)
      .lte("created_at", yEnd),
    supabase
      .from("credit_payments")
      .select(CREDIT_PAY_SELECT)
      .eq("customer_credits.branch_id", branchId)
      .gte("created_at", trendStart)
      .lte("created_at", trendEnd),
    supabase
      .from("customer_credits")
      .select("total_amount, amount_paid, cancelled_at, status")
      .eq("branch_id", branchId),
    supabase
      .from("inventory")
      .select("product_id, quantity, products(base_cost, base_price)")
      .eq("branch_id", branchId),
    supabase
      .from("defective_products")
      .select("product_id, quantity, products(base_cost)")
      .eq("branch_id", branchId)
      .in("disposition", ["pending", "returned_to_supplier", "destroyed"]),
    supabase
      .from("expenses")
      .select("id, amount, payment_method, concept, notes, created_at")
      .eq("branch_id", branchId)
      .eq("status", "active")
      .gte("created_at", start)
      .lte("created_at", end)
      .order("created_at", { ascending: false }),
    supabase
      .from("warranties")
      .select("id, branch_id, warranty_type, created_at, sales(branch_id)")
      .gte("created_at", start)
      .lte("created_at", end),
    organizationId
      ? supabase
          .from("activities")
          .select(
            "id, action, entity_type, entity_id, summary, created_at, actor_type, metadata, users!user_id(name)"
          )
          .eq("organization_id", organizationId)
          .eq("branch_id", branchId)
          .gte("created_at", start)
          .lte("created_at", end)
          .order("created_at", { ascending: false })
          .limit(30)
      : Promise.resolve({ data: [] as unknown[] }),
    supabase
      .from("sales")
      .select(
        "id, invoice_number, total, status, is_delivery, channel, payment_pending, delivery_fee, created_at, customers(name)"
      )
      .eq("branch_id", branchId)
      .gte("created_at", start)
      .lte("created_at", end)
      .order("created_at", { ascending: false })
      .limit(DASHBOARD_CARD_ITEM_LIMIT),
    supabase
      .from("customers")
      .select("id", { count: "exact", head: true })
      .eq("branch_id", branchId)
      .gte("created_at", start)
      .lte("created_at", end),
    supabase
      .from("customers")
      .select("id", { count: "exact", head: true })
      .eq("branch_id", branchId)
      .gte("created_at", yStart)
      .lte("created_at", yEnd),
    supabase
      .from("inventory")
      .select("product_id, quantity, min_stock, products(name)")
      .eq("branch_id", branchId)
      .order("quantity", { ascending: true })
      .limit(50),
  ]);

  const inventoryRows = (inventoryForStock.data ?? [])
    .map((row) => {
      const p = row.products;
      const product = Array.isArray(p) ? p[0] : p;
      const qty = Number(row.quantity ?? 0);
      const min = Number(row.min_stock ?? 0);
      return {
        id: String(row.product_id ?? ""),
        name: (product as { name?: string } | null)?.name ?? "—",
        quantity: qty,
        min_stock: min,
      };
    })
    .sort((a, b) => a.quantity - b.quantity || a.name.localeCompare(b.name, "es"));

  let lowStock: Array<{
    id: string;
    name: string;
    quantity: number;
    min_stock: number;
    kind: "inventory" | "slow_mover";
  }> = inventoryRows.slice(0, 5).map((row) => ({ ...row, kind: "inventory" as const }));

  if (lowStock.length === 0) {
    const completedSaleIds = ((salesDay.data ?? []) as Array<{
      id: string;
      status: string;
      payment_pending?: boolean | null;
    }>)
      .filter((s) => s.status === "completed" && !s.payment_pending)
      .map((s) => s.id);

    if (completedSaleIds.length > 0) {
      const { data: periodItems } = await supabase
        .from("sale_items")
        .select("product_id, quantity, products(name)")
        .in("sale_id", completedSaleIds.slice(0, 800));

      const byProduct: Record<string, { id: string; name: string; units: number }> = {};
      for (const it of periodItems ?? []) {
        const productId = String(it.product_id ?? "");
        if (!productId) continue;
        const p = it.products;
        const product = Array.isArray(p) ? p[0] : p;
        const name = (product as { name?: string } | null)?.name ?? "—";
        if (!byProduct[productId]) byProduct[productId] = { id: productId, name, units: 0 };
        byProduct[productId].units += Number(it.quantity ?? 0);
      }

      lowStock = Object.values(byProduct)
        .sort((a, b) => a.units - b.units || a.name.localeCompare(b.name, "es"))
        .slice(0, 5)
        .map((row) => ({
          id: row.id,
          name: row.name,
          quantity: row.units,
          min_stock: 0,
          kind: "slow_mover" as const,
        }));
    }
  }

  const prevCompletedSaleIds = ((salesPrevDay.data ?? []) as Array<{ id: string; status: string; payment_pending?: boolean | null }>)
    .filter((s) => s.status === "completed" && !s.payment_pending)
    .map((s) => s.id);

  let prevUnitsSold = 0;
  if (prevCompletedSaleIds.length > 0) {
    const { data: prevItems } = await supabase
      .from("sale_items")
      .select("quantity")
      .in("sale_id", prevCompletedSaleIds.slice(0, 800));
    prevUnitsSold = (prevItems ?? []).reduce((sum, row) => sum + Number(row.quantity ?? 0), 0);
  }

  let topProducts: Awaited<ReturnType<typeof resolveTopSoldProducts>> = [];
  try {
    topProducts = await resolveTopSoldProducts(supabase, branchId, start, end);
  } catch (err) {
    console.error("Error resolving top sold products:", err);
  }

  return NextResponse.json({
    salesDay: salesDay.data ?? [],
    salesPrevDay: salesPrevDay.data ?? [],
    expensesPrevDay: expensesPrevDay.data ?? [],
    salesTrendWindow: salesTrendWindow.data ?? [],
    creditPaymentsPeriod: creditPaymentsPeriod.data ?? [],
    creditPaymentsPrev: creditPaymentsPrev.data ?? [],
    creditPaymentsTrend: creditPaymentsTrend.data ?? [],
    customerCreditsBranch: customerCreditsBranch.data ?? [],
    inventoryData: inventoryData.data ?? [],
    defectiveData: defectiveData.data ?? [],
    expensesPeriod: expensesPeriod.data ?? [],
    warrantiesInPeriod: warrantiesInPeriod.data ?? [],
    recentSales: recentSales.data ?? [],
    newCustomersCount: newCustomers.count ?? 0,
    newCustomersPrevCount: newCustomersPrev.count ?? 0,
    prevUnitsSold,
    systemActivities: systemActivitiesRes.data ?? [],
    lowStock,
    topProducts,
  });
}
