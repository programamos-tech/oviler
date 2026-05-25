import { NextRequest, NextResponse } from "next/server";
import { DASHBOARD_CARD_ITEM_LIMIT } from "@/lib/dashboard-berea";
import {
  computeMarginFromCreditAbonos,
  grossMarginFromItemRows,
  normalizeSaleItemMarginRows,
  type CreditPaymentMarginRow,
} from "@/lib/dashboard-margins";
import { resolveTopSoldProducts } from "@/lib/dashboard-top-products";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const BUNDLE_CACHE_SECONDS = 30;

const CREDIT_PAY_SELECT =
  "amount, payment_method, amount_cash, amount_transfer, payment_source, created_at, customer_credits!inner(branch_id, public_ref, sale_id, total_amount)";

const MAX_SALE_IDS_FOR_ITEMS = 400;
const SALE_ITEM_MARGIN_SELECT =
  "sale_id, product_id, quantity, unit_price, discount_percent, discount_amount, products(name, base_cost)";

async function sumUnitsSoldForSales(
  supabase: Awaited<ReturnType<typeof createClient>>,
  saleIds: string[]
): Promise<number> {
  if (saleIds.length === 0) return 0;
  const { data: prevItems } = await supabase
    .from("sale_items")
    .select("quantity")
    .in("sale_id", saleIds.slice(0, MAX_SALE_IDS_FOR_ITEMS));
  return (prevItems ?? []).reduce((sum, row) => sum + Number(row.quantity ?? 0), 0);
}

async function resolveSlowMoverLowStock(
  supabase: Awaited<ReturnType<typeof createClient>>,
  completedSaleIds: string[]
) {
  if (completedSaleIds.length === 0) return [];

  const { data: periodItems } = await supabase
    .from("sale_items")
    .select("product_id, quantity, products(name)")
    .in("sale_id", completedSaleIds.slice(0, MAX_SALE_IDS_FOR_ITEMS));

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

  return Object.values(byProduct)
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
    inventoryMerged,
    defectiveData,
    expensesPeriod,
    warrantiesInPeriod,
    systemActivitiesRes,
    recentSales,
    newCustomers,
    newCustomersPrev,
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
      .eq("branch_id", branchId)
      .in("status", ["pending", "overdue"]),
    supabase
      .from("inventory")
      .select("product_id, quantity, min_stock, products(base_cost, base_price, name)")
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
      .eq("branch_id", branchId)
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
  ]);

  const inventoryRows = (inventoryMerged.data ?? [])
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

  const prevCompletedSaleIds = ((salesPrevDay.data ?? []) as Array<{
    id: string;
    status: string;
    payment_pending?: boolean | null;
  }>)
    .filter((s) => s.status === "completed" && !s.payment_pending)
    .map((s) => s.id);

  const periodCompletedSaleIds = ((salesDay.data ?? []) as Array<{
    id: string;
    status: string;
    payment_pending?: boolean | null;
  }>)
    .filter((s) => s.status === "completed" && !s.payment_pending)
    .map((s) => s.id);

  const completedSaleIdsForSlowMover = lowStock.length === 0 ? periodCompletedSaleIds : [];

  const abonoSaleIds = [
    ...new Set(
      ((creditPaymentsPeriod.data ?? []) as CreditPaymentMarginRow[])
        .filter((p) => p.payment_source !== "warranty_refund")
        .map((p) => {
          const c = p.customer_credits;
          const row = Array.isArray(c) ? c[0] : c;
          return row?.sale_id ? String(row.sale_id) : null;
        })
        .filter((id): id is string => Boolean(id))
    ),
  ].slice(0, MAX_SALE_IDS_FOR_ITEMS);

  const [prevUnitsSold, periodUnitsSold, topProducts, slowMoverRows, periodMarginItemsRes, abonoItemsRes, abonoSalesRes] =
    await Promise.all([
      sumUnitsSoldForSales(supabase, prevCompletedSaleIds),
      sumUnitsSoldForSales(supabase, periodCompletedSaleIds),
      resolveTopSoldProducts(supabase, branchId, start, end, DASHBOARD_CARD_ITEM_LIMIT, {
        skipExtendedLookback: true,
      }).catch((err) => {
        console.error("Error resolving top sold products:", err);
        return [];
      }),
      lowStock.length === 0
        ? resolveSlowMoverLowStock(supabase, completedSaleIdsForSlowMover)
        : Promise.resolve([]),
      supabase
        .from("sale_items")
        .select(
          `${SALE_ITEM_MARGIN_SELECT}, sales!inner(branch_id, created_at, status, payment_pending)`
        )
        .eq("sales.branch_id", branchId)
        .gte("sales.created_at", start)
        .lte("sales.created_at", end)
        .eq("sales.status", "completed")
        .eq("sales.payment_pending", false),
      abonoSaleIds.length > 0
        ? supabase.from("sale_items").select(SALE_ITEM_MARGIN_SELECT).in("sale_id", abonoSaleIds)
        : Promise.resolve({ data: [] as unknown[] }),
      abonoSaleIds.length > 0
        ? supabase.from("sales").select("id, total, delivery_fee").in("id", abonoSaleIds)
        : Promise.resolve({ data: [] as unknown[] }),
    ]);

  if (lowStock.length === 0 && slowMoverRows.length > 0) {
    lowStock = slowMoverRows;
  }

  let periodMarginItems = normalizeSaleItemMarginRows(
    (periodMarginItemsRes.data ?? []) as Parameters<typeof normalizeSaleItemMarginRows>[0]
  );

  if (periodMarginItems.length === 0 && periodCompletedSaleIds.length > 0) {
    const { data: fallbackItems } = await supabase
      .from("sale_items")
      .select(SALE_ITEM_MARGIN_SELECT)
      .in("sale_id", periodCompletedSaleIds.slice(0, MAX_SALE_IDS_FOR_ITEMS));
    periodMarginItems = normalizeSaleItemMarginRows(
      (fallbackItems ?? []) as Parameters<typeof normalizeSaleItemMarginRows>[0]
    );
  }

  const abonoSaleItems = normalizeSaleItemMarginRows(
    (abonoItemsRes.data ?? []) as Parameters<typeof normalizeSaleItemMarginRows>[0]
  );

  const grossMarginPaid = Math.round(grossMarginFromItemRows(periodMarginItems));
  const marginFromAbonos = Math.round(
    computeMarginFromCreditAbonos(
      (creditPaymentsPeriod.data ?? []) as CreditPaymentMarginRow[],
      abonoSaleItems,
      (abonoSalesRes.data ?? []) as Array<{ id: string; total: number; delivery_fee?: number | null }>
    )
  );

  return NextResponse.json(
    {
    salesDay: salesDay.data ?? [],
    salesPrevDay: salesPrevDay.data ?? [],
    expensesPrevDay: expensesPrevDay.data ?? [],
    salesTrendWindow: salesTrendWindow.data ?? [],
    creditPaymentsPeriod: creditPaymentsPeriod.data ?? [],
    creditPaymentsPrev: creditPaymentsPrev.data ?? [],
    creditPaymentsTrend: creditPaymentsTrend.data ?? [],
    customerCreditsBranch: customerCreditsBranch.data ?? [],
    inventoryData: inventoryMerged.data ?? [],
    defectiveData: defectiveData.data ?? [],
    expensesPeriod: expensesPeriod.data ?? [],
    warrantiesInPeriod: warrantiesInPeriod.data ?? [],
    recentSales: recentSales.data ?? [],
    newCustomersCount: newCustomers.count ?? 0,
    newCustomersPrevCount: newCustomersPrev.count ?? 0,
    prevUnitsSold,
    periodUnitsSold,
    grossMarginPaid,
    marginFromAbonos,
    systemActivities: systemActivitiesRes.data ?? [],
    lowStock,
    topProducts,
    },
    {
      headers: {
        "Cache-Control": `private, max-age=${BUNDLE_CACHE_SECONDS}, stale-while-revalidate=${BUNDLE_CACHE_SECONDS * 2}`,
      },
    }
  );
}
