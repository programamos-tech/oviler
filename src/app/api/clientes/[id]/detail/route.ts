import { NextRequest, NextResponse } from "next/server";
import { assertVentasBranchAccess } from "@/lib/ventas-branch-auth";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const CACHE_SECONDS = 25;
const SALES_LIST_LIMIT = 100;
const TOP_PRODUCTS_SALE_LIMIT = 300;

const CUSTOMER_SELECT =
  "id, name, cedula, email, phone, created_at, customer_addresses(id, label, address, reference_point, is_default, display_order)";

function pickOne<T>(value: T | T[] | null | undefined): T | null {
  if (value == null) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

async function buildTopProducts(
  supabase: Awaited<ReturnType<typeof createClient>>,
  customerId: string,
  branchId: string
) {
  const { data: saleRows } = await supabase
    .from("sales")
    .select("id")
    .eq("customer_id", customerId)
    .eq("branch_id", branchId)
    .order("created_at", { ascending: false })
    .limit(TOP_PRODUCTS_SALE_LIMIT);

  const saleIds = (saleRows ?? []).map((r) => String(r.id)).filter(Boolean);
  if (saleIds.length === 0) return [];

  const { data: itemsData } = await supabase
    .from("sale_items")
    .select("product_id, quantity, products(name)")
    .in("sale_id", saleIds);

  if (!itemsData?.length) return [];

  const byProduct: Record<string, { product_id: string; total_quantity: number; product_name: string }> =
    {};

  for (const row of itemsData as Array<{
    product_id: string;
    quantity: number;
    products: { name: string } | { name: string }[] | null;
  }>) {
    const productId = String(row.product_id ?? "");
    if (!productId) continue;
    const product = pickOne(row.products);
    const name = product?.name ?? "—";
    if (!byProduct[productId]) {
      byProduct[productId] = { product_id: productId, total_quantity: 0, product_name: name };
    }
    byProduct[productId].total_quantity += Number(row.quantity ?? 0);
  }

  return Object.values(byProduct)
    .sort((a, b) => b.total_quantity - a.total_quantity || a.product_name.localeCompare(b.product_name, "es"))
    .slice(0, 10);
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id: customerId } = await context.params;
  const branchId = request.nextUrl.searchParams.get("branchId");
  const extrasOnly = request.nextUrl.searchParams.get("extras") === "1";

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

  const { data: customerRow, error: customerError } = await supabase
    .from("customers")
    .select(CUSTOMER_SELECT)
    .eq("id", customerId)
    .eq("branch_id", branchId)
    .maybeSingle();

  if (customerError) {
    return NextResponse.json({ error: customerError.message }, { status: 500 });
  }
  if (!customerRow) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (extrasOnly) {
    const topProducts = await buildTopProducts(supabase, customerId, branchId);
    return NextResponse.json(
      { topProducts },
      {
        headers: {
          "Cache-Control": `private, max-age=${CACHE_SECONDS}, stale-while-revalidate=${CACHE_SECONDS * 2}`,
        },
      }
    );
  }

  const [salesRes, creditsRes, warrantyTotalRes, warrantyRefundsRes] = await Promise.all([
    supabase
      .from("sales")
      .select("id, invoice_number, total, status, created_at", { count: "exact" })
      .eq("customer_id", customerId)
      .eq("branch_id", branchId)
      .order("created_at", { ascending: false })
      .limit(SALES_LIST_LIMIT),
    supabase
      .from("customer_credits")
      .select(
        "id, public_ref, title, total_amount, amount_paid, due_date, status, cancelled_at, sale_id, sales(invoice_number)"
      )
      .eq("branch_id", branchId)
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false }),
    supabase
      .from("warranties")
      .select("id", { count: "exact", head: true })
      .eq("customer_id", customerId),
    supabase
      .from("warranties")
      .select("id", { count: "exact", head: true })
      .eq("customer_id", customerId)
      .eq("status", "processed")
      .eq("warranty_type", "refund"),
  ]);

  const salesCount = salesRes.count ?? 0;
  const credits = (creditsRes.data ?? []).map((row) => {
    const credit = row as {
      sales: { invoice_number: string } | { invoice_number: string }[] | null;
    };
    return {
      ...row,
      sales: pickOne(credit.sales),
    };
  });

  return NextResponse.json(
    {
      customer: customerRow,
      sales: salesRes.data ?? [],
      salesTruncated: salesCount > SALES_LIST_LIMIT,
      credits,
      warrantySummary: {
        total: warrantyTotalRes.count ?? 0,
        processedRefunds: warrantyRefundsRes.count ?? 0,
      },
      topProducts: [],
    },
    {
      headers: {
        "Cache-Control": `private, max-age=${CACHE_SECONDS}, stale-while-revalidate=${CACHE_SECONDS * 2}`,
      },
    }
  );
}
