import { NextRequest, NextResponse } from "next/server";
import {
  applyGarantiasListFilters,
  warrantyMatchesSearch,
  type GarantiasListStatusFilter,
  type GarantiasListTypeFilter,
} from "@/lib/garantias-list-filters";
import { assertVentasBranchAccess } from "@/lib/ventas-branch-auth";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const PAGE_SIZE_MAX = 50;
/** Máximo por vía (branch directo + vía venta) antes de fusionar. */
const MERGE_FETCH_LIMIT = 400;

const LIST_SELECT = `
  id, sale_id, branch_id, quantity, warranty_type, status, created_at,
  customers(name),
  products:products!warranties_product_id_fkey(name),
  sales(invoice_number, created_at, branch_id)
`;

const LIST_SELECT_SALE_BRANCH = LIST_SELECT.replace(
  "sales(invoice_number, created_at, branch_id)",
  "sales!inner(invoice_number, created_at, branch_id)"
);

type WarrantyListRow = {
  id: string;
  sale_id: string | null;
  branch_id: string | null;
  quantity: number;
  warranty_type: string;
  status: string;
  created_at: string;
  customers: { name: string } | { name: string }[] | null;
  products: { name: string } | { name: string }[] | null;
  sales: { invoice_number: string; created_at: string; branch_id?: string | null } | { invoice_number: string; created_at: string; branch_id?: string | null }[] | null;
};

function pickOne<T>(value: T | T[] | null | undefined): T | null {
  if (value == null) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

function normalizeRow(row: WarrantyListRow) {
  return {
    ...row,
    customers: pickOne(row.customers),
    products: pickOne(row.products),
    sales: pickOne(row.sales),
  };
}

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const branchId = sp.get("branchId");
  const page = Math.max(1, parseInt(sp.get("page") ?? "1", 10) || 1);
  const pageSize = Math.min(PAGE_SIZE_MAX, Math.max(1, parseInt(sp.get("pageSize") ?? "20", 10) || 20));
  const search = (sp.get("search") ?? "").trim();
  const statusFilter = (sp.get("status") ?? "all") as GarantiasListStatusFilter;
  const typeFilter = (sp.get("type") ?? "all") as GarantiasListTypeFilter;

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

  const filters = { branchId, statusFilter, typeFilter, search };

  const q1 = applyGarantiasListFilters(
    supabase.from("warranties").select(LIST_SELECT).eq("branch_id", branchId),
    filters
  ).limit(MERGE_FETCH_LIMIT);

  const q2 = applyGarantiasListFilters(
    supabase
      .from("warranties")
      .select(LIST_SELECT_SALE_BRANCH)
      .not("sale_id", "is", null)
      .eq("sales.branch_id", branchId),
    filters
  ).limit(MERGE_FETCH_LIMIT);

  const [{ data: byDirectBranch, error: err1 }, { data: bySaleBranch, error: err2 }] =
    await Promise.all([q1, q2]);

  if (err1 || err2) {
    const message = (err1 ?? err2)?.message ?? "Error al cargar garantías";
    return NextResponse.json({ error: message }, { status: 500 });
  }

  const byId = new Map<string, ReturnType<typeof normalizeRow>>();
  for (const w of (byDirectBranch ?? []) as WarrantyListRow[]) {
    const row = normalizeRow(w);
    if (!byId.has(row.id)) byId.set(row.id, row);
  }
  for (const w of (bySaleBranch ?? []) as WarrantyListRow[]) {
    const row = normalizeRow(w);
    if (!byId.has(row.id)) byId.set(row.id, row);
  }

  let merged = Array.from(byId.values()).sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  if (search) {
    merged = merged.filter((w) => warrantyMatchesSearch(w, search));
  }

  const totalCount = merged.length;
  const from = (page - 1) * pageSize;
  const warranties = merged.slice(from, from + pageSize);

  return NextResponse.json(
    {
      warranties,
      totalCount,
      page,
      pageSize,
      truncated: totalCount >= MERGE_FETCH_LIMIT * 2,
    },
    { headers: { "Cache-Control": "private, max-age=20, stale-while-revalidate=40" } }
  );
}
