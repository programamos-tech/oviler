import { NextRequest, NextResponse } from "next/server";
import { assertVentasBranchAccess } from "@/lib/ventas-branch-auth";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const CACHE_SECONDS = 25;

const DETAIL_SELECT = `
  id, sale_id, sale_item_id, branch_id, quantity, customer_id, product_id,
  warranty_type, reason, status, requested_by, reviewed_by, reviewed_at,
  rejection_reason, replacement_product_id, resolution_notes, processed_at, processed_by,
  created_at, updated_at, product_imei_unit_id,
  customers(name),
  products:products!warranties_product_id_fkey(name),
  sales(invoice_number, created_at, branch_id, payment_method, amount_cash, amount_transfer, total),
  sale_items(unit_price, quantity, discount_percent, discount_amount),
  requested_by_user:users!warranties_requested_by_fkey(name),
  reviewed_by_user:users!warranties_reviewed_by_fkey(name),
  processed_by_user:users!processed_by(name),
  replacement_product:products!warranties_replacement_product_id_fkey(name),
  product_imei_unit:product_imei_units(id, imei)
`;

function pickOne<T>(value: T | T[] | null | undefined): T | null {
  if (value == null) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

function warrantyAccessibleInBranch(
  row: { branch_id?: string | null; sales?: { branch_id?: string | null } | { branch_id?: string | null }[] | null },
  branchId: string
): boolean {
  if (String(row.branch_id ?? "") === branchId) return true;
  const sale = pickOne(row.sales);
  return String(sale?.branch_id ?? "") === branchId;
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id: warrantyId } = await context.params;
  const branchId = request.nextUrl.searchParams.get("branchId");

  if (!warrantyId) {
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

  const { data: row, error } = await supabase
    .from("warranties")
    .select(DETAIL_SELECT)
    .eq("id", warrantyId)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!row || !warrantyAccessibleInBranch(row as Record<string, unknown>, branchId)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const w = row as Record<string, unknown>;
  const warranty = {
    ...w,
    customers: pickOne(w.customers as { name: string } | { name: string }[] | null),
    products: pickOne(w.products as { name: string } | { name: string }[] | null),
    sales: pickOne(
      w.sales as
        | {
            invoice_number: string;
            created_at: string;
            branch_id?: string;
            payment_method?: string;
            amount_cash?: number | null;
            amount_transfer?: number | null;
            total?: number;
          }
        | Array<{
            invoice_number: string;
            created_at: string;
            branch_id?: string;
            payment_method?: string;
            amount_cash?: number | null;
            amount_transfer?: number | null;
            total?: number;
          }>
        | null
    ),
    sale_items: pickOne(
      w.sale_items as
        | {
            unit_price: number;
            quantity: number;
            discount_percent?: number;
            discount_amount?: number;
          }
        | Array<{
            unit_price: number;
            quantity: number;
            discount_percent?: number;
            discount_amount?: number;
          }>
        | null
    ),
    requested_by_user: pickOne(w.requested_by_user as { name: string } | { name: string }[] | null),
    reviewed_by_user: pickOne(w.reviewed_by_user as { name: string } | { name: string }[] | null),
    processed_by_user: pickOne(w.processed_by_user as { name: string } | { name: string }[] | null),
    replacement_product: pickOne(
      w.replacement_product as { name: string } | { name: string }[] | null
    ),
    product_imei_unit: pickOne(
      w.product_imei_unit as { id: string; imei: string } | { id: string; imei: string }[] | null
    ),
  };

  return NextResponse.json(
    { warranty },
    {
      headers: {
        "Cache-Control": `private, max-age=${CACHE_SECONDS}, stale-while-revalidate=${CACHE_SECONDS * 2}`,
      },
    }
  );
}
