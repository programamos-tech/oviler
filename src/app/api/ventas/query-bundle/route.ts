import { NextRequest, NextResponse } from "next/server";
import {
  applySalesListFilters,
  hasSalesDateRange,
  type SalesListPaymentFilter,
  type SalesListStatusFilter,
} from "@/lib/sales-list-filters";
import { assertVentasBranchAccess } from "@/lib/ventas-branch-auth";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const PAGE_SIZE_MAX = 50;
const PAYMENT_TOTALS_LIMIT = 2000;
const TOTALS_WITHOUT_DATE_MAX_COUNT = 800;

const LIST_SELECT =
  "id, branch_id, customer_id, invoice_number, total, payment_method, status, payment_pending, is_delivery, delivery_paid, delivery_fee, created_at, channel, payment_proof_url, amount_cash, amount_transfer, customers(name)";

const TOTALS_SELECT =
  "total, payment_method, amount_cash, amount_transfer, delivery_fee, payment_pending, status";

type SaleTotalsRow = {
  total: number;
  payment_method: string;
  amount_cash: number | null;
  amount_transfer: number | null;
  delivery_fee: number | null;
  payment_pending?: boolean | null;
  status: string;
};

function sumSalesPaymentTotals(rows: SaleTotalsRow[]) {
  let cash = 0;
  let transfer = 0;
  let mixed = 0;
  let countedSales = 0;
  for (const s of rows) {
    if (s.status === "cancelled" || s.payment_pending) continue;
    const income = Math.max(0, Number(s.total) - (Number(s.delivery_fee) || 0));
    const pm = String(s.payment_method ?? "");
    if (pm === "cash") cash += income;
    else if (pm === "transfer") transfer += income;
    else if (pm === "mixed") mixed += income;
    countedSales += 1;
  }
  return { cash, transfer, mixed, countedSales };
}

function buildPaymentTotals(
  totalsRows: SaleTotalsRow[] | null,
  totalCount: number,
  skipped: boolean
) {
  if (skipped) {
    return {
      cash: 0,
      transfer: 0,
      mixed: 0,
      countedSales: 0,
      truncated: false,
      skipped: true,
    };
  }
  if (!totalsRows) return null;
  const summed = sumSalesPaymentTotals(totalsRows);
  return {
    ...summed,
    truncated: totalCount > PAYMENT_TOTALS_LIMIT && totalsRows.length >= PAYMENT_TOTALS_LIMIT,
  };
}

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const branchId = sp.get("branchId");
  const salesMode: "sales" | "orders" = sp.get("salesMode") === "orders" ? "orders" : "sales";
  const page = Math.max(1, parseInt(sp.get("page") ?? "1", 10) || 1);
  const pageSize = Math.min(PAGE_SIZE_MAX, Math.max(1, parseInt(sp.get("pageSize") ?? "20", 10) || 20));
  const search = sp.get("search") ?? "";
  const statusFilter = (sp.get("status") ?? "all") as SalesListStatusFilter;
  const paymentFilter = (sp.get("payment") ?? "all") as SalesListPaymentFilter;
  const dateStart = sp.get("dateStart");
  const dateEnd = sp.get("dateEnd");
  const skipTotals = sp.get("skipTotals") === "1";
  const onlyTotals = sp.get("onlyTotals") === "1";

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

  const filters = {
    branchId,
    salesMode,
    search,
    statusFilter,
    paymentFilter,
    dateStart,
    dateEnd,
  };

  const dateRange = hasSalesDateRange(dateStart, dateEnd);

  if (onlyTotals) {
    const totalCount = Math.max(0, parseInt(sp.get("totalCount") ?? "0", 10) || 0);
    const shouldFetchTotals =
      !skipTotals && (dateRange || totalCount <= TOTALS_WITHOUT_DATE_MAX_COUNT);

    if (!shouldFetchTotals) {
      return NextResponse.json(
        { paymentTotals: buildPaymentTotals(null, totalCount, true) },
        { headers: { "Cache-Control": "private, max-age=15, stale-while-revalidate=30" } }
      );
    }

    const { data: totalsRows, error: totalsError } = await applySalesListFilters(
      supabase.from("sales").select(TOTALS_SELECT),
      filters
    )
      .order("created_at", { ascending: false })
      .limit(PAYMENT_TOTALS_LIMIT);

    if (totalsError) {
      return NextResponse.json({ error: totalsError.message }, { status: 500 });
    }

    return NextResponse.json(
      {
        paymentTotals: buildPaymentTotals(totalsRows as SaleTotalsRow[], totalCount, false),
      },
      { headers: { "Cache-Control": "private, max-age=15, stale-while-revalidate=30" } }
    );
  }

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const listQuery = applySalesListFilters(
    supabase.from("sales").select(LIST_SELECT, { count: "exact" }),
    filters
  )
    .order("created_at", { ascending: false })
    .range(from, to);

  const listResult = await listQuery;

  if (listResult.error) {
    return NextResponse.json({ error: listResult.error.message }, { status: 500 });
  }

  const totalCount = listResult.count ?? 0;
  const shouldFetchTotals =
    !skipTotals && (dateRange || totalCount <= TOTALS_WITHOUT_DATE_MAX_COUNT);

  let paymentTotals: ReturnType<typeof buildPaymentTotals> = null;

  if (shouldFetchTotals) {
    const { data: totalsRows, error: totalsError } = await applySalesListFilters(
      supabase.from("sales").select(TOTALS_SELECT),
      filters
    )
      .order("created_at", { ascending: false })
      .limit(PAYMENT_TOTALS_LIMIT);

    if (!totalsError) {
      paymentTotals = buildPaymentTotals(totalsRows as SaleTotalsRow[], totalCount, false);
    }
  } else if (!skipTotals) {
    paymentTotals = buildPaymentTotals(null, totalCount, true);
  }

  const sales = (listResult.data ?? []).map((s: Record<string, unknown>) => {
    const row = s as {
      customers: { name: string } | { name: string }[] | null;
    };
    const customers = Array.isArray(row.customers) ? row.customers[0] ?? null : row.customers;
    return { ...s, customers };
  });

  return NextResponse.json(
    {
      sales,
      totalCount,
      paymentTotals,
      salesMode,
      page,
      pageSize,
    },
    {
      headers: {
        "Cache-Control": "private, max-age=20, stale-while-revalidate=40",
      },
    }
  );
}
