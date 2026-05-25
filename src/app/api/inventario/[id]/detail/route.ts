import { NextRequest, NextResponse } from "next/server";
import { buildLocationPath, normalizeProductCategoryName, pickOne } from "@/lib/inventario-normalize";
import { assertVentasBranchAccess } from "@/lib/ventas-branch-auth";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const CACHE_SECONDS = 25;
const STATUSES_THAT_RESERVE = ["pending", "preparing", "packing"];

const PRODUCT_SELECT =
  "id, name, sku, category_id, brand, description, base_price, base_cost, apply_iva, categories(name)";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id: productId } = await context.params;
  const branchId = request.nextUrl.searchParams.get("branchId");

  if (!productId) {
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

  const { data: p, error: productError } = await supabase
    .from("products")
    .select(PRODUCT_SELECT)
    .eq("id", productId)
    .maybeSingle();

  if (productError) {
    return NextResponse.json({ error: productError.message }, { status: 500 });
  }
  if (!p) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const category_name = normalizeProductCategoryName(
    p.categories as { name: string } | { name: string }[] | null
  );

  const [{ data: branchRow }, invRes, reservedRes, { data: ilDataRaw }, branchLocIdsRes] = await Promise.all([
    supabase.from("branches").select("has_bodega").eq("id", branchId).single(),
    supabase.from("inventory").select("quantity, location").eq("product_id", productId).eq("branch_id", branchId),
    supabase
      .from("sale_items")
      .select("quantity, sales!inner(branch_id, status)")
      .eq("product_id", productId)
      .eq("sales.branch_id", branchId)
      .in("sales.status", STATUSES_THAT_RESERVE),
    supabase.from("inventory_locations").select("location_id, quantity").eq("product_id", productId),
    supabase.from("locations").select("id").eq("branch_id", branchId),
  ]);

  const hasBodega = branchRow?.has_bodega !== false;

  let stockLocal = 0;
  let stockBodega = 0;
  for (const r of invRes.data ?? []) {
    const q = r.quantity ?? 0;
    const loc = (r as { location?: string }).location;
    if (loc === "bodega") stockBodega += q;
    else stockLocal += q;
  }
  const stockTotal = stockLocal + stockBodega;

  const stockReserved = (reservedRes.data ?? []).reduce((sum, row) => {
    const raw = row as {
      quantity: number;
      sales: { branch_id: string; status: string } | { branch_id: string; status: string }[] | null;
    };
    const s = Array.isArray(raw.sales) ? raw.sales[0] ?? null : raw.sales;
    if (!s || s.status === "cancelled") return sum;
    return sum + (Number(raw.quantity) || 0);
  }, 0);

  const allowedLocIds = new Set((branchLocIdsRes.data ?? []).map((r: { id: string }) => r.id));
  const ilData = (ilDataRaw ?? []).filter((r) => allowedLocIds.has(r.location_id));
  const locIds = ilData.map((r) => r.location_id).filter(Boolean);

  let locationRows: Array<{ quantity: number; path: string; locationId: string }> = [];

  if (locIds.length > 0) {
    const { data: locs } = await supabase
      .from("locations")
      .select(`
        id,
        name,
        code,
        branch_id,
        level,
        stands (
          name,
          aisles (
            name,
            zones (
              name,
              floors (
                name,
                level,
                warehouses (
                  name
                )
              )
            )
          )
        )
      `)
      .in("id", locIds)
      .eq("branch_id", branchId);

    if (locs) {
      for (const il of ilData) {
        const locRaw = locs.find((l: { id: string }) => l.id === il.location_id);
        if (!locRaw) continue;
        const loc = {
          ...locRaw,
          stands: pickOne((locRaw as { stands?: unknown }).stands),
        };
        const path = buildLocationPath(loc as Parameters<typeof buildLocationPath>[0]);
        if (!path) continue;
        locationRows.push({ quantity: il.quantity, path, locationId: String(locRaw.id) });
      }
    }
  }

  const { categories: _categories, ...productRest } = p as Record<string, unknown>;

  return NextResponse.json(
    {
      product: {
        ...productRest,
        category_name,
      },
      hasBodega,
      stockLocal,
      stockBodega,
      stockTotal,
      stockReserved,
      locationRows,
    },
    {
      headers: {
        "Cache-Control": `private, max-age=${CACHE_SECONDS}, stale-while-revalidate=${CACHE_SECONDS * 2}`,
      },
    }
  );
}
