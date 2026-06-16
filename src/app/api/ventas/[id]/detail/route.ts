import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const CACHE_SECONDS = 25;

const SALE_SELECT = `
  id, branch_id, user_id, customer_id, invoice_number, total, payment_method, status,
  payment_pending, is_delivery, delivery_address_id, delivery_fee, delivery_person_id,
  delivery_paid, created_at, channel, public_tracking_token, payment_proof_url,
  cancellation_reason, cancellation_requested_at, cancellation_requested_by,
  customers(name, phone, cedula),
  users!user_id(name),
  delivery_persons(name, code),
  branches(
    name, nit, address, phone, logo_url, responsable_iva, invoice_print_type,
    invoice_cancel_requires_approval, sales_mode, organization_id
  )
`;

const ITEMS_SELECT =
  "id, product_id, quantity, unit_price, discount_percent, discount_amount, quantity_picked, products(name, sku)";

function pickOne<T>(value: T | T[] | null | undefined): T | null {
  if (value == null) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

function buildSalePayload(saleRow: Record<string, unknown>) {
  const br = pickOne(saleRow.branches as Record<string, unknown> | Record<string, unknown>[] | null);
  const branchRow = br as {
    name?: string;
    nit?: string | null;
    address?: string | null;
    phone?: string | null;
    logo_url?: string | null;
    responsable_iva?: boolean | null;
    invoice_print_type?: string | null;
    invoice_cancel_requires_approval?: boolean | null;
    sales_mode?: string | null;
    organization_id?: string | null;
  } | null;

  return {
    sale: {
      id: saleRow.id,
      branch_id: saleRow.branch_id,
      user_id: saleRow.user_id,
      customer_id: saleRow.customer_id,
      invoice_number: saleRow.invoice_number,
      total: saleRow.total,
      payment_method: saleRow.payment_method,
      status: saleRow.status,
      payment_pending: saleRow.payment_pending,
      is_delivery: saleRow.is_delivery,
      delivery_address_id: saleRow.delivery_address_id,
      delivery_fee: saleRow.delivery_fee,
      delivery_person_id: saleRow.delivery_person_id,
      delivery_paid: saleRow.delivery_paid,
      created_at: saleRow.created_at,
      channel: saleRow.channel,
      public_tracking_token: saleRow.public_tracking_token,
      payment_proof_url: saleRow.payment_proof_url,
      cancellation_reason: saleRow.cancellation_reason,
      cancellation_requested_at: saleRow.cancellation_requested_at,
      cancellation_requested_by: saleRow.cancellation_requested_by,
      customers: pickOne(
        saleRow.customers as
          | { name: string; phone: string | null; cedula: string | null }
          | { name: string; phone: string | null; cedula: string | null }[]
          | null
      ),
      users: pickOne(saleRow.users as { name: string } | { name: string }[] | null),
      delivery_persons: pickOne(
        saleRow.delivery_persons as { name: string; code: string } | { name: string; code: string }[] | null
      ),
      branches: branchRow
        ? {
            name: branchRow.name ?? "",
            nit: branchRow.nit ?? null,
            address: branchRow.address ?? null,
            phone: branchRow.phone ?? null,
            logo_url: branchRow.logo_url ?? null,
            responsable_iva: Boolean(branchRow.responsable_iva),
            invoice_print_type: branchRow.invoice_print_type === "tirilla" ? "tirilla" : "block",
            invoice_cancel_requires_approval: Boolean(branchRow.invoice_cancel_requires_approval),
          }
        : null,
    },
    salesMode: branchRow?.sales_mode === "orders" ? "orders" : "sales",
    branchOrgId: branchRow?.organization_id ?? null,
  };
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id: saleId } = await context.params;
  if (!saleId) {
    return NextResponse.json({ error: "ID requerido" }, { status: 400 });
  }

  const extrasOnly = request.nextUrl.searchParams.get("extras") === "1";
  const supabase = await createClient();

  const [{ data: authData }, { data: saleRow, error: saleError }] = await Promise.all([
    supabase.auth.getUser(),
    supabase.from("sales").select(SALE_SELECT).eq("id", saleId).maybeSingle(),
  ]);

  const user = authData.user;
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (saleError) {
    return NextResponse.json({ error: saleError.message }, { status: 500 });
  }
  if (!saleRow) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const branchId = String(saleRow.branch_id ?? "");
  const deliveryAddressId = saleRow.delivery_address_id as string | null;
  const isDelivery = Boolean(saleRow.is_delivery);
  const paymentProofPath = saleRow.payment_proof_url as string | null;

  if (extrasOnly) {
    const [deliveryPersonsRes, signedProofRes] = await Promise.all([
      isDelivery && branchId
        ? supabase
            .from("delivery_persons")
            .select("id, name, code")
            .eq("branch_id", branchId)
            .eq("active", true)
            .order("name")
        : Promise.resolve({ data: [] as unknown[], error: null }),
      paymentProofPath
        ? supabase.storage.from("payment-proofs").createSignedUrl(paymentProofPath, 3600)
        : Promise.resolve({ data: null, error: null }),
    ]);

    return NextResponse.json(
      {
        deliveryPersons: (deliveryPersonsRes.data ?? []) as Array<{ id: string; name: string; code: string }>,
        paymentProofSignedUrl: signedProofRes.data?.signedUrl ?? null,
      },
      {
        headers: {
          "Cache-Control": `private, max-age=${CACHE_SECONDS}, stale-while-revalidate=${CACHE_SECONDS * 2}`,
        },
      }
    );
  }

  const [itemsRes, warrantiesRes, creditRes, addressRes, imeiRes] = await Promise.all([
    supabase.from("sale_items").select(ITEMS_SELECT).eq("sale_id", saleId),
    supabase
      .from("warranties")
      .select("id, created_at")
      .eq("sale_id", saleId)
      .eq("warranty_type", "refund")
      .eq("status", "processed")
      .order("created_at", { ascending: false }),
    supabase
      .from("customer_credits")
      .select("id, public_ref, cancelled_at")
      .eq("sale_id", saleId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    deliveryAddressId
      ? supabase
          .from("customer_addresses")
          .select("id, label, address, reference_point")
          .eq("id", deliveryAddressId)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    supabase
      .from("product_imei_units")
      .select("id, imei, sale_item_id")
      .eq("sale_id", saleId)
      .order("imei"),
  ]);

  const { sale, salesMode, branchOrgId } = buildSalePayload(saleRow as Record<string, unknown>);

  const imeisBySaleItem: Record<string, { id: string; imei: string }[]> = {};
  for (const row of imeiRes.data ?? []) {
    const sid = row.sale_item_id as string | null;
    if (!sid) continue;
    if (!imeisBySaleItem[sid]) imeisBySaleItem[sid] = [];
    imeisBySaleItem[sid].push({ id: row.id as string, imei: row.imei as string });
  }

  const items = (itemsRes.data ?? []).map((item) => {
    const row = item as {
      id: string;
      product_id: string;
      quantity: number;
      unit_price: number;
      discount_percent: number;
      discount_amount: number;
      quantity_picked: number | null;
      products: { name: string; sku: string | null } | { name: string; sku: string | null }[] | null;
    };
    return {
      ...row,
      quantity_picked: row.quantity_picked ?? null,
      products: pickOne(row.products),
      imeis: imeisBySaleItem[row.id] ?? [],
    };
  });

  const warrantyList = (warrantiesRes.data ?? []) as Array<{ id: string; created_at: string }>;

  return NextResponse.json(
    {
      sale,
      items,
      salesMode,
      branchOrgId,
      deliveryAddress: addressRes.data ?? null,
      deliveryPersons: [],
      linkedCredit: creditRes.data?.id
        ? {
            id: String(creditRes.data.id),
            public_ref: String(creditRes.data.public_ref ?? ""),
            cancelled_at: creditRes.data.cancelled_at ?? null,
          }
        : null,
      refundWarrantyProcessedCount: warrantyList.length,
      latestRefundWarrantyId: warrantyList[0]?.id ?? null,
      paymentProofSignedUrl: null,
    },
    {
      headers: {
        "Cache-Control": `private, max-age=${CACHE_SECONDS}, stale-while-revalidate=${CACHE_SECONDS * 2}`,
      },
    }
  );
}
