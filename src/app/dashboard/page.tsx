"use client";

import { useState, useEffect, useMemo, useRef, useTransition } from "react";
import { useSearchParams } from "next/navigation";
import { SearchParamsBoundary } from "@/app/components/SearchParamsBoundary";
import { createClient } from "@/lib/supabase/client";
import { useSession } from "@/app/components/SessionProvider";
import { creditRowPending } from "@/app/creditos/credit-ui";
import { cashTransferFromLine, addCreditPaymentSplits as addCreditPaymentsToCashTransfer } from "@/lib/cash-transfer-from-line";
import BereaReportsDashboard from "@/app/components/dashboard/BereaReportsDashboard";
import { useLocalCalendarToday } from "@/app/components/useLocalCalendarToday";
import {
  filterRowsByCreatedAtRange,
  getLocalCalendarDayBounds,
  isSameLocalCalendarDay,
  startOfLocalCalendarDay,
} from "@/lib/calendar-day-bounds";
import { getExpenseConceptKind } from "@/lib/expense-concept-kind";
import {
  mergeDashboardActivityFeed,
  DASHBOARD_CARD_ITEM_LIMIT,
  type SystemActivityRow,
  type TopSoldProduct,
  computePaymentMix,
  saleChannelLabel,
  storeIncomeFromSale,
  type DashboardActivity,
} from "@/lib/dashboard-berea";

type DashboardData = {
  totalIncome: number; // Total neto en caja/banco (después de egresos)
  totalDeliveryFees: number; // Total envíos (no es ingreso de la tienda)
  unpaidDeliveryFees: number; // Envíos pendientes de pago
  incomeCash: number; // Ingresos por ventas en efectivo (antes de restar egresos)
  incomeTransfer: number; // Ingresos por ventas en transferencia (antes de restar egresos)
  cash: number;
  transfer: number;
  totalExpensesCash: number; // Egresos en efectivo del día
  totalExpensesTransfer: number; // Egresos en transferencia del día
  totalSales: number;
  physicalSales: number;
  deliverySales: number;
  cashSales: number;
  transferSales: number;
  cancelledInvoices: number;
  cancelledTotal: number;
  cancelledList: { invoice_number: string; total: number }[];
  topProducts: { id: string; name: string; units: number; total: number }[];
  last15Days: { day: string; sales: number; previousSales: number }[];
  /** Neto efectivo / transfer / total del día calendario anterior al ancla (para variación %). */
  prevPeriodNetCash: number;
  prevPeriodNetTransfer: number;
  prevPeriodNetTotal: number;
  totalStockInvestment: number;
  defectiveStockInvestment: number;
  expectedProfit: number;
  grossProfit: number;
  netProfit: number;
  warrantiesCount: number;
  warrantiesRefundAmount: number;
  lastExpense: { amount: number; concept: string } | null;
  lastCashSale: { total: number; invoice_number: string } | null;
  lastTransferSale: { total: number; invoice_number: string } | null;
  /** Saldo total pendiente por cobrar en créditos a clientes (esta sucursal). */
  outstandingCredits: number;
  storeIncome: number;
  unitsSold: number;
  newCustomers: number;
  prevStoreIncome: number;
  prevIncomeCash: number;
  prevIncomeTransfer: number;
  prevOrders: number;
  prevUnitsSold: number;
  prevNewCustomers: number;
  recentOrders: Array<{
    id: string;
    invoice_number: string;
    customer_name: string;
    channel_label: string;
    total: number;
    status: string;
    created_at: string;
  }>;
  lowStock: Array<{
    id: string;
    name: string;
    quantity: number;
    min_stock: number;
    kind: "inventory" | "slow_mover";
  }>;
  activities: DashboardActivity[];
  ordersSpark: number[];
  paymentMix: ReturnType<typeof computePaymentMix>;
  totalExpenses: number;
  operationalExpenses: number;
  inventoryExpenses: number;
  dailyResult: number;
  recentExpenses: Array<{
    id: string;
    concept: string;
    conceptKind: "inventory" | "operating";
    amount: number;
    payment_method: "cash" | "transfer";
    created_at: string;
  }>;
};

/** Días mostrados en la tendencia de ingresos (siempre anclada a “hoy” calendario). */
const INCOME_TREND_DAY_COUNT = 7;

const DASHBOARD_BUNDLE_CACHE_MS = 45_000;
const dashboardBundleCache = new Map<string, { at: number; payload: unknown }>();

function dashboardBundleCacheKey(
  branchId: string,
  start: string,
  end: string,
  yStart: string,
  yEnd: string,
  trendStart: string,
  trendEnd: string
) {
  return [branchId, start, end, yStart, yEnd, trendStart, trendEnd].join("|");
}

/** Reporte completo: rango de fechas, bloque inventario/resultado y gráfica de tendencia. Cajero solo ve día a día. */
function hasFullDashboardReports(role: string | null | undefined): boolean {
  const r = String(role ?? "").toLowerCase();
  return r === "owner" || r === "admin" || r === "delivery";
}

const TREND_MONTH_SHORT = [
  "ene",
  "feb",
  "mar",
  "abr",
  "may",
  "jun",
  "jul",
  "ago",
  "sep",
  "oct",
  "nov",
  "dic",
] as const;

/** Etiqueta eje X tipo mock: "12 May" (sin año ni barras). */
function formatTrendAxisDay(d: Date): string {
  const month = TREND_MONTH_SHORT[d.getMonth()];
  const monthLabel = month.charAt(0).toUpperCase() + month.slice(1);
  return `${d.getDate()} ${monthLabel}`;
}

/** Clave estable día calendario local (evita desalineos con toDateString / zona). */
function localDayKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function emptyIncomeTrendDays(): { day: string; sales: number; previousSales: number }[] {
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  const out: { day: string; sales: number; previousSales: number }[] = [];
  for (let i = INCOME_TREND_DAY_COUNT - 1; i >= 0; i--) {
    const d = new Date(t);
    d.setDate(d.getDate() - i);
    out.push({ day: formatTrendAxisDay(d), sales: 0, previousSales: 0 });
  }
  return out;
}

type DaySaleRow = {
  total: number;
  payment_method: string;
  amount_cash: number | null;
  amount_transfer: number | null;
  delivery_fee: number | null;
  status: string;
  payment_pending?: boolean | null;
  created_at: string;
};

type CreditPaymentRow = {
  amount: number;
  payment_method: string;
  amount_cash: number | null;
  amount_transfer: number | null;
  payment_source?: string | null;
  created_at: string;
  customer_credits:
    | { branch_id: string; public_ref: string; sale_id?: string | null; total_amount?: number | string | null }
    | Array<{ branch_id: string; public_ref: string; sale_id?: string | null; total_amount?: number | string | null }>
    | null;
};

function isCreditPaymentCashInflow(p: CreditPaymentRow): boolean {
  return p.payment_source !== "warranty_refund";
}

function creditPublicRef(p: CreditPaymentRow): string {
  const c = p.customer_credits;
  const row = Array.isArray(c) ? c[0] : c;
  return row?.public_ref ?? "—";
}

function netCashTransferFromCompletedSales(completed: DaySaleRow[]): { cash: number; transfer: number } {
  let cash = 0;
  let transfer = 0;
  completed.forEach((s) => {
    if (s.payment_pending) return;
    const deliveryFee = Number(s.delivery_fee) || 0;
    const inc = cashTransferFromLine(Number(s.total), deliveryFee, s.payment_method, s.amount_cash, s.amount_transfer);
    cash += inc.cash;
    transfer += inc.transfer;
  });
  return { cash, transfer };
}

type LastMoveCtx = { total: number; invoice_number: string; at: number };

function pickNewerMove(a: LastMoveCtx | null, b: LastMoveCtx | null): LastMoveCtx | null {
  if (!a) return b;
  if (!b) return a;
  return a.at >= b.at ? a : b;
}

function applyExpensesToCashTransfer(
  expenses: Array<{ amount: number; payment_method: string }>,
  cash: number,
  transfer: number
): { cash: number; transfer: number } {
  let c = cash;
  let t = transfer;
  expenses.forEach((e) => {
    const amount = Number(e.amount) || 0;
    if (e.payment_method === "cash") c -= amount;
    else t -= amount;
  });
  return { cash: c, transfer: t };
}

const IVA_RATE = 0.19;

function getRangeBounds(dateFrom: Date, dateTo: Date): { start: string; end: string } {
  const start = new Date(dateFrom.getFullYear(), dateFrom.getMonth(), dateFrom.getDate(), 0, 0, 0, 0);
  const end = new Date(dateTo.getFullYear(), dateTo.getMonth(), dateTo.getDate(), 23, 59, 59, 999);
  return { start: start.toISOString(), end: end.toISOString() };
}

function firstDayOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function toDateInputValue(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function salePriceFromProduct(basePrice: number | null, applyIva: boolean): number {
  const base = Number(basePrice) ?? 0;
  return applyIva ? base + Math.round(base * IVA_RATE) : base;
}

function warrantySaleLineTotal(
  unitPrice: number,
  lineQty: number,
  discountPercent: number,
  discountAmount: number
): number {
  if (lineQty <= 0) return 0;
  return Math.max(
    0,
    Math.round(
      lineQty * unitPrice * (1 - (Number(discountPercent) || 0) / 100) - (Number(discountAmount) || 0)
    )
  );
}

function DashboardPage() {
  const searchParams = useSearchParams();
  const queryBranchId = searchParams.get("branchId");
  const { branchId, profile, ready: sessionReady, refreshSession } = useSession();
  const [, startDataTransition] = useTransition();
  type DateFilterMode = "today" | "range";

  const [dateFilterMode, setDateFilterMode] = useState<DateFilterMode>("today");
  const [selectedDay, setSelectedDay] = useState<Date>(() => startOfLocalCalendarDay());
  const [pinReportToToday, setPinReportToToday] = useState(true);
  const calendarToday = useLocalCalendarToday();
  const [dateFrom, setDateFrom] = useState<Date>(() => firstDayOfMonth(new Date()));
  const [dateTo, setDateTo] = useState<Date>(() => {
    const t = new Date();
    return new Date(t.getFullYear(), t.getMonth(), t.getDate());
  });
  const [hideSensitiveInfo, setHideSensitiveInfo] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const loadedPeriodKeyRef = useRef<string | null>(null);
  const dashboardRole = profile?.role ?? null;
  const today = calendarToday;

  useEffect(() => {
    if (dateFilterMode !== "today" || !pinReportToToday) return;
    setSelectedDay(calendarToday);
    dashboardBundleCache.clear();
  }, [calendarToday, dateFilterMode, pinReportToToday]);

  useEffect(() => {
    if (queryBranchId && queryBranchId !== branchId) {
      void refreshSession(queryBranchId);
    }
  }, [queryBranchId, branchId, refreshSession]);

  const reportsFullAccess = hasFullDashboardReports(dashboardRole);

  useEffect(() => {
    if (!reportsFullAccess && dateFilterMode === "range") {
      setDateFilterMode("today");
    }
  }, [reportsFullAccess, dateFilterMode]);

  useEffect(() => {
    if (!sessionReady) {
      setLoading(true);
      return;
    }
    if (!branchId) {
      setDashboardData(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    const dateMode = reportsFullAccess ? dateFilterMode : "today";
    const { start, end } =
      dateMode === "today"
        ? getLocalCalendarDayBounds(selectedDay)
        : getRangeBounds(dateFrom, dateTo);
    const anchorForPrevDay = dateMode === "today" ? selectedDay : dateTo;
    const dayBeforeRef = new Date(anchorForPrevDay);
    dayBeforeRef.setDate(dayBeforeRef.getDate() - 1);
    const { start: yStart, end: yEnd } = getLocalCalendarDayBounds(dayBeforeRef);

    const trendWindowEndDay = new Date();
    trendWindowEndDay.setHours(0, 0, 0, 0);
    const trendWindowStart = new Date(trendWindowEndDay);
    trendWindowStart.setDate(trendWindowStart.getDate() - (INCOME_TREND_DAY_COUNT * 2 - 1));
    const { start: trendWindowStartIso, end: trendWindowEndIso } = getRangeBounds(trendWindowStart, trendWindowEndDay);

    const cacheKey = dashboardBundleCacheKey(
      branchId,
      start,
      end,
      yStart,
      yEnd,
      trendWindowStartIso,
      trendWindowEndIso
    );
    const cached = dashboardBundleCache.get(cacheKey);
    const useCache = cached && Date.now() - cached.at < DASHBOARD_BUNDLE_CACHE_MS;
    const periodChanged = loadedPeriodKeyRef.current !== cacheKey;
    if (periodChanged) {
      loadedPeriodKeyRef.current = cacheKey;
      setDashboardData(null);
      setLoading(true);
      setRefreshing(false);
    } else if (useCache) {
      setRefreshing(true);
    } else if (!dashboardData) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }

    (async () => {
      try {
      let bundle: {
        salesDay: unknown[];
        salesPrevDay: unknown[];
        expensesPrevDay: unknown[];
        salesTrendWindow: unknown[];
        creditPaymentsPeriod: unknown[];
        creditPaymentsPrev: unknown[];
        creditPaymentsTrend: unknown[];
        customerCreditsBranch: unknown[];
        inventoryData: unknown[];
        defectiveData: unknown[];
        expensesPeriod: unknown[];
        warrantiesInPeriod: unknown[];
        recentSales: unknown[];
        newCustomersCount: number;
        newCustomersPrevCount: number;
        prevUnitsSold: number;
        systemActivities: SystemActivityRow[];
        lowStock: Array<{
    id: string;
    name: string;
    quantity: number;
    min_stock: number;
    kind: "inventory" | "slow_mover";
  }>;
        topProducts: TopSoldProduct[];
        periodUnitsSold: number;
        grossMarginPaid: number;
        marginFromAbonos: number;
      };

      if (useCache) {
        bundle = cached!.payload as typeof bundle;
      } else {
        const bundleRes = await fetch(
          `/api/dashboard/query-bundle?${new URLSearchParams({
            branchId,
            start,
            end,
            yStart,
            yEnd,
            trendStart: trendWindowStartIso,
            trendEnd: trendWindowEndIso,
          }).toString()}`,
          { credentials: "include", cache: "no-store" }
        );
        if (!bundleRes.ok) throw new Error("No se pudo cargar el dashboard");
        bundle = (await bundleRes.json()) as typeof bundle;
        dashboardBundleCache.set(cacheKey, { at: Date.now(), payload: bundle });
      }

      if (cancelled) return;

      const filterPeriod = <T extends { created_at: string }>(rows: T[]) =>
        filterRowsByCreatedAtRange(rows, start, end);

      const salesDayRaw = bundle.salesDay as Array<{
        id: string;
        total: number;
        payment_method: string;
        amount_cash: number | null;
        amount_transfer: number | null;
        is_delivery: boolean;
        status: string;
        invoice_number: string;
        delivery_fee: number | null;
        delivery_paid: boolean;
        payment_pending?: boolean | null;
        created_at: string;
      }>;
      const salesDay = filterPeriod(salesDayRaw);
      const salesPrevDay = filterRowsByCreatedAtRange(
        bundle.salesPrevDay as DaySaleRow[],
        yStart,
        yEnd
      );
      const expensesPrevDay = bundle.expensesPrevDay as Array<{ amount: number; payment_method: string }>;
      const salesTrendWindow = bundle.salesTrendWindow as Array<{
        total: number;
        created_at: string;
        delivery_fee: number | null;
        payment_pending?: boolean | null;
      }>;
      const creditPaymentsPeriod = filterPeriod(
        bundle.creditPaymentsPeriod as CreditPaymentRow[]
      );
      const creditPaymentsPrev = filterRowsByCreatedAtRange(
        bundle.creditPaymentsPrev as CreditPaymentRow[],
        yStart,
        yEnd
      );
      const creditPaymentsTrend = bundle.creditPaymentsTrend as CreditPaymentRow[];
      const customerCreditsBranch = bundle.customerCreditsBranch;
      const inventoryData = bundle.inventoryData;
      const defectiveData = bundle.defectiveData;
      const expensesPeriod = filterPeriod(
        bundle.expensesPeriod as Array<{
        amount: number;
        payment_method: string;
        concept?: string | null;
        notes?: string | null;
        created_at: string;
      }>
      );
      const warrantiesInPeriod = filterPeriod(
        bundle.warrantiesInPeriod as Array<{
          branch_id?: string | null;
          warranty_type?: string | null;
          created_at: string;
          sales?: { branch_id?: string | null }[] | { branch_id?: string | null } | null;
        }>
      );

      const recentSalesRaw = filterPeriod(
        (bundle.recentSales ?? []) as Array<{
          id: string;
          invoice_number: string;
          total: number;
          status: string;
          is_delivery?: boolean | null;
          channel?: string | null;
          payment_pending?: boolean | null;
          delivery_fee?: number | null;
          created_at: string;
          customers?: { name: string } | Array<{ name: string }> | null;
        }>
      );

      const systemActivitiesFiltered = filterPeriod(
        (bundle.systemActivities ?? []) as SystemActivityRow[]
      );

      const outstandingCredits = ((customerCreditsBranch ?? []) as Array<{
        total_amount: number;
        amount_paid: number;
        cancelled_at: string | null;
        status: string;
      }>).reduce((sum, r) => {
        const cancelled = Boolean(r.cancelled_at) || r.status === "cancelled";
        return (
          sum +
          creditRowPending(Number(r.total_amount), Number(r.amount_paid), cancelled)
        );
      }, 0);

      const sales = (salesDay ?? []) as Array<{
        id: string;
        total: number;
        payment_method: string;
        amount_cash: number | null;
        amount_transfer: number | null;
        is_delivery: boolean;
        status: string;
        invoice_number: string;
        delivery_fee: number | null;
        delivery_paid: boolean;
        payment_pending?: boolean | null;
        created_at: string;
      }>;
      const completed = sales.filter((s) => s.status === "completed");

      const completedPrev = ((salesPrevDay ?? []) as DaySaleRow[]).filter((s) => s.status === "completed");
      let prevNet = netCashTransferFromCompletedSales(completedPrev);
      prevNet = addCreditPaymentsToCashTransfer(
        (creditPaymentsPrev ?? []) as CreditPaymentRow[],
        prevNet.cash,
        prevNet.transfer
      );
      prevNet = applyExpensesToCashTransfer(
        (expensesPrevDay ?? []) as Array<{ amount: number; payment_method: string }>,
        prevNet.cash,
        prevNet.transfer
      );
      const prevPeriodNetCash = prevNet.cash;
      const prevPeriodNetTransfer = prevNet.transfer;
      const prevPeriodNetTotal = prevPeriodNetCash + prevPeriodNetTransfer;

      // Calcular ingresos tienda (sin delivery fees) y delivery fees por separado
      let totalStoreIncome = 0;
      let totalDeliveryFees = 0;
      let unpaidDeliveryFees = 0;
      let cash = 0;
      let transfer = 0;
      let cashSales = 0;
      let transferSales = 0;
      completed.forEach((s) => {
        const deliveryFee = Number(s.delivery_fee) || 0;
        const saleAmount = Number(s.total) - deliveryFee; // Ingreso real de la tienda
        const pending = Boolean(s.payment_pending);
        if (!pending) {
          totalStoreIncome += saleAmount;
        }
        totalDeliveryFees += deliveryFee;
        // Calcular envíos pendientes (no pagados)
        if (deliveryFee > 0 && !s.delivery_paid) {
          unpaidDeliveryFees += deliveryFee;
        }

        if (pending) return;

        const inc = cashTransferFromLine(
          Number(s.total),
          deliveryFee,
          s.payment_method,
          s.amount_cash,
          s.amount_transfer
        );
        cash += inc.cash;
        transfer += inc.transfer;

        if (s.payment_method === "cash") {
          cashSales += 1;
        } else if (s.payment_method === "transfer") {
          transferSales += 1;
        } else if (s.payment_method === "mixed") {
          const ac = Number(s.amount_cash ?? 0);
          const at = Number(s.amount_transfer ?? 0);
          const sumMixed = ac + at;
          if (sumMixed > 0 && Math.abs(sumMixed - Number(s.total)) < 0.01) {
            if (ac > 0) cashSales += 1;
            if (at > 0) transferSales += 1;
          } else if (sumMixed > 0) {
            if (ac > 0) cashSales += 1;
            if (at > 0) transferSales += 1;
          } else {
            cashSales += 1;
          }
        }
      });

      const abonosPeriod = (creditPaymentsPeriod ?? []) as CreditPaymentRow[];
      const abonosAdded = addCreditPaymentsToCashTransfer(abonosPeriod, cash, transfer);
      cash = abonosAdded.cash;
      transfer = abonosAdded.transfer;
      abonosPeriod.forEach((p) => {
        if (!isCreditPaymentCashInflow(p)) return;
        if (p.payment_method === "cash") {
          cashSales += 1;
        } else if (p.payment_method === "transfer") {
          transferSales += 1;
        } else if (p.payment_method === "mixed") {
          if (Number(p.amount_cash ?? 0) > 0) cashSales += 1;
          if (Number(p.amount_transfer ?? 0) > 0) transferSales += 1;
        }
      });

      const incomeCash = cash;
      const incomeTransfer = transfer;

      // Egresos del período (tabla expenses): restar de efectivo/transferencia
      let totalExpensesCash = 0;
      let totalExpensesTransfer = 0;
      const expenseRowsPeriod = (expensesPeriod ?? []) as Array<{
        id: string;
        amount: number;
        payment_method: string;
        concept?: string | null;
        notes?: string | null;
        created_at: string;
      }>;
      let totalExpenses = 0;
      let operationalExpenses = 0;
      let inventoryExpenses = 0;
      let warrantiesRefundAmount = 0;
      expenseRowsPeriod.forEach((e) => {
        const amount = Number(e.amount) || 0;
        const concept = String(e.concept ?? "");
        const notes = String(e.notes ?? "");
        const isWarrantyRefund =
          concept.startsWith("Devolución garantía ") ||
          notes === "Reembolso automático al procesar garantía tipo devolución.";
        if (isWarrantyRefund) warrantiesRefundAmount += amount;
        if (!isWarrantyRefund) {
          if (getExpenseConceptKind(concept) === "inventory") inventoryExpenses += amount;
          else operationalExpenses += amount;
        }
        totalExpenses += amount;
        if (e.payment_method === "cash") {
          totalExpensesCash += amount;
          cash -= amount;
        } else {
          totalExpensesTransfer += amount;
          transfer -= amount;
        }
      });

      const recentExpenses = expenseRowsPeriod
        .slice()
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, DASHBOARD_CARD_ITEM_LIMIT)
        .map((e) => ({
          id: e.id,
          concept: String(e.concept ?? "Egreso"),
          conceptKind: getExpenseConceptKind(String(e.concept ?? "")),
          amount: Number(e.amount) || 0,
          payment_method: (e.payment_method === "transfer" ? "transfer" : "cash") as "cash" | "transfer",
          created_at: e.created_at,
        }));

      const lastExpRow = expenseRowsPeriod
        .slice()
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];
      const lastExpense: { amount: number; concept: string } | null =
        lastExpRow && lastExpRow.amount != null
          ? { amount: Number(lastExpRow.amount), concept: String(lastExpRow.concept ?? "") }
          : null;

      // Último movimiento efectivo / transfer: ventas cobradas o abonos a crédito
      const completedByDate = [...completed].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      const lastCashSale = completedByDate.find(
        (s) =>
          !s.payment_pending &&
          (s.payment_method === "cash" || (s.payment_method === "mixed" && Number(s.amount_cash ?? 0) > 0))
      );
      const lastTransferSale = completedByDate.find(
        (s) =>
          !s.payment_pending &&
          (s.payment_method === "transfer" || (s.payment_method === "mixed" && Number(s.amount_transfer ?? 0) > 0))
      );
      const fromSaleCash: LastMoveCtx | null = lastCashSale
        ? {
            total:
              lastCashSale.payment_method === "cash"
                ? Number(lastCashSale.total)
                : Number(lastCashSale.amount_cash ?? 0),
            invoice_number: lastCashSale.invoice_number,
            at: new Date(lastCashSale.created_at).getTime(),
          }
        : null;
      const fromSaleTransfer: LastMoveCtx | null = lastTransferSale
        ? {
            total:
              lastTransferSale.payment_method === "transfer"
                ? Number(lastTransferSale.total)
                : Number(lastTransferSale.amount_transfer ?? 0),
            invoice_number: lastTransferSale.invoice_number,
            at: new Date(lastTransferSale.created_at).getTime(),
          }
        : null;

      const abonosForLastMove = abonosPeriod.filter(isCreditPaymentCashInflow);
      const abonosSorted = [...abonosForLastMove].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      const lastAbonoCashRow = abonosSorted.find(
        (p) => p.payment_method === "cash" || (p.payment_method === "mixed" && Number(p.amount_cash ?? 0) > 0)
      );
      const lastAbonoTransferRow = abonosSorted.find(
        (p) => p.payment_method === "transfer" || (p.payment_method === "mixed" && Number(p.amount_transfer ?? 0) > 0)
      );
      const fromAbonoCash: LastMoveCtx | null = lastAbonoCashRow
        ? {
            total:
              lastAbonoCashRow.payment_method === "cash"
                ? Number(lastAbonoCashRow.amount)
                : Number(lastAbonoCashRow.amount_cash ?? 0),
            invoice_number: `Abono ${creditPublicRef(lastAbonoCashRow)}`,
            at: new Date(lastAbonoCashRow.created_at).getTime(),
          }
        : null;
      const fromAbonoTransfer: LastMoveCtx | null = lastAbonoTransferRow
        ? {
            total:
              lastAbonoTransferRow.payment_method === "transfer"
                ? Number(lastAbonoTransferRow.amount)
                : Number(lastAbonoTransferRow.amount_transfer ?? 0),
            invoice_number: `Abono ${creditPublicRef(lastAbonoTransferRow)}`,
            at: new Date(lastAbonoTransferRow.created_at).getTime(),
          }
        : null;

      const pickedCash = pickNewerMove(fromSaleCash, fromAbonoCash);
      const pickedTransfer = pickNewerMove(fromSaleTransfer, fromAbonoTransfer);
      const lastCashSaleDisplay = pickedCash
        ? { total: pickedCash.total, invoice_number: pickedCash.invoice_number }
        : null;
      const lastTransferSaleDisplay = pickedTransfer
        ? { total: pickedTransfer.total, invoice_number: pickedTransfer.invoice_number }
        : null;

      const totalIncome = cash + transfer; // Total neto tras restar egresos
      const physicalSales = completed.filter((s) => !s.is_delivery).length;
      const deliverySales = completed.filter((s) => s.is_delivery).length;
      const cancelledSales = sales.filter((s) => s.status === "cancelled");
      const cancelledTotal = cancelledSales.reduce((a, s) => a + Number(s.total), 0);
      const cancelledList = cancelledSales.map((s) => ({ invoice_number: s.invoice_number, total: Number(s.total) }));

      const byDay: Record<string, number> = {};
      // Últimos N días calendario desde hoy (independiente del filtro del resto del dashboard)
      (salesTrendWindow ?? []).forEach(
        (s: { total: number; created_at: string; delivery_fee: number | null; payment_pending?: boolean | null }) => {
          if (s.payment_pending) return;
          const saleDate = new Date(s.created_at);
          saleDate.setHours(0, 0, 0, 0);
          const key = localDayKey(saleDate);
          const deliveryFee = Number(s.delivery_fee) || 0;
          const storeIncome = Number(s.total) - deliveryFee; // Solo ingresos tienda (sin delivery)
          byDay[key] = (byDay[key] ?? 0) + storeIncome;
        }
      );
      (creditPaymentsTrend ?? []).forEach((p: CreditPaymentRow) => {
        if (!isCreditPaymentCashInflow(p)) return;
        const d = new Date(p.created_at);
        d.setHours(0, 0, 0, 0);
        const key = localDayKey(d);
        byDay[key] = (byDay[key] ?? 0) + Number(p.amount);
      });
      const last15Days: { day: string; sales: number; previousSales: number }[] = [];
      for (let i = 0; i < INCOME_TREND_DAY_COUNT; i++) {
        const dCurrent = new Date(trendWindowEndDay);
        dCurrent.setHours(0, 0, 0, 0);
        dCurrent.setDate(dCurrent.getDate() - (INCOME_TREND_DAY_COUNT - 1 - i));
        const dPrevious = new Date(dCurrent);
        dPrevious.setDate(dPrevious.getDate() - 7);
        const keyCurrent = localDayKey(dCurrent);
        const keyPrevious = localDayKey(dPrevious);
        last15Days.push({
          day: formatTrendAxisDay(dCurrent),
          sales: byDay[keyCurrent] ?? 0,
          previousSales: byDay[keyPrevious] ?? 0,
        });
      }

      const topProducts = (bundle.topProducts ?? []).slice(0, DASHBOARD_CARD_ITEM_LIMIT);

      const unitsSold = Number(bundle.periodUnitsSold ?? 0);

      let prevStoreIncome = 0;
      completedPrev.forEach((s) => {
        if (s.payment_pending) return;
        prevStoreIncome += storeIncomeFromSale(s);
      });

      let prevIncomeGross = netCashTransferFromCompletedSales(completedPrev);
      prevIncomeGross = addCreditPaymentsToCashTransfer(
        (creditPaymentsPrev ?? []).filter(isCreditPaymentCashInflow),
        prevIncomeGross.cash,
        prevIncomeGross.transfer
      );
      const prevIncomeCash = prevIncomeGross.cash;
      const prevIncomeTransfer = prevIncomeGross.transfer;

      const ordersByDay: Record<string, number> = {};
      (salesTrendWindow ?? []).forEach((s) => {
        const row = s as { created_at: string; payment_pending?: boolean | null };
        if (row.payment_pending) return;
        const d = new Date(row.created_at);
        d.setHours(0, 0, 0, 0);
        const key = localDayKey(d);
        ordersByDay[key] = (ordersByDay[key] ?? 0) + 1;
      });
      const ordersSpark: number[] = [];
      for (let i = 0; i < INCOME_TREND_DAY_COUNT; i++) {
        const d = new Date(trendWindowStart);
        d.setDate(d.getDate() + i);
        ordersSpark.push(ordersByDay[localDayKey(d)] ?? 0);
      }

      const paymentMix = computePaymentMix(
        completed,
        abonosPeriod.filter(isCreditPaymentCashInflow)
      );
      const newCustomers = Number(bundle.newCustomersCount ?? 0);
      const lowStock = bundle.lowStock ?? [];

      const recentOrders = recentSalesRaw.slice(0, DASHBOARD_CARD_ITEM_LIMIT).map((s) => {
        const c = s.customers;
        const customer_name = (Array.isArray(c) ? c[0]?.name : c?.name) ?? "Cliente";
        return {
          id: s.id,
          invoice_number: s.invoice_number,
          customer_name,
          channel_label: saleChannelLabel(s),
          total: storeIncomeFromSale(s),
          status: s.status,
          created_at: s.created_at,
        };
      });

      const warrantiesForFeed = (
        (warrantiesInPeriod ?? []) as Array<{
          id: string;
          branch_id?: string | null;
          warranty_type?: string | null;
          created_at?: string;
          sales?: { branch_id?: string | null }[] | { branch_id?: string | null } | null;
        }>
      )
        .filter((w) => {
          const saleRow = Array.isArray(w.sales) ? (w.sales[0] || null) : w.sales;
          const saleBranchId = saleRow?.branch_id ?? null;
          return (w.branch_id ?? null) === branchId || saleBranchId === branchId;
        })
        .map((w) => ({
          id: String(w.id),
          warranty_type: w.warranty_type ?? null,
          created_at: String(w.created_at ?? new Date().toISOString()),
        }));

      const activities = mergeDashboardActivityFeed({
        systemActivities: systemActivitiesFiltered,
        sales: recentSalesRaw,
        creditPayments: abonosPeriod.filter(isCreditPaymentCashInflow),
        expenses: expenseRowsPeriod,
        warranties: warrantiesForFeed,
        limit: DASHBOARD_CARD_ITEM_LIMIT,
      });

      const inventory = ((inventoryData ?? []) as Array<{
        product_id: string;
        quantity: number;
        products: { base_cost: number | null; base_price: number | null }[] | { base_cost: number | null; base_price: number | null } | null;
      }>).map((inv) => ({
        ...inv,
        products: Array.isArray(inv.products) ? (inv.products[0] || null) : inv.products,
      }));
      const defectiveProducts = ((defectiveData ?? []) as Array<{
        product_id: string;
        quantity: number;
        products: { base_cost: number | null }[] | { base_cost: number | null } | null;
      }>).map((def) => ({
        ...def,
        products: Array.isArray(def.products) ? (def.products[0] || null) : def.products,
      }));
      
      // Stock disponible (inventory)
      const availableStockInvestment = inventory.reduce((sum, inv) => {
        const cost = Number(inv.products?.base_cost ?? 0);
        const qty = Number(inv.quantity ?? 0);
        return sum + cost * qty;
      }, 0);
      
      // Stock defectuoso (defective_products)
      const defectiveStockInvestment = defectiveProducts.reduce((sum, def) => {
        const cost = Number(def.products?.base_cost ?? 0);
        const qty = Number(def.quantity ?? 0);
        return sum + cost * qty;
      }, 0);
      
      // Stock total (disponible + defectuoso)
      const totalStockInvestment = availableStockInvestment + defectiveStockInvestment;
      
      const expectedProfit = inventory.reduce((sum, inv) => {
        const cost = Number(inv.products?.base_cost ?? 0);
        const price = Number(inv.products?.base_price ?? 0);
        const qty = Number(inv.quantity ?? 0);
        if (price > 0 && cost > 0) {
          return sum + (price - cost) * qty;
        }
        return sum;
      }, 0);

      const totalExpensesDay = totalExpensesCash + totalExpensesTransfer;

      const hasPeriodMarginActivity =
        completed.some((s) => !s.payment_pending) ||
        abonosPeriod.some(isCreditPaymentCashInflow);
      const grossProfit = hasPeriodMarginActivity
        ? Math.round(Number(bundle.grossMarginPaid ?? 0) + Number(bundle.marginFromAbonos ?? 0))
        : 0;
      const dailyResult = Math.round(grossProfit - operationalExpenses);
      const netProfit = Math.round(totalIncome);

      // Garantías gestionadas en el período (cargadas en el Promise.all inicial)
      let warrantiesCount = 0;
      warrantiesCount = (warrantiesInPeriod ?? []).filter(
        (w: { branch_id?: string | null; sales?: { branch_id?: string | null }[] | { branch_id?: string | null } | null }) => {
          const saleRow = Array.isArray(w.sales) ? (w.sales[0] || null) : w.sales;
          const saleBranchId = saleRow?.branch_id ?? null;
          return (w.branch_id ?? null) === branchId || saleBranchId === branchId;
        }
      ).length;

      setDashboardData({
        totalIncome,
        totalDeliveryFees,
        unpaidDeliveryFees,
        incomeCash,
        incomeTransfer,
        cash,
        transfer,
        totalExpensesCash,
        totalExpensesTransfer,
        totalSales: completed.length,
        physicalSales,
        deliverySales,
        cashSales,
        transferSales,
        cancelledInvoices: cancelledSales.length,
        cancelledTotal,
        cancelledList,
        topProducts,
        last15Days,
        prevPeriodNetCash,
        prevPeriodNetTransfer,
        prevPeriodNetTotal,
        totalStockInvestment,
        defectiveStockInvestment,
        expectedProfit,
        grossProfit,
        netProfit,
        warrantiesCount,
        warrantiesRefundAmount,
        lastExpense,
        lastCashSale: lastCashSaleDisplay,
        lastTransferSale: lastTransferSaleDisplay,
        outstandingCredits,
        storeIncome: totalStoreIncome,
        unitsSold,
        newCustomers,
        prevStoreIncome,
        prevIncomeCash,
        prevIncomeTransfer,
        prevOrders: completedPrev.length,
        prevUnitsSold: Number(bundle.prevUnitsSold ?? 0),
        prevNewCustomers: Number(bundle.newCustomersPrevCount ?? 0),
        recentOrders,
        lowStock,
        activities,
        ordersSpark,
        paymentMix,
        totalExpenses,
        operationalExpenses,
        inventoryExpenses,
        dailyResult,
        recentExpenses,
      });
      } catch (err) {
        console.error("[dashboard] Error cargando datos", err);
        if (!cancelled) setDashboardData(null);
      } finally {
        if (!cancelled) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [branchId, sessionReady, dateFilterMode, selectedDay, dateFrom, dateTo, refreshKey, reportsFullAccess]);

  const effectiveDateMode = reportsFullAccess ? dateFilterMode : "today";

  const data = useMemo((): DashboardData => {
    if (dashboardData) return dashboardData;
    return {
      totalIncome: 0,
      totalDeliveryFees: 0,
      unpaidDeliveryFees: 0,
      incomeCash: 0,
      incomeTransfer: 0,
      cash: 0,
      transfer: 0,
      totalExpensesCash: 0,
      totalExpensesTransfer: 0,
      totalSales: 0,
      physicalSales: 0,
      deliverySales: 0,
      cashSales: 0,
      transferSales: 0,
      cancelledInvoices: 0,
      cancelledTotal: 0,
      cancelledList: [],
      topProducts: [],
      last15Days: emptyIncomeTrendDays(),
      prevPeriodNetCash: 0,
      prevPeriodNetTransfer: 0,
      prevPeriodNetTotal: 0,
      totalStockInvestment: 0,
      defectiveStockInvestment: 0,
      expectedProfit: 0,
      grossProfit: 0,
      netProfit: 0,
      warrantiesCount: 0,
      warrantiesRefundAmount: 0,
      lastExpense: null,
      lastCashSale: null,
      lastTransferSale: null,
      outstandingCredits: 0,
      storeIncome: 0,
      unitsSold: 0,
      newCustomers: 0,
      prevStoreIncome: 0,
      prevIncomeCash: 0,
      prevIncomeTransfer: 0,
      prevOrders: 0,
      prevUnitsSold: 0,
      prevNewCustomers: 0,
      recentOrders: [],
      lowStock: [],
      activities: [],
      ordersSpark: [],
      paymentMix: computePaymentMix([]),
      totalExpenses: 0,
      operationalExpenses: 0,
      inventoryExpenses: 0,
      dailyResult: 0,
      recentExpenses: [],
    };
  }, [dashboardData]);

  const formatSensitiveValue = (value: number | string, type: "currency" | "number" = "currency") => {
    if (hideSensitiveInfo) {
      return type === "currency" ? "***" : "***";
    }
    if (type === "currency") {
      return `$${typeof value === "number" ? value.toLocaleString("es-CO") : value}`;
    }
    return typeof value === "number" ? value.toLocaleString("es-CO") : value;
  };

  const showHeroDeltas =
    effectiveDateMode === "today" ||
    (effectiveDateMode === "range" && dateFrom.getTime() === dateTo.getTime());

  const displayName = profile?.name?.trim() || "equipo";

  return (
    <div className="mx-auto min-w-0 max-w-[1600px]">
      <BereaReportsDashboard
        loading={loading && !dashboardData}
        refreshing={refreshing}
        hideSensitive={hideSensitiveInfo}
        onToggleHideSensitive={() => setHideSensitiveInfo((v) => !v)}
        onRefresh={() => {
          dashboardBundleCache.clear();
          setRefreshKey((k) => k + 1);
        }}
        userName={displayName}
        reportsFullAccess={reportsFullAccess}
        dateFilterMode={effectiveDateMode}
        onDateFilterMode={(mode) =>
          startDataTransition(() => {
            setDateFilterMode(mode);
            if (mode === "today") {
              setPinReportToToday(true);
              setSelectedDay(calendarToday);
            }
          })
        }
        selectedDay={selectedDay}
        onSelectedDay={(d) =>
          startDataTransition(() => {
            const day = startOfLocalCalendarDay(d);
            setSelectedDay(day);
            setPinReportToToday(isSameLocalCalendarDay(day, calendarToday));
          })
        }
        isViewingCalendarToday={
          effectiveDateMode === "today" && isSameLocalCalendarDay(selectedDay, calendarToday)
        }
        dateFrom={dateFrom}
        dateTo={dateTo}
        onDateFrom={(d) => startDataTransition(() => setDateFrom(d))}
        onDateTo={(d) => startDataTransition(() => setDateTo(d))}
        today={today}
        showDeltas={showHeroDeltas}
        formatValue={formatSensitiveValue}
        kpis={{
          sales: data.storeIncome,
          salesPrev: data.prevStoreIncome,
          grossProfit: data.grossProfit,
          cash: data.cash,
          cashCollected: data.incomeCash,
          cashExpenses: data.totalExpensesCash,
          cashPrev: data.prevPeriodNetCash,
          transfer: data.transfer,
          transferCollected: data.incomeTransfer,
          transferExpenses: data.totalExpensesTransfer,
          transferPrev: data.prevPeriodNetTransfer,
          netCashTotal: data.totalIncome,
          stockInvestment: data.totalStockInvestment,
          salesSpark: data.last15Days.map((d) => d.sales),
          cashSpark: data.last15Days.map((d) => d.sales),
          transferSpark: data.last15Days.map((d) => d.sales),
        }}
        paymentMix={data.paymentMix}
        trendDays={data.last15Days}
        recentOrders={data.recentOrders}
        topProducts={data.topProducts}
        activities={data.activities}
        totalExpenses={data.totalExpenses}
        operationalExpenses={data.operationalExpenses}
        inventoryExpenses={data.inventoryExpenses}
        recentExpenses={data.recentExpenses}
      />
    </div>
  );
}

// Componente Modal de Cierre de Caja
function CashCloseModal({
  isOpen,
  onClose,
  selectedDate,
  branchId,
  onSave,
  saving,
  hideSensitiveInfo,
}: {
  isOpen: boolean;
  onClose: () => void;
  selectedDate: Date;
  branchId: string | null;
  onSave: (closingData?: {
    expectedCash: number;
    expectedTransfer: number;
    actualCash: string;
    actualTransfer: string;
    totalSales: number;
    physicalSales: number;
    deliverySales: number;
    totalUnits: number;
    cancelledInvoices: number;
    cancelledTotal: number;
    warranties: number;
    notes?: string;
    differenceReason?: string;
  }) => Promise<void>;
  saving: boolean;
  hideSensitiveInfo: boolean;
}) {
  const [cashCloseData, setCashCloseData] = useState<{
    cash: number;
    transfer: number;
    cancelledInvoices: number;
    cancelledTotal: number;
    warranties: number;
    products: Array<{ name: string; quantity: number; total: number }>;
    totalSales: number;
    physicalSales: number;
    deliverySales: number;
    totalUnits: number;
    cashPercentage: number;
    transferPercentage: number;
    warrantyEgressCash: number;
    warrantyEgressTransfer: number;
    expenseEgressCash: number;
    expenseEgressTransfer: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [actualCash, setActualCash] = useState("");
  const [actualTransfer, setActualTransfer] = useState("");
  const [differenceReason, setDifferenceReason] = useState("");
  const [lowStockProducts, setLowStockProducts] = useState<Array<{ name: string; quantity: number; min_stock: number }>>([]);
  const [outOfStockProducts, setOutOfStockProducts] = useState<Array<{ name: string }>>([]);
  const [checkedItems, setCheckedItems] = useState<{
    cash: boolean;
    transfer: boolean;
    totalSales: boolean;
    totalUnits: boolean;
    cancelledInvoices: boolean;
    warranties: boolean;
    products: Record<number, boolean>;
  }>({
    cash: false,
    transfer: false,
    totalSales: false,
    totalUnits: false,
    cancelledInvoices: false,
    warranties: false,
    products: {},
  });

  useEffect(() => {
    if (!isOpen || !branchId) return;
    // Reset checkboxes when modal opens
    setCheckedItems({
      cash: false,
      transfer: false,
      totalSales: false,
      totalUnits: false,
      cancelledInvoices: false,
      warranties: false,
      products: {},
    });
    setActualCash("");
    setActualTransfer("");
    setDifferenceReason("");
    const supabase = createClient();
    let cancelled = false;

    (async () => {
      setLoading(true);
      const { start, end } = getLocalCalendarDayBounds(selectedDate);

      const creditPaySelectClose =
        "amount, payment_method, amount_cash, amount_transfer, payment_source, created_at, customer_credits!inner(branch_id, public_ref)";

      const [{ data: salesDay }, { data: creditPaymentsCloseDay }] = await Promise.all([
        supabase
          .from("sales")
          .select(
            "id, total, payment_method, amount_cash, amount_transfer, status, invoice_number, is_delivery, delivery_fee, payment_pending, created_at"
          )
          .eq("branch_id", branchId)
          .gte("created_at", start)
          .lte("created_at", end),
        supabase
          .from("credit_payments")
          .select(creditPaySelectClose)
          .eq("customer_credits.branch_id", branchId)
          .gte("created_at", start)
          .lte("created_at", end),
      ]);

      if (cancelled) return;

      const sales = (salesDay ?? []) as Array<{
        id: string;
        total: number;
        payment_method: string;
        amount_cash: number | null;
        amount_transfer: number | null;
        status: string;
        invoice_number: string;
        is_delivery: boolean;
        delivery_fee: number | null;
        payment_pending?: boolean | null;
        created_at: string;
      }>;

      const completed = sales.filter((s) => s.status === "completed");
      const completedIds = completed.map((s) => s.id);

      let itemsDay: { data: Array<{
        product_id: string;
        quantity: number;
        unit_price: number;
        discount_percent: number;
        discount_amount: number;
        products: { name: string } | null;
      }> | null } = { data: [] };

      if (completedIds.length > 0 && branchId) {
        const { data: items, error } = await supabase
          .from("sale_items")
          .select("product_id, quantity, unit_price, discount_percent, discount_amount, products(name)")
          .in("sale_id", completedIds);
        if (error) {
          console.error("Error fetching sale_items:", error);
        }
        itemsDay = { 
          data: ((items ?? []) as Array<{
            product_id: string;
            quantity: number;
            unit_price: number;
            discount_percent: number;
            discount_amount: number;
            products: { name: string }[] | { name: string } | null;
          }>).map((it) => ({
            ...it,
            products: Array.isArray(it.products) ? (it.products[0] || null) : it.products,
          }))
        };
      }

      if (cancelled) return;

      const cancelledSales = sales.filter((s) => s.status === "cancelled");

      let cash = 0;
      let transfer = 0;
      completed.forEach((s) => {
        if (s.payment_pending) return;
        const deliveryFee = Number(s.delivery_fee) || 0;
        const inc = cashTransferFromLine(
          Number(s.total),
          deliveryFee,
          s.payment_method,
          s.amount_cash,
          s.amount_transfer
        );
        cash += inc.cash;
        transfer += inc.transfer;
      });
      const closeAbonos = addCreditPaymentsToCashTransfer(
        (creditPaymentsCloseDay ?? []) as CreditPaymentRow[],
        cash,
        transfer
      );
      cash = closeAbonos.cash;
      transfer = closeAbonos.transfer;

      const totalIncome = cash + transfer;
      const cashPercentage = totalIncome > 0 ? Math.round((cash / totalIncome) * 100) : 0;
      const transferPercentage = totalIncome > 0 ? Math.round((transfer / totalIncome) * 100) : 0;

      const cancelledTotal = cancelledSales.reduce((a, s) => a + Number(s.total), 0);

      const physicalSales = completed.filter((s) => !s.is_delivery).length;
      const deliverySales = completed.filter((s) => s.is_delivery).length;

      const items = (itemsDay?.data ?? []) as Array<{
        product_id: string;
        quantity: number;
        unit_price: number;
        discount_percent: number;
        discount_amount: number;
        products: { name: string } | null;
      }>;

      const byProduct: Record<string, { name: string; quantity: number; total: number }> = {};
      items.forEach((it) => {
        const lineTotal = Math.max(
          0,
          Math.round(
            it.quantity * Number(it.unit_price) * (1 - Number(it.discount_percent || 0) / 100) - Number(it.discount_amount || 0)
          )
        );
        const name = it.products?.name ?? "—";
        if (!byProduct[it.product_id]) {
          byProduct[it.product_id] = { name, quantity: 0, total: 0 };
        }
        byProduct[it.product_id].quantity += it.quantity;
        byProduct[it.product_id].total += lineTotal;
      });

      const productsList = Object.values(byProduct).sort((a, b) => b.total - a.total);
      const totalUnits = productsList.reduce((sum, p) => sum + p.quantity, 0);

      // Obtener productos con stock bajo o agotado
      const { data: inventoryData } = await supabase
        .from("inventory")
        .select("quantity, min_stock, products(name)")
        .eq("branch_id", branchId);

      const lowStock: Array<{ name: string; quantity: number; min_stock: number }> = [];
      const outOfStock: Array<{ name: string }> = [];

      (inventoryData ?? []).forEach((inv: any) => {
        const qty = Number(inv.quantity ?? 0);
        const minStock = Number(inv.min_stock ?? 0);
        const productName = inv.products?.name ?? "—";
        
        if (qty === 0) {
          outOfStock.push({ name: productName });
        } else if (minStock > 0 && qty <= minStock) {
          lowStock.push({ name: productName, quantity: qty, min_stock: minStock });
        }
      });

      setLowStockProducts(lowStock);
      setOutOfStockProducts(outOfStock);

      // Garantías procesadas del día: ajustar efectivo/transferencia y egresos
      let warrantyCashImpact = 0;
      let warrantyTransferImpact = 0;
      let warrantiesCount = 0;
      let warrantyEgressCash = 0;
      let warrantyEgressTransfer = 0;
      const { data: warrantiesDay } = await supabase
        .from("warranties")
        .select("id, warranty_type, sale_id, sale_item_id, product_id, quantity, replacement_product_id, branch_id, sale_items(unit_price, quantity, discount_percent, discount_amount), sales(branch_id, payment_method, amount_cash, amount_transfer)")
        .eq("status", "processed")
        .gte("updated_at", start)
        .lte("updated_at", end);
      if (cancelled) return;

      const warrantyList = (warrantiesDay ?? []) as Array<{
        id: string;
        warranty_type: string;
        sale_id: string | null;
        sale_item_id: string | null;
        product_id: string;
        quantity: number;
        replacement_product_id: string | null;
        branch_id: string | null;
        sale_items:
          | { unit_price: number; quantity: number; discount_percent?: number; discount_amount?: number }
          | Array<{ unit_price: number; quantity: number; discount_percent?: number; discount_amount?: number }>
          | null;
        sales: { branch_id: string; payment_method: string; amount_cash: number | null; amount_transfer: number | null } | Array<{ branch_id: string; payment_method: string; amount_cash: number | null; amount_transfer: number | null }> | null;
      }>;

      const forBranch = branchId ? warrantyList.filter((w) => {
        const sal = Array.isArray(w.sales) ? w.sales[0] : w.sales;
        return w.branch_id === branchId || sal?.branch_id === branchId;
      }) : [];
      warrantiesCount = forBranch.length;

      if (forBranch.length > 0 && branchId) {
        const productIds = [...new Set([...forBranch.map((w) => w.product_id), ...forBranch.map((w) => w.replacement_product_id).filter(Boolean) as string[]])];
        const { data: productsData } = await supabase
          .from("products")
          .select("id, base_price, apply_iva")
          .in("id", productIds);
        if (cancelled) return;
        const productsMap: Record<string, { base_price: number | null; apply_iva: boolean }> = {};
        (productsData ?? []).forEach((p: { id: string; base_price: number | null; apply_iva: boolean }) => {
          productsMap[p.id] = { base_price: p.base_price, apply_iva: !!p.apply_iva };
        });

        for (const w of forBranch) {
          const si = Array.isArray(w.sale_items) ? w.sale_items[0] : w.sale_items;
          const sal = Array.isArray(w.sales) ? w.sales[0] : w.sales;
          let productValue = 0;
          if (si && si.unit_price != null) {
            const lineQ = Math.max(1, Number(si.quantity ?? w.quantity ?? 1));
            const returnQty = Math.min(Math.max(1, w.quantity), lineQ);
            const lineTotalAll = warrantySaleLineTotal(
              Number(si.unit_price),
              lineQ,
              Number(si.discount_percent ?? 0),
              Number(si.discount_amount ?? 0)
            );
            productValue = Math.round(lineTotalAll * (returnQty / lineQ));
          } else {
            const prod = productsMap[w.product_id];
            if (prod) {
              productValue = salePriceFromProduct(prod.base_price, prod.apply_iva) * (w.quantity || 1);
            }
          }

          if (w.warranty_type === "refund") {
            const amount = productValue;
            if (sal?.payment_method === "transfer") {
              warrantyTransferImpact -= amount;
            } else if (sal?.payment_method === "mixed" && sal.amount_cash != null && sal.amount_transfer != null) {
              const total = Number(sal.amount_cash) + Number(sal.amount_transfer);
              if (total > 0) {
                warrantyCashImpact -= Math.round((Number(sal.amount_cash) / total) * amount);
                warrantyTransferImpact -= amount - Math.round((Number(sal.amount_cash) / total) * amount);
              } else {
                warrantyCashImpact -= amount;
              }
            } else {
              warrantyCashImpact -= amount;
            }
          } else if (w.warranty_type === "exchange" && w.replacement_product_id) {
            const repl = productsMap[w.replacement_product_id];
            const replacementValue = repl ? salePriceFromProduct(repl.base_price, repl.apply_iva) * (w.quantity || 1) : 0;
            const diff = replacementValue - productValue;
            warrantyCashImpact += diff;
          }
        }

        cash += warrantyCashImpact;
        transfer += warrantyTransferImpact;
        warrantyEgressCash = warrantyCashImpact < 0 ? -warrantyCashImpact : 0;
        warrantyEgressTransfer = warrantyTransferImpact < 0 ? -warrantyTransferImpact : 0;
      }

      // Egresos registrados (tabla expenses): restar del efectivo/transferencia del día
      let expenseEgressCash = 0;
      let expenseEgressTransfer = 0;
      if (branchId) {
      const { data: expensesDay } = await supabase
        .from("expenses")
        .select("amount, payment_method, notes")
        .eq("branch_id", branchId)
        .eq("status", "active")
        .gte("created_at", start)
        .lte("created_at", end);
        if (cancelled) return;
        const skipAutoWarrantyRefund = (notes: string | null | undefined) =>
          (notes ?? "").includes("Reembolso automático al procesar garantía tipo devolución");
        (expensesDay ?? []).forEach((e: { amount: number; payment_method: string; notes?: string | null }) => {
          if (skipAutoWarrantyRefund(e.notes)) return;
          const amount = Number(e.amount) || 0;
          if (e.payment_method === "cash") {
            expenseEgressCash += amount;
            cash -= amount;
          } else {
            expenseEgressTransfer += amount;
            transfer -= amount;
          }
        });
      }

      const totalIncomeAfter = cash + transfer;
      const cashPct = totalIncomeAfter > 0 ? Math.round((cash / totalIncomeAfter) * 100) : 0;
      const transferPct = totalIncomeAfter > 0 ? Math.round((transfer / totalIncomeAfter) * 100) : 0;

      setCashCloseData({
        cash,
        transfer,
        cancelledInvoices: cancelledSales.length,
        cancelledTotal,
        warranties: warrantiesCount,
        products: productsList,
        totalSales: completed.length,
        physicalSales,
        deliverySales,
        totalUnits,
        cashPercentage: cashPct,
        transferPercentage: transferPct,
        warrantyEgressCash,
        warrantyEgressTransfer,
        expenseEgressCash,
        expenseEgressTransfer,
      });
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [isOpen, selectedDate, branchId]);

  useEffect(() => {
    if (!isOpen) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !saving) onClose();
    };
    document.addEventListener("keydown", handleEscape);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [isOpen, saving, onClose]);

  if (!isOpen) return null;

  const formatValue = (value: number) => {
    if (hideSensitiveInfo) return "***";
    return `$${value.toLocaleString("es-CO")}`;
  };

  const handleCheckChange = (key: keyof typeof checkedItems, index?: number) => {
    if (key === "products" && index !== undefined) {
      setCheckedItems((prev) => ({
        ...prev,
        products: {
          ...prev.products,
          [index]: !prev.products[index],
        },
      }));
    } else {
      setCheckedItems((prev) => ({
        ...prev,
        [key]: !prev[key],
      }));
    }
  };

  const allItemsChecked = cashCloseData ? (
    checkedItems.cash &&
    checkedItems.transfer &&
    checkedItems.totalSales &&
    checkedItems.totalUnits &&
    checkedItems.cancelledInvoices &&
    checkedItems.warranties
  ) : false;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      aria-modal="true"
      role="dialog"
    >
      <div
        className="absolute inset-0 bg-slate-900/60 dark:bg-slate-950/70"
        onClick={saving ? undefined : onClose}
        aria-hidden="true"
      />
      <div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-xl bg-white p-6 shadow-xl ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
        <div className="mb-4">
          <h2 className="text-xl font-bold text-slate-900 dark:text-slate-50">
            Cierre de caja manual
          </h2>
          <p className="mt-1 text-[13px] text-slate-600 dark:text-slate-300">
            Resumen del día {selectedDate.toLocaleDateString("es-CO", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </p>
        </div>

        {loading ? (
          <div className="py-8 text-center text-slate-500 dark:text-slate-300">
            Cargando datos...
          </div>
        ) : cashCloseData ? (
          <div className="space-y-6">
            {/* Resumen financiero y estadísticas - 3 arriba y 3 abajo */}
            <div className="grid gap-4 sm:grid-cols-3">
              <button
                type="button"
                onClick={() => handleCheckChange("cash")}
                className="flex items-start gap-3 rounded-lg bg-slate-50 p-4 text-left ring-1 ring-slate-200 transition-all hover:bg-slate-100 hover:ring-slate-300 dark:bg-slate-800 dark:ring-slate-700 dark:hover:bg-slate-700 dark:hover:ring-slate-600"
              >
                <div className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center">
                  {checkedItems.cash ? (
                    <svg className="h-5 w-5 text-ov-pink" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-[12px] font-medium text-slate-600 dark:text-slate-300">
                    Efectivo
                  </p>
                  <p className="mt-1 text-xl font-bold text-slate-900 dark:text-slate-50">
                    {formatValue(cashCloseData.cash)}
                  </p>
                  <p className="mt-1 text-[12px] text-slate-500 dark:text-slate-300">
                    {cashCloseData.cashPercentage}% del total
                  </p>
                </div>
              </button>
              <button
                type="button"
                onClick={() => handleCheckChange("transfer")}
                className="flex items-start gap-3 rounded-lg bg-slate-50 p-4 text-left ring-1 ring-slate-200 transition-all hover:bg-slate-100 hover:ring-slate-300 dark:bg-slate-800 dark:ring-slate-700 dark:hover:bg-slate-700 dark:hover:ring-slate-600"
              >
                <div className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center">
                  {checkedItems.transfer ? (
                    <svg className="h-5 w-5 text-ov-pink" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-[12px] font-medium text-slate-600 dark:text-slate-300">
                    Transferencia
                  </p>
                  <p className="mt-1 text-xl font-bold text-slate-900 dark:text-slate-50">
                    {formatValue(cashCloseData.transfer)}
                  </p>
                  <p className="mt-1 text-[12px] text-slate-500 dark:text-slate-300">
                    {cashCloseData.transferPercentage}% del total
                  </p>
                </div>
              </button>
              <button
                type="button"
                onClick={() => handleCheckChange("totalSales")}
                className="flex items-start gap-3 rounded-lg bg-slate-50 p-4 text-left ring-1 ring-slate-200 transition-all hover:bg-slate-100 hover:ring-slate-300 dark:bg-slate-800 dark:ring-slate-700 dark:hover:bg-slate-700 dark:hover:ring-slate-600"
              >
                <div className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center">
                  {checkedItems.totalSales ? (
                    <svg className="h-5 w-5 text-ov-pink" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-[12px] font-medium text-slate-600 dark:text-slate-300">
                    Total ventas
                  </p>
                  <p className="mt-1 text-xl font-bold text-slate-900 dark:text-slate-50">
                    {hideSensitiveInfo ? "***" : cashCloseData.totalSales}
                  </p>
                  {!hideSensitiveInfo && cashCloseData.totalSales > 0 && (
                    <div className="mt-1 flex items-center gap-3">
                      <div className="flex items-center gap-1.5">
                        <svg className="h-3.5 w-3.5 text-slate-500 dark:text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                        <span className="text-[12px] font-medium text-slate-500 dark:text-slate-300">
                          {Math.round((cashCloseData.physicalSales / cashCloseData.totalSales) * 100)}%
                        </span>
                      </div>
                      <span className="text-slate-300 dark:text-slate-600">·</span>
                      <div className="flex items-center gap-1.5">
                        <svg className="h-3.5 w-3.5 text-slate-500 dark:text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                        </svg>
                        <span className="text-[12px] font-medium text-slate-500 dark:text-slate-300">
                          {Math.round((cashCloseData.deliverySales / cashCloseData.totalSales) * 100)}%
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </button>
            </div>

            {/* Arqueo de caja - Campos de entrada */}
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800">
              <h3 className="mb-4 text-sm font-semibold text-slate-900 dark:text-slate-50">
                Arqueo de caja
              </h3>
              <div className="grid gap-4 sm:grid-cols-2">
                {/* Efectivo */}
                <div>
                  <label className="mb-1 block text-[12px] font-medium text-slate-600 dark:text-slate-300">
                    Efectivo esperado
                  </label>
                  <div className="text-lg font-bold text-slate-900 dark:text-slate-50">
                    {formatValue(cashCloseData.cash)}
                  </div>
                  <label className="mt-3 mb-1 block text-[12px] font-medium text-slate-600 dark:text-slate-300">
                    Efectivo ingresado
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={actualCash}
                    onChange={(e) => setActualCash(e.target.value)}
                    placeholder="0.00"
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-ov-pink focus:outline-none focus:ring-2 focus:ring-ov-pink/20 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-50 dark:placeholder-slate-500"
                  />
                  {actualCash && (
                    <div className="mt-2">
                      <span className="text-[12px] text-slate-600 dark:text-slate-300">
                        Diferencia:{" "}
                      </span>
                      <span
                        className={`text-[12px] font-semibold ${
                          Number(actualCash) - cashCloseData.cash === 0
                            ? "text-green-600 dark:text-green-400"
                            : Number(actualCash) - cashCloseData.cash < 0
                            ? "text-red-600 dark:text-red-400"
                            : "text-orange-600 dark:text-orange-400"
                        }`}
                      >
                        {Number(actualCash) - cashCloseData.cash >= 0 ? "+" : ""}
                        {formatValue(Number(actualCash) - cashCloseData.cash)}
                      </span>
                    </div>
                  )}
                </div>

                {/* Transferencia */}
                <div>
                  <label className="mb-1 block text-[12px] font-medium text-slate-600 dark:text-slate-300">
                    Transferencia esperada
                  </label>
                  <div className="text-lg font-bold text-slate-900 dark:text-slate-50">
                    {formatValue(cashCloseData.transfer)}
                  </div>
                  <label className="mt-3 mb-1 block text-[12px] font-medium text-slate-600 dark:text-slate-300">
                    Transferencia ingresada
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={actualTransfer}
                    onChange={(e) => setActualTransfer(e.target.value)}
                    placeholder="0.00"
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-ov-pink focus:outline-none focus:ring-2 focus:ring-ov-pink/20 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-50 dark:placeholder-slate-500"
                  />
                  {actualTransfer && (
                    <div className="mt-2">
                      <span className="text-[12px] text-slate-600 dark:text-slate-300">
                        Diferencia:{" "}
                      </span>
                      <span
                        className={`text-[12px] font-semibold ${
                          Number(actualTransfer) - cashCloseData.transfer === 0
                            ? "text-green-600 dark:text-green-400"
                            : Number(actualTransfer) - cashCloseData.transfer < 0
                            ? "text-red-600 dark:text-red-400"
                            : "text-orange-600 dark:text-orange-400"
                        }`}
                      >
                        {Number(actualTransfer) - cashCloseData.transfer >= 0 ? "+" : ""}
                        {formatValue(Number(actualTransfer) - cashCloseData.transfer)}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Notas sobre diferencias */}
              {(actualCash || actualTransfer) &&
                (Number(actualCash || 0) - cashCloseData.cash !== 0 ||
                  Number(actualTransfer || 0) - cashCloseData.transfer !== 0) && (
                  <div className="mt-4">
                    <label className="mb-1 block text-[12px] font-medium text-slate-600 dark:text-slate-300">
                      Motivo de la diferencia (opcional)
                    </label>
                    <textarea
                      value={differenceReason}
                      onChange={(e) => setDifferenceReason(e.target.value)}
                      placeholder="Explica si falta o sobra dinero..."
                      rows={2}
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-ov-pink focus:outline-none focus:ring-2 focus:ring-ov-pink/20 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-50 dark:placeholder-slate-500"
                    />
                  </div>
                )}
            </div>

            {/* Segunda fila - 3 cards */}
            <div className="grid gap-4 sm:grid-cols-3">
              <button
                type="button"
                onClick={() => handleCheckChange("totalUnits")}
                className="flex items-start gap-3 rounded-lg bg-slate-50 p-4 text-left ring-1 ring-slate-200 transition-all hover:bg-slate-100 hover:ring-slate-300 dark:bg-slate-800 dark:ring-slate-700 dark:hover:bg-slate-700 dark:hover:ring-slate-600"
              >
                <div className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center">
                  {checkedItems.totalUnits ? (
                    <svg className="h-5 w-5 text-ov-pink" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-[12px] font-medium text-slate-600 dark:text-slate-300">
                    Total unidades vendidas
                  </p>
                  <p className="mt-1 text-xl font-bold text-slate-900 dark:text-slate-50">
                    {hideSensitiveInfo ? "***" : cashCloseData.totalUnits}
                  </p>
                </div>
              </button>
              <button
                type="button"
                onClick={() => handleCheckChange("cancelledInvoices")}
                className="flex items-start gap-3 rounded-lg bg-slate-50 p-4 text-left ring-1 ring-slate-200 transition-all hover:bg-slate-100 hover:ring-slate-300 dark:bg-slate-800 dark:ring-slate-700 dark:hover:bg-slate-700 dark:hover:ring-slate-600"
              >
                <div className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center">
                  {checkedItems.cancelledInvoices ? (
                    <svg className="h-5 w-5 text-ov-pink" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-[12px] font-medium text-slate-600 dark:text-slate-300">
                    Facturas anuladas
                  </p>
                  <p className="mt-1 text-xl font-bold text-slate-900 dark:text-slate-50">
                    {hideSensitiveInfo ? "***" : cashCloseData.cancelledInvoices}
                  </p>
                  {cashCloseData.cancelledInvoices > 0 && (
                    <p className="mt-1 text-[12px] text-slate-500 dark:text-slate-300">
                      {formatValue(cashCloseData.cancelledTotal)}
                    </p>
                  )}
                </div>
              </button>
              <button
                type="button"
                onClick={() => handleCheckChange("warranties")}
                className="flex items-start gap-3 rounded-lg bg-slate-50 p-4 text-left ring-1 ring-slate-200 transition-all hover:bg-slate-100 hover:ring-slate-300 dark:bg-slate-800 dark:ring-slate-700 dark:hover:bg-slate-700 dark:hover:ring-slate-600"
              >
                <div className="mt-1 flex h-5 w-5 shrink-0 items-center justify-center">
                  {checkedItems.warranties ? (
                    <svg className="h-5 w-5 text-ov-pink" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  ) : (
                    <svg className="h-5 w-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-[12px] font-medium text-slate-600 dark:text-slate-300">
                    Garantías
                  </p>
                  <p className="mt-1 text-xl font-bold text-slate-900 dark:text-slate-50">
                    {hideSensitiveInfo ? "***" : cashCloseData.warranties}
                  </p>
                </div>
              </button>
            </div>

            {/* Egresos por garantías - siempre visible */}
            <div className="rounded-xl bg-white p-4 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
              <p className="text-[13px] font-bold uppercase tracking-wide text-slate-600 dark:text-slate-300">
                Egresos por garantías
              </p>
              <p className="mt-0.5 text-[12px] text-slate-500 dark:text-slate-300">
                Dinero devuelto a clientes (devoluciones y diferencias de cambio)
              </p>
              <div className="mt-3 space-y-1.5">
                {cashCloseData.warrantyEgressCash > 0 && (
                  <div className="flex items-center justify-between text-[14px]">
                    <span className="text-slate-600 dark:text-slate-300">Efectivo</span>
                    <span className="font-medium text-slate-900 dark:text-slate-50">
                      {hideSensitiveInfo ? "***" : formatValue(cashCloseData.warrantyEgressCash)}
                    </span>
                  </div>
                )}
                {cashCloseData.warrantyEgressTransfer > 0 && (
                  <div className="flex items-center justify-between text-[14px]">
                    <span className="text-slate-600 dark:text-slate-300">Transferencia</span>
                    <span className="font-medium text-slate-900 dark:text-slate-50">
                      {hideSensitiveInfo ? "***" : formatValue(cashCloseData.warrantyEgressTransfer)}
                    </span>
                  </div>
                )}
                { (cashCloseData.expenseEgressCash > 0 || cashCloseData.expenseEgressTransfer > 0) && (
                  <div className="mt-2 border-t border-slate-200 pt-2 dark:border-slate-800">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5">Egresos registrados</p>
                    {cashCloseData.expenseEgressCash > 0 && (
                      <div className="flex items-center justify-between text-[14px]">
                        <span className="text-slate-600 dark:text-slate-300">Efectivo</span>
                        <span className="font-medium text-slate-900 dark:text-slate-50">
                          {hideSensitiveInfo ? "***" : formatValue(cashCloseData.expenseEgressCash)}
                        </span>
                      </div>
                    )}
                    {cashCloseData.expenseEgressTransfer > 0 && (
                      <div className="flex items-center justify-between text-[14px]">
                        <span className="text-slate-600 dark:text-slate-300">Transferencia</span>
                        <span className="font-medium text-slate-900 dark:text-slate-50">
                          {hideSensitiveInfo ? "***" : formatValue(cashCloseData.expenseEgressTransfer)}
                        </span>
                      </div>
                    )}
                  </div>
                )}
                <div className="flex items-center justify-between border-t border-slate-200 pt-2 dark:border-slate-800">
                  <span className="text-[13px] font-semibold text-slate-700 dark:text-slate-300">Total egresos</span>
                  <span className="font-bold text-slate-900 dark:text-slate-50">
                    {hideSensitiveInfo ? "***" : formatValue(
                      cashCloseData.warrantyEgressCash + cashCloseData.warrantyEgressTransfer +
                      cashCloseData.expenseEgressCash + cashCloseData.expenseEgressTransfer
                    )}
                  </span>
                </div>
              </div>
            </div>

            {/* Productos vendidos */}
            <div>
              <h3 className="mb-3 text-base font-bold text-slate-900 dark:text-slate-50">
                Productos vendidos
              </h3>
              {cashCloseData.products.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-[13px]">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-700">
                        <th className="pb-2 text-left font-medium text-slate-600 dark:text-slate-300">
                          Producto
                        </th>
                        <th className="pb-2 text-right font-medium text-slate-600 dark:text-slate-300">
                          Cantidad
                        </th>
                        <th className="pb-2 text-right font-medium text-slate-600 dark:text-slate-300">
                          Total
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {cashCloseData.products.map((product, i) => (
                        <tr
                          key={i}
                          className="border-b border-slate-100 dark:border-slate-800"
                        >
                          <td className="py-2 text-slate-900 dark:text-slate-50">
                            {product.name}
                          </td>
                          <td className="py-2 text-right text-slate-600 dark:text-slate-300">
                            {hideSensitiveInfo ? "***" : `${product.quantity} unidades`}
                          </td>
                          <td className="py-2 text-right font-medium text-slate-900 dark:text-slate-50">
                            {formatValue(product.total)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-slate-300 dark:border-slate-600">
                        <td className="py-2 font-bold text-slate-900 dark:text-slate-50">
                          Total
                        </td>
                        <td className="py-2 text-right font-bold text-slate-900 dark:text-slate-50">
                          {hideSensitiveInfo ? "***" : `${cashCloseData.totalUnits} unidades`}
                        </td>
                        <td className="py-2 text-right font-bold text-slate-900 dark:text-slate-50">
                          {formatValue(cashCloseData.cash + cashCloseData.transfer)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              ) : (
                <div className="rounded-lg bg-slate-50 p-4 text-center text-[13px] text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                  No se vendieron productos este día
                </div>
              )}
            </div>

            {/* Productos con stock bajo o agotado */}
            {(lowStockProducts.length > 0 || outOfStockProducts.length > 0) && (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800">
                <h3 className="mb-3 text-sm font-semibold text-slate-900 dark:text-slate-50">
                  Alertas de inventario
                </h3>
                {outOfStockProducts.length > 0 && (
                  <div className="mb-3">
                    <div className="mb-2 flex items-center gap-2">
                      <svg className="h-4 w-4 text-red-600 dark:text-red-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                      <span className="text-[12px] font-medium text-red-600 dark:text-red-400">
                        Productos agotados ({outOfStockProducts.length})
                      </span>
                    </div>
                    <div className="ml-6 space-y-1">
                      {outOfStockProducts.map((p, i) => (
                        <div key={i} className="text-[12px] text-slate-600 dark:text-slate-300">
                          • {p.name}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {lowStockProducts.length > 0 && (
                  <div>
                    <div className="mb-2 flex items-center gap-2">
                      <svg className="h-4 w-4 text-orange-600 dark:text-orange-400" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      <span className="text-[12px] font-medium text-orange-600 dark:text-orange-400">
                        Productos con stock bajo ({lowStockProducts.length})
                      </span>
                    </div>
                    <div className="ml-6 space-y-1">
                      {lowStockProducts.map((p, i) => (
                        <div key={i} className="text-[12px] text-slate-600 dark:text-slate-300">
                          • {p.name} ({p.quantity} unidades, mínimo: {p.min_stock})
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : null}

        {/* Botones */}
        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            disabled={saving}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-[13px] font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            Cancelar
          </button>
          <button
            onClick={() => {
              if (!cashCloseData) return;
              onSave({
                expectedCash: cashCloseData.cash,
                expectedTransfer: cashCloseData.transfer,
                actualCash: actualCash || String(cashCloseData.cash),
                actualTransfer: actualTransfer || String(cashCloseData.transfer),
                totalSales: cashCloseData.totalSales,
                physicalSales: cashCloseData.physicalSales,
                deliverySales: cashCloseData.deliverySales,
                totalUnits: cashCloseData.totalUnits,
                cancelledInvoices: cashCloseData.cancelledInvoices,
                cancelledTotal: cashCloseData.cancelledTotal,
                warranties: cashCloseData.warranties,
                differenceReason: differenceReason || undefined,
              });
            }}
            disabled={saving || loading || !allItemsChecked || !cashCloseData}
            className="rounded-lg bg-ov-pink px-4 py-2 text-[13px] font-medium text-white transition-colors hover:bg-ov-pink-hover disabled:opacity-50 disabled:cursor-not-allowed dark:bg-ov-pink dark:hover:bg-ov-pink-hover"
          >
            {saving ? "Guardando..." : "Guardar y aceptar"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPageRoute() {
  return (
    <SearchParamsBoundary>
      <DashboardPage />
    </SearchParamsBoundary>
  );
}
