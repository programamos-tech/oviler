import { NextRequest, NextResponse } from "next/server";
import { escapeSearchForFilter } from "@/lib/escape-search-for-filter";
import {
  buildStockSplitMap,
  matchesStockFilter,
  parseStockStatusOption,
} from "@/lib/inventario-list-filters";
import { assertVentasBranchAccess } from "@/lib/ventas-branch-auth";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const PAGE_SIZE_MAX = 50;
const PRODUCT_SELECT = "id, name, sku, category_id, base_price, base_cost, apply_iva, description";

async function loadCategories(supabase: Awaited<ReturnType<typeof createClient>>, orgId: string) {
  const PAGE = 1000;
  const out: Array<{ id: string; name: string }> = [];
  let from = 0;
  while (true) {
    const { data: cats } = await supabase
      .from("categories")
      .select("id, name")
      .eq("organization_id", orgId)
      .order("display_order", { ascending: true })
      .order("name", { ascending: true })
      .range(from, from + PAGE - 1);
    if (!cats?.length) break;
    out.push(...(cats as Array<{ id: string; name: string }>));
    if (cats.length < PAGE) break;
    from += PAGE;
  }
  return out;
}

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const branchId = sp.get("branchId");
  const page = Math.max(1, parseInt(sp.get("page") ?? "1", 10) || 1);
  const pageSize = Math.min(PAGE_SIZE_MAX, Math.max(1, parseInt(sp.get("pageSize") ?? "20", 10) || 20));
  const search = (sp.get("search") ?? "").trim();
  const categoryId = (sp.get("categoryId") ?? "").trim();
  const stockStatus = sp.get("stockStatus") ?? "all";

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

  const { data: userRow } = await supabase.from("users").select("organization_id").eq("id", user.id).single();
  const orgId = userRow?.organization_id;
  if (!orgId) {
    return NextResponse.json({ error: "Sin organización" }, { status: 400 });
  }

  const stockParsed = parseStockStatusOption(stockStatus);
  const effectiveScope = stockParsed.scope;

  const [{ data: branchRow }, categories] = await Promise.all([
    supabase.from("branches").select("has_bodega").eq("id", branchId).single(),
    loadCategories(supabase, orgId),
  ]);
  const hasBodega = branchRow?.has_bodega !== false;

  let productQuery = supabase
    .from("products")
    .select("id")
    .eq("organization_id", orgId)
    .order("name", { ascending: true });

  if (search) {
    const escaped = escapeSearchForFilter(search);
    productQuery = productQuery.or(`name.ilike.%${escaped}%,sku.ilike.%${escaped}%`);
  }
  if (categoryId) productQuery = productQuery.eq("category_id", categoryId);

  const { data: invAll } = await supabase
    .from("inventory")
    .select("product_id, quantity, location")
    .eq("branch_id", branchId);

  const stockSplitByProduct = buildStockSplitMap(invAll ?? []);

  let products: Array<Record<string, unknown>> = [];
  let totalCount = 0;

  if (stockParsed.kind === "all") {
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    let pageQuery = supabase
      .from("products")
      .select(PRODUCT_SELECT, { count: "exact" })
      .eq("organization_id", orgId)
      .order("name", { ascending: true })
      .range(from, to);
    if (search) {
      const escaped = escapeSearchForFilter(search);
      pageQuery = pageQuery.or(`name.ilike.%${escaped}%,sku.ilike.%${escaped}%`);
    }
    if (categoryId) pageQuery = pageQuery.eq("category_id", categoryId);

    const { data, count, error } = await pageQuery;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    products = (data ?? []) as Array<Record<string, unknown>>;
    totalCount = count ?? 0;
  } else {
    const { data: idRows, error: idErr } = await productQuery;
    if (idErr) return NextResponse.json({ error: idErr.message }, { status: 500 });

    const filteredIds = (idRows ?? [])
      .map((r) => r.id as string)
      .filter((id) => matchesStockFilter(stockSplitByProduct[id], stockParsed.kind, effectiveScope));

    totalCount = filteredIds.length;
    const from = (page - 1) * pageSize;
    const pageIds = filteredIds.slice(from, from + pageSize);

    if (pageIds.length === 0) {
      products = [];
    } else {
      const { data, error } = await supabase
        .from("products")
        .select(PRODUCT_SELECT)
        .in("id", pageIds)
        .order("name", { ascending: true });
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      const byId = new Map((data ?? []).map((p) => [p.id as string, p]));
      products = pageIds.map((id) => byId.get(id)).filter(Boolean) as Array<Record<string, unknown>>;
    }
  }

  return NextResponse.json(
    {
      products,
      stockSplitByProduct,
      categories,
      hasBodega,
      totalCount,
      page,
      pageSize,
      stockScope: hasBodega ? effectiveScope : "total",
    },
    { headers: { "Cache-Control": "private, max-age=20, stale-while-revalidate=40" } }
  );
}
