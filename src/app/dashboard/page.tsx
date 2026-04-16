"use client";

import { useState, useEffect, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { resolveActiveBranchId } from "@/lib/active-branch";
import DatePickerCard from "@/app/components/DatePickerCard";
import { creditRowPending } from "@/app/creditos/credit-ui";
import { cashTransferFromLine, addCreditPaymentSplits as addCreditPaymentsToCashTransfer } from "@/lib/cash-transfer-from-line";
import { InfoTip } from "@/app/components/InfoTip";
import { IncomeTrendChart } from "@/app/components/IncomeTrendChart";
import {
  ArrowDown,
  ArrowUp,
  Banknote,
  CircleDollarSign,
  CircleX,
  CreditCard,
  Landmark,
  LineChart,
  Package,
  PiggyBank,
  ShieldCheck,
  TrendingDown,
} from "lucide-react";

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
  topProducts: { name: string; units: number; total: number }[];
  last15Days: { day: string; sales: number }[];
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
};

const DAY_LABELS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

/** Iconos del resumen: acento en oscuro tipo referencia (verde suave, sin cajas). */
const DASHBOARD_ICON_CLASS = "text-[color:var(--shell-sidebar)] dark:text-emerald-400/90";

/** Días mostrados en la tendencia de ingresos (siempre anclada a “hoy” calendario). */
const INCOME_TREND_DAY_COUNT = 15;

/** Reporte completo: rango de fechas, bloque inventario/resultado y gráfica de tendencia. Cajero solo ve día a día. */
function hasFullDashboardReports(role: string | null | undefined): boolean {
  const r = String(role ?? "").toLowerCase();
  return r === "owner" || r === "admin" || r === "delivery";
}

function formatTrendAxisDay(d: Date): string {
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** Clave estable día calendario local (evita desalineos con toDateString / zona). */
function localDayKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function emptyIncomeTrendDays(): { day: string; sales: number }[] {
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  const out: { day: string; sales: number }[] = [];
  for (let i = INCOME_TREND_DAY_COUNT - 1; i >= 0; i--) {
    const d = new Date(t);
    d.setDate(d.getDate() - i);
    out.push({ day: formatTrendAxisDay(d), sales: 0 });
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

type SaleItemMarginRow = {
  quantity: number;
  unit_price: number;
  discount_percent: number;
  discount_amount: number;
  products: { name: string; base_cost: number | null } | null;
};

/** Margen bruto (precio − costo) × cantidad, misma fórmula que el dashboard. */
function grossMarginFromItemRows(itemRows: SaleItemMarginRow[]): number {
  return itemRows.reduce((sum, it) => {
    const unitPrice = Number(it.unit_price ?? 0);
    const discountPercent = Number(it.discount_percent ?? 0);
    const discountAmount = Number(it.discount_amount ?? 0);
    const quantity = Number(it.quantity ?? 0);
    const baseCost = Number(it.products?.base_cost ?? 0);
    const salePriceWithDiscount = Math.max(
      0,
      unitPrice * (1 - discountPercent / 100) - discountAmount
    );
    if (baseCost > 0) {
      return sum + (salePriceWithDiscount - baseCost) * quantity;
    }
    return sum;
  }, 0);
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

function HeroDeltaInline({ cur, prev, hide }: { cur: number; prev: number; hide: boolean }) {
  if (hide) {
    return (
      <span className="text-sm font-semibold tabular-nums text-slate-400" title="Oculto">
        ***
      </span>
    );
  }
  if (prev <= 0) {
    if (cur > 0) {
      return (
        <span
          className="inline-flex items-center gap-0.5 text-sm font-semibold text-[color:var(--shell-sidebar)] dark:text-zinc-300"
          title="Sin día anterior comparable"
        >
          <ArrowUp className="h-3.5 w-3.5 shrink-0" aria-hidden strokeWidth={2.25} />
          Nuevo
        </span>
      );
    }
    return null;
  }
  const pct = Math.round(((cur - prev) / prev) * 1000) / 10;
  const up = pct >= 0;
  return (
    <span
      className={`inline-flex items-center gap-0.5 text-sm font-semibold tabular-nums ${
        up ? "text-[color:var(--shell-sidebar)] dark:text-zinc-300" : "text-rose-600 dark:text-rose-400"
      }`}
      title="vs. día anterior"
    >
      {up ? (
        <ArrowUp className="h-3.5 w-3.5 shrink-0" aria-hidden strokeWidth={2.25} />
      ) : (
        <ArrowDown className="h-3.5 w-3.5 shrink-0" aria-hidden strokeWidth={2.25} />
      )}
      <span>
        {up ? "+" : ""}
        {pct}%
      </span>
    </span>
  );
}

function DashboardHeroMetric({
  label,
  valueStr,
  numericValue,
  prevNumeric,
  showDelta,
  hideSensitive,
  icon,
  infoTip,
}: {
  label: string;
  valueStr: string;
  numericValue: number;
  prevNumeric: number;
  showDelta: boolean;
  hideSensitive: boolean;
  icon: ReactNode;
  infoTip?: ReactNode;
}) {
  return (
    <div className="flex min-w-0 items-center gap-2.5 sm:items-start sm:gap-3.5">
      <span
        className={`inline-flex shrink-0 items-center justify-center leading-none sm:mt-0.5 [&>svg]:h-5 [&>svg]:w-5 sm:[&>svg]:h-6 sm:[&>svg]:w-6 ${DASHBOARD_ICON_CLASS}`}
      >
        {icon}
      </span>
      {/* Móvil: mismo patrón que Salidas (etiqueta + i | valor). sm+: número debajo (web). */}
      <div className="flex min-w-0 flex-1 flex-row flex-nowrap items-center justify-between gap-2 sm:flex-col sm:items-stretch sm:justify-start sm:gap-2">
        <div className="flex min-w-0 flex-1 items-center gap-1 sm:flex-initial">
          <p className="min-w-0 truncate text-[10px] font-semibold uppercase leading-snug tracking-[0.08em] text-slate-500 sm:truncate-none dark:text-slate-400">
            {label}
          </p>
          {infoTip ? <InfoTip ariaLabel={`${label}: más información`}>{infoTip}</InfoTip> : null}
        </div>
        <div className="flex min-w-0 shrink-0 flex-wrap items-baseline justify-end gap-x-1.5 gap-y-0.5 sm:justify-start">
          <span className="text-right text-lg font-bold tabular-nums tracking-tight text-slate-900 dark:text-slate-50 sm:text-left sm:text-xl lg:text-2xl">
            {valueStr}
          </span>
          {showDelta ? <HeroDeltaInline cur={numericValue} prev={prevNumeric} hide={hideSensitive} /> : null}
        </div>
      </div>
    </div>
  );
}

/** Bloque de reporte: rejilla plana, sin tarjetas (solo tipografía + espacio). */
function DashboardReportSection({
  eyebrow,
  gridClass,
  children,
}: {
  eyebrow: string;
  /** Columnas y gaps; incluir breakpoints (ej. `grid-cols-2 sm:grid-cols-3`) */
  gridClass: string;
  children: ReactNode;
}) {
  return (
    <section className="mt-10 pt-0 sm:mt-14">
      <p className="mb-4 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400 dark:text-slate-500 sm:mb-5 sm:text-[11px]">
        {eyebrow}
      </p>
      <div
        className={`grid grid-cols-1 gap-x-4 gap-y-3 sm:gap-x-5 sm:gap-y-4 lg:gap-x-6 lg:gap-y-5 ${gridClass}`}
      >
        {children}
      </div>
    </section>
  );
}

function DashboardKpiCard({
  icon,
  label,
  value,
  infoTip,
  valueClassName = "text-lg sm:text-xl lg:text-2xl",
}: {
  icon: ReactNode;
  label: string;
  value: ReactNode;
  infoTip?: ReactNode;
  valueClassName?: string;
}) {
  return (
    <div className="flex min-w-0 items-center gap-2.5 sm:items-start sm:gap-3.5">
      <span
        className={`inline-flex shrink-0 items-center justify-center leading-none sm:mt-0.5 [&>svg]:h-5 [&>svg]:w-5 sm:[&>svg]:h-6 sm:[&>svg]:w-6 ${DASHBOARD_ICON_CLASS}`}
      >
        {icon}
      </span>
      {/* Móvil: etiqueta + valor en una fila. sm+: columna tipo tarjeta (referencia limpia). */}
      <div className="flex min-w-0 flex-1 flex-row flex-nowrap items-center justify-between gap-2 sm:flex-col sm:items-stretch sm:justify-start sm:gap-0">
        <div className="flex min-w-0 flex-1 items-center gap-1 sm:min-h-0 sm:flex-initial">
          <p className="min-w-0 truncate text-[10px] font-semibold uppercase leading-snug tracking-[0.08em] text-slate-500 sm:truncate-none sm:whitespace-normal sm:leading-snug dark:text-slate-400">
            {label}
          </p>
          {infoTip ? <InfoTip ariaLabel={`${label}: más información`}>{infoTip}</InfoTip> : null}
        </div>
        <p
          className={`shrink-0 text-right font-bold tabular-nums tracking-tight text-slate-900 dark:text-slate-50 sm:mt-3 sm:text-left ${valueClassName}`}
        >
          {value}
        </p>
      </div>
    </div>
  );
}

const IVA_RATE = 0.19;

function getDayBounds(date: Date): { start: string; end: string } {
  const year = date.getFullYear();
  const month = date.getMonth();
  const day = date.getDate();
  const start = new Date(year, month, day, 0, 0, 0, 0);
  const end = new Date(year, month, day, 23, 59, 59, 999);
  return { start: start.toISOString(), end: end.toISOString() };
}

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

export default function DashboardPage() {
  const searchParams = useSearchParams();
  const queryBranchId = searchParams.get("branchId");
  type DateFilterMode = "today" | "range";

  const [dateFilterMode, setDateFilterMode] = useState<DateFilterMode>("today");
  const [selectedDay, setSelectedDay] = useState<Date>(() => {
    const t = new Date();
    return new Date(t.getFullYear(), t.getMonth(), t.getDate());
  });
  const [dateFrom, setDateFrom] = useState<Date>(() => firstDayOfMonth(new Date()));
  const [dateTo, setDateTo] = useState<Date>(() => {
    const t = new Date();
    return new Date(t.getFullYear(), t.getMonth(), t.getDate());
  });
  const [hideSensitiveInfo, setHideSensitiveInfo] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [branchId, setBranchId] = useState<string | null>(null);
  const [branchResolved, setBranchResolved] = useState(false);
  const [dashboardRole, setDashboardRole] = useState<string | null>(null);
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) {
        if (!cancelled) {
          setBranchResolved(true);
          setDashboardRole(null);
        }
        return;
      }
      const [resolvedBranchId, profileRes] = await Promise.all([
        resolveActiveBranchId(supabase, user.id, queryBranchId),
        supabase.from("users").select("role").eq("id", user.id).maybeSingle(),
      ]);
      if (cancelled) return;
      setBranchId(resolvedBranchId);
      setDashboardRole(((profileRes.data as { role?: string } | null)?.role as string | undefined) ?? "cashier");
      setBranchResolved(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [queryBranchId]);

  const reportsFullAccess = hasFullDashboardReports(dashboardRole);

  useEffect(() => {
    if (!reportsFullAccess && dateFilterMode === "range") {
      setDateFilterMode("today");
    }
  }, [reportsFullAccess, dateFilterMode]);

  useEffect(() => {
    if (!branchId) {
      if (!branchResolved) {
        setLoading(true);
        return;
      }
      setDashboardData(null);
      setLoading(false);
      return;
    }
    const supabase = createClient();
    let cancelled = false;
    setLoading(true);
    const dateMode = reportsFullAccess ? dateFilterMode : "today";
    const { start, end } =
      dateMode === "today"
        ? getDayBounds(selectedDay)
        : getRangeBounds(dateFrom, dateTo);
    const anchorForPrevDay = dateMode === "today" ? selectedDay : dateTo;
    const dayBeforeRef = new Date(anchorForPrevDay);
    dayBeforeRef.setDate(dayBeforeRef.getDate() - 1);
    const { start: yStart, end: yEnd } = getDayBounds(dayBeforeRef);

    const trendWindowStart = new Date();
    trendWindowStart.setHours(0, 0, 0, 0);
    trendWindowStart.setDate(trendWindowStart.getDate() - (INCOME_TREND_DAY_COUNT - 1));
    const trendWindowEndDay = new Date();
    trendWindowEndDay.setHours(0, 0, 0, 0);
    const { start: trendWindowStartIso, end: trendWindowEndIso } = getRangeBounds(trendWindowStart, trendWindowEndDay);

    const creditPaySelect =
      "amount, payment_method, amount_cash, amount_transfer, payment_source, created_at, customer_credits!inner(branch_id, public_ref, sale_id, total_amount)";

    (async () => {
      try {
      const [
        { data: salesDay },
        { data: salesPrevDay },
        { data: expensesPrevDay },
        { data: salesTrendWindow },
        { data: creditPaymentsPeriod },
        { data: creditPaymentsPrev },
        { data: creditPaymentsTrend },
        { data: customerCreditsBranch },
        { data: inventoryData },
        { data: defectiveData },
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
          .gte("created_at", trendWindowStartIso)
          .lte("created_at", trendWindowEndIso),
        supabase
          .from("credit_payments")
          .select(creditPaySelect)
          .eq("customer_credits.branch_id", branchId)
          .gte("created_at", start)
          .lte("created_at", end),
        supabase
          .from("credit_payments")
          .select(creditPaySelect)
          .eq("customer_credits.branch_id", branchId)
          .gte("created_at", yStart)
          .lte("created_at", yEnd),
        supabase
          .from("credit_payments")
          .select(creditPaySelect)
          .eq("customer_credits.branch_id", branchId)
          .gte("created_at", trendWindowStartIso)
          .lte("created_at", trendWindowEndIso),
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
      ]);

      if (cancelled) return;

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

      // Egresos del día (tabla expenses): restar de efectivo/transferencia
      let totalExpensesCash = 0;
      let totalExpensesTransfer = 0;
      const { data: expensesDay } = await supabase
        .from("expenses")
        .select("amount, payment_method, concept, notes")
        .eq("branch_id", branchId)
        .eq("status", "active")
        .gte("created_at", start)
        .lte("created_at", end);
      if (cancelled) return;
      let warrantiesRefundAmount = 0;
      (expensesDay ?? []).forEach((e: { amount: number; payment_method: string; concept?: string | null; notes?: string | null }) => {
        const amount = Number(e.amount) || 0;
        const concept = String(e.concept ?? "");
        const notes = String(e.notes ?? "");
        const isWarrantyRefund =
          concept.startsWith("Devolución garantía ") ||
          notes === "Reembolso automático al procesar garantía tipo devolución.";
        if (isWarrantyRefund) warrantiesRefundAmount += amount;
        if (e.payment_method === "cash") {
          totalExpensesCash += amount;
          cash -= amount;
        } else {
          totalExpensesTransfer += amount;
          transfer -= amount;
        }
      });

      // Último egreso del día (para mostrar en card)
      let lastExpense: { amount: number; concept: string } | null = null;
      const { data: lastExpenseRow } = await supabase
        .from("expenses")
        .select("amount, concept")
        .eq("branch_id", branchId)
        .eq("status", "active")
        .gte("created_at", start)
        .lte("created_at", end)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (cancelled) return;
      if (lastExpenseRow && lastExpenseRow.amount != null) {
        lastExpense = { amount: Number(lastExpenseRow.amount), concept: String(lastExpenseRow.concept ?? "") };
      }

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
      const last15Days: { day: string; sales: number }[] = [];
      for (let i = 0; i < INCOME_TREND_DAY_COUNT; i++) {
        const d = new Date(trendWindowStart);
        d.setDate(d.getDate() + i);
        const key = localDayKey(d);
        last15Days.push({
          day: formatTrendAxisDay(d),
          sales: byDay[key] ?? 0,
        });
      }

      // Productos más vendidos y margen: solo ventas con cobro registrado (excluye crédito pendiente).
      let items: Array<SaleItemMarginRow & { product_id: string }> = [];
      const { data: itemsDayDirect } = await supabase
        .from("sale_items")
        .select(
          "sale_id, product_id, quantity, unit_price, discount_percent, discount_amount, products(name, base_cost), sales!inner(branch_id, created_at, status, payment_pending)"
        )
        .eq("sales.branch_id", branchId)
        .gte("sales.created_at", start)
        .lte("sales.created_at", end)
        .eq("sales.status", "completed")
        .eq("sales.payment_pending", false);
      if (cancelled) return;
      const rawItems = (itemsDayDirect ?? []) as Array<{
        sale_id?: string;
        product_id: string;
        quantity: number;
        unit_price: number;
        discount_percent: number;
        discount_amount: number;
        products: { name: string; base_cost: number | null }[] | { name: string; base_cost: number | null } | null;
      }>;
      // Si la API no soporta filtro por relación, usar fallback con IDs del fetch de ventas
      if (rawItems.length === 0) {
        const saleIdsForItems = completed.filter((s) => !s.payment_pending).map((s) => s.id);
        if (saleIdsForItems.length > 0) {
          const { data: itemsDayFallback } = await supabase
            .from("sale_items")
            .select("sale_id, product_id, quantity, unit_price, discount_percent, discount_amount, products(name, base_cost)")
            .in("sale_id", saleIdsForItems);
          if (cancelled) return;
          const fallback = (itemsDayFallback ?? []) as typeof rawItems;
          items = fallback.map((it) => ({
            ...it,
            products: Array.isArray(it.products) ? (it.products[0] || null) : it.products,
          }));
        }
      } else {
        items = rawItems.map((it) => ({
          ...it,
          products: Array.isArray(it.products) ? (it.products[0] || null) : it.products,
        }));
      }

      const byProduct: Record<string, { name: string; units: number; total: number }> = {};
      items.forEach((it) => {
        const lineTotal = Math.max(
          0,
          Math.round(
            it.quantity * Number(it.unit_price) * (1 - Number(it.discount_percent || 0) / 100) - Number(it.discount_amount || 0)
          )
        );
        const name = it.products?.name ?? "—";
        if (!byProduct[it.product_id]) byProduct[it.product_id] = { name, units: 0, total: 0 };
        byProduct[it.product_id].units += it.quantity;
        byProduct[it.product_id].total += lineTotal;
      });
      const topProducts = Object.values(byProduct)
        .sort((a, b) => b.total - a.total)
        .slice(0, 5);

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

      const marginPaidSales = grossMarginFromItemRows(items);

      let marginFromAbonos = 0;
      const saleIdsForAbono = [
        ...new Set(
          abonosPeriod
            .filter(isCreditPaymentCashInflow)
            .map((p) => {
              const c = p.customer_credits;
              const row = Array.isArray(c) ? c[0] : c;
              const sid = row?.sale_id;
              return sid ? String(sid) : null;
            })
            .filter((id): id is string => Boolean(id))
        ),
      ];
      if (saleIdsForAbono.length > 0) {
        const [{ data: abonoSaleItems }, { data: salesForAbono }] = await Promise.all([
          supabase
            .from("sale_items")
            .select("sale_id, quantity, unit_price, discount_percent, discount_amount, products(name, base_cost)")
            .in("sale_id", saleIdsForAbono),
          supabase.from("sales").select("id, total, delivery_fee").in("id", saleIdsForAbono),
        ]);
        if (cancelled) return;
        const storeRevBySale = new Map<string, number>();
        for (const s of salesForAbono ?? []) {
          const df = Number(s.delivery_fee) || 0;
          storeRevBySale.set(String(s.id), Math.max(0, Number(s.total) - df));
        }
        type RawAbonoIt = {
          sale_id: string;
          quantity: number;
          unit_price: number;
          discount_percent: number;
          discount_amount: number;
          products: { name: string; base_cost: number | null }[] | { name: string; base_cost: number | null } | null;
        };
        const norm = ((abonoSaleItems ?? []) as RawAbonoIt[]).map((it) => ({
          sale_id: it.sale_id,
          quantity: it.quantity,
          unit_price: it.unit_price,
          discount_percent: it.discount_percent,
          discount_amount: it.discount_amount,
          products: Array.isArray(it.products) ? it.products[0] || null : it.products,
        }));
        const grouped = new Map<string, SaleItemMarginRow[]>();
        for (const it of norm) {
          const row: SaleItemMarginRow = {
            quantity: it.quantity,
            unit_price: it.unit_price,
            discount_percent: it.discount_percent,
            discount_amount: it.discount_amount,
            products: it.products,
          };
          const list = grouped.get(it.sale_id) ?? [];
          list.push(row);
          grouped.set(it.sale_id, list);
        }
        const marginBySale = new Map<string, number>();
        for (const [sid, list] of grouped) {
          marginBySale.set(sid, grossMarginFromItemRows(list));
        }
        const payBySale = new Map<string, number>();
        for (const p of abonosPeriod) {
          if (!isCreditPaymentCashInflow(p)) continue;
          const c = p.customer_credits;
          const row = Array.isArray(c) ? c[0] : c;
          const sid = row?.sale_id ? String(row.sale_id) : null;
          if (!sid) continue;
          const pay = Number(p.amount ?? 0);
          if (pay <= 0) continue;
          payBySale.set(sid, (payBySale.get(sid) ?? 0) + pay);
        }
        for (const [sid, totalPayInPeriod] of payBySale) {
          const saleM = marginBySale.get(sid) ?? 0;
          if (saleM <= 0) continue;
          const storeRev = storeRevBySale.get(sid) ?? 0;
          const denom = Math.max(storeRev, totalPayInPeriod, 1);
          const frac = Math.min(1, totalPayInPeriod / denom);
          marginFromAbonos += frac * saleM;
        }
      }

      const grossProfit = Math.round(marginPaidSales + marginFromAbonos);
      const netProfit = Math.round(totalIncome);

      // Garantías gestionadas en el período
      let warrantiesCount = 0;
      const { data: warrantiesInPeriod } = await supabase
        .from("warranties")
        .select("id, branch_id, sales(branch_id)")
        .gte("created_at", start)
        .lte("created_at", end);
      if (cancelled) return;
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
      });
      } catch (err) {
        console.error("[dashboard] Error cargando datos", err);
        if (!cancelled) setDashboardData(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [branchId, branchResolved, dateFilterMode, selectedDay, dateFrom, dateTo, refreshKey, reportsFullAccess]);

  const formatDate = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const dateToCheck = new Date(date);
    dateToCheck.setHours(0, 0, 0, 0);

    if (dateToCheck.getTime() === today.getTime()) {
      return "Hoy";
    } else if (dateToCheck.getTime() === yesterday.getTime()) {
      return "Ayer";
    } else {
      return dateToLocaleDateString(date);
    }
  };

  const dateToLocaleDateString = (date: Date) => {
    return date.toLocaleDateString("es-ES", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });
  };

  const formatRange = (from: Date, to: Date) => {
    const sameYear = from.getFullYear() === to.getFullYear();
    const fmt = (d: Date, short = false) =>
      d.toLocaleDateString("es-ES", {
        day: "numeric",
        month: "short",
        ...(short ? {} : { year: "numeric" }),
      });
    if (from.getTime() === to.getTime()) return fmt(from);
    return sameYear ? `${fmt(from, true)} - ${fmt(to)}` : `${fmt(from)} - ${fmt(to)}`;
  };
  const effectiveDateMode = reportsFullAccess ? dateFilterMode : "today";
  const periodLabel =
    effectiveDateMode === "today" ? formatDate(selectedDay) : formatRange(dateFrom, dateTo);

  const data = dashboardData ?? {
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
  };
  const totalExpensesDay = data.totalExpensesCash + data.totalExpensesTransfer;
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

  return (
    <div className="mx-auto min-w-0 max-w-[1600px] space-y-10 font-sans text-[13px] font-normal leading-normal tracking-normal text-slate-800 antialiased dark:text-slate-100">
      <header className="min-w-0 rounded-2xl bg-white px-4 py-3.5 shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-slate-900 dark:shadow-none sm:px-5 sm:py-4">
        <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center lg:justify-between lg:gap-4">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              {periodLabel}
            </p>
            <h1 className="mt-0.5 text-base font-semibold tracking-tight text-slate-900 dark:text-slate-50 sm:text-lg">
              Reportes
            </h1>
            <p className="mt-0.5 text-[12px] font-medium leading-snug text-slate-500 dark:text-slate-400 sm:text-[13px]">
              {reportsFullAccess
                ? "Ventas y caja por sucursal y período."
                : "Ventas y caja del día (vista diaria)."}
            </p>
          </div>
          <div className="min-w-0 lg:max-w-[min(100%,52rem)] lg:flex-1">
            <div className="flex min-w-0 flex-wrap items-center gap-1.5 sm:gap-2 lg:flex-nowrap lg:justify-end">
              {reportsFullAccess ? (
                <div className="inline-grid shrink-0 grid-cols-2 rounded-lg bg-slate-100/90 p-0.5 dark:bg-slate-800/60">
                  <button
                    type="button"
                    onClick={() => setDateFilterMode("today")}
                    className={`rounded-md px-2.5 py-1.5 text-center text-[11px] font-semibold transition-all sm:px-3 sm:py-2 sm:text-[12px] ${
                      dateFilterMode === "today"
                        ? "bg-white text-[color:var(--shell-sidebar)] shadow-[0_1px_2px_rgba(15,23,42,0.06)] dark:bg-slate-900 dark:text-zinc-300"
                        : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
                    }`}
                  >
                    Hoy
                  </button>
                  <button
                    type="button"
                    onClick={() => setDateFilterMode("range")}
                    className={`rounded-md px-2.5 py-1.5 text-center text-[11px] font-semibold transition-all sm:px-3 sm:py-2 sm:text-[12px] ${
                      dateFilterMode === "range"
                        ? "bg-white text-[color:var(--shell-sidebar)] shadow-[0_1px_2px_rgba(15,23,42,0.06)] dark:bg-slate-900 dark:text-zinc-300"
                        : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
                    }`}
                  >
                    Rango
                  </button>
                </div>
              ) : (
                <div
                  className="shrink-0 rounded-lg bg-slate-100/90 px-2.5 py-1.5 text-center text-[11px] font-semibold text-[color:var(--shell-sidebar)] sm:text-[12px] dark:bg-slate-800/60 dark:text-zinc-300"
                  title="Tu rol solo permite ver el reporte por día"
                >
                  Solo día
                </div>
              )}
              {effectiveDateMode === "today" ? (
                <div className="min-w-0 flex-1 sm:max-w-[200px] lg:max-w-[220px]">
                  <DatePickerCard
                    id="dashboard-date-today-header"
                    value={selectedDay}
                    onChange={(d) => d && setSelectedDay(d)}
                    max={today}
                    allowClear={false}
                    size="sm"
                    fullWidth
                    aria-label="Seleccionar día"
                  />
                </div>
              ) : (
                <div className="flex min-w-0 shrink-0 items-center gap-1.5">
                  <DatePickerCard
                    id="dashboard-date-from-header"
                    value={dateFrom}
                    onChange={(d) => d && setDateFrom(d)}
                    max={dateTo}
                    allowClear={false}
                    size="sm"
                    fullWidth={false}
                    aria-label="Fecha desde"
                  />
                  <span className="shrink-0 text-[12px] font-medium text-slate-400 dark:text-slate-500" aria-hidden>
                    —
                  </span>
                  <DatePickerCard
                    id="dashboard-date-to-header"
                    value={dateTo}
                    onChange={(d) => d && setDateTo(d)}
                    min={dateFrom}
                    max={today}
                    allowClear={false}
                    size="sm"
                    fullWidth={false}
                    aria-label="Fecha hasta"
                  />
                </div>
              )}
              <button
                type="button"
                onClick={() => setRefreshKey((k) => k + 1)}
                title="Actualizar datos"
                className="inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-lg bg-slate-100/90 px-2.5 text-[12px] font-medium text-slate-700 transition-colors hover:bg-slate-200/70 sm:h-9 sm:gap-2 sm:rounded-xl sm:px-3 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span className="sr-only sm:not-sr-only">Actualizar</span>
              </button>
              <button
                onClick={() => setHideSensitiveInfo(!hideSensitiveInfo)}
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100/90 text-slate-600 transition-colors hover:bg-slate-200/70 sm:h-9 sm:w-9 sm:rounded-xl dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                title={hideSensitiveInfo ? "Mostrar información" : "Ocultar información sensible"}
              >
              {hideSensitiveInfo ? (
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                </svg>
              ) : (
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              )}
              </button>
            </div>
          </div>
        </div>
      </header>

      {loading ? (
        <div
          className="min-h-[300px] animate-pulse rounded-3xl bg-slate-100/90 dark:bg-[#121212]"
          aria-busy
          aria-label="Cargando reportes"
        />
      ) : (
        <>
          <div className="space-y-5 sm:space-y-6">
            <div className="rounded-3xl bg-white px-4 py-6 sm:px-7 sm:py-8 lg:px-8 lg:py-9 dark:bg-[#121212]">
              <div className="mb-4 flex flex-wrap items-center gap-2 sm:mb-5">
                <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-400 dark:text-slate-500 sm:text-[11px]">
                  Resumen del período
                </p>
                <InfoTip ariaLabel="Qué muestra el resumen del período">
                  Aquí ves el <strong className="font-semibold">dinero en caja</strong> del período (cobros y abonos, menos
                  egresos) y, aparte, el <strong className="font-semibold">margen bruto</strong> según el costo cargado en
                  cada producto. Son dos lecturas distintas a un balance contable formal.
                </InfoTip>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:items-stretch sm:gap-4 lg:gap-5">
                <DashboardHeroMetric
                  label="Neto en caja del período"
                  valueStr={formatSensitiveValue(data.totalIncome)}
                  numericValue={data.totalIncome}
                  prevNumeric={data.prevPeriodNetTotal}
                  showDelta={showHeroDeltas}
                  hideSensitive={hideSensitiveInfo}
                  icon={<CircleDollarSign aria-hidden strokeWidth={2} />}
                  infoTip={
                    <>
                      Cobros de ventas y abonos a crédito del período, menos todos los egresos registrados. Es el dinero
                      disponible entre efectivo y transferencia.
                    </>
                  }
                />
                <DashboardHeroMetric
                  label="Efectivo (neto)"
                  valueStr={formatSensitiveValue(data.cash)}
                  numericValue={data.cash}
                  prevNumeric={data.prevPeriodNetCash}
                  showDelta={showHeroDeltas}
                  hideSensitive={hideSensitiveInfo}
                  icon={<Banknote aria-hidden strokeWidth={2} />}
                  infoTip={
                    <>Ingresos en efectivo del período menos egresos que pagaste en efectivo.</>
                  }
                />
                <DashboardHeroMetric
                  label="Transferencia (neto)"
                  valueStr={formatSensitiveValue(data.transfer)}
                  numericValue={data.transfer}
                  prevNumeric={data.prevPeriodNetTransfer}
                  showDelta={showHeroDeltas}
                  hideSensitive={hideSensitiveInfo}
                  icon={<Landmark aria-hidden strokeWidth={2} />}
                  infoTip={
                    <>Ingresos por transferencia del período menos egresos pagados por transferencia.</>
                  }
                />
              </div>

              <DashboardReportSection eyebrow="Salidas y ajustes" gridClass="sm:grid-cols-3">
              <DashboardKpiCard
                icon={<TrendingDown aria-hidden strokeWidth={2} />}
                label="Egresos"
                value={formatSensitiveValue(totalExpensesDay)}
                infoTip={
                  <>
                    Dinero que registraste como salida: compras, gastos operativos, pago a proveedores, compra de mercancía,
                    etc. Reduce el neto en caja del período.
                  </>
                }
              />
              <DashboardKpiCard
                icon={<CircleX aria-hidden strokeWidth={2} />}
                label="Facturas anuladas"
                value={
                  data.cancelledInvoices > 0
                    ? `${data.cancelledInvoices} (${formatSensitiveValue(data.cancelledTotal)})`
                    : "0"
                }
                infoTip={<>Cantidad de facturas canceladas en el período y suma de sus montos.</>}
              />
              <DashboardKpiCard
                icon={<ShieldCheck aria-hidden strokeWidth={2} />}
                label="Garantías"
                value={formatSensitiveValue(data.warrantiesCount, "number")}
                infoTip={
                  <>
                    Garantías creadas en el período. Devoluciones: monto reembolsado asociado (
                    {formatSensitiveValue(data.warrantiesRefundAmount)}).
                  </>
                }
              />
            </DashboardReportSection>

            {reportsFullAccess ? (
              <>
                <DashboardReportSection eyebrow="Inventario y resultado" gridClass="sm:grid-cols-2 lg:grid-cols-4">
                  <DashboardKpiCard
                    icon={<Package aria-hidden strokeWidth={2} />}
                    label="Stock total"
                    value={formatSensitiveValue(data.totalStockInvestment)}
                    infoTip={
                      <>
                        Cantidad en bodega × costo del producto en el catálogo. No usa la tabla de egresos: es el valor del
                        inventario al costo cargado en cada producto.
                      </>
                    }
                  />
                  <DashboardKpiCard
                    icon={<LineChart aria-hidden strokeWidth={2} />}
                    label="Margen bruto"
                    value={formatSensitiveValue(data.grossProfit)}
                    infoTip={
                      <>
                        Suma de (precio de venta − costo del producto) × cantidad en líneas de ventas cobradas. Conviene tener el
                        costo actualizado en el catálogo para que refleje la realidad.
                      </>
                    }
                  />
                  <DashboardKpiCard
                    icon={<PiggyBank aria-hidden strokeWidth={2} />}
                    label="Resultado en caja"
                    value={formatSensitiveValue(data.netProfit)}
                    infoTip={
                      <>
                        Cobros más abonos, menos egresos del período. Coincide con «Neto en caja del período» en el bloque
                        superior.
                      </>
                    }
                  />
                  <DashboardKpiCard
                    icon={<CreditCard aria-hidden strokeWidth={2} />}
                    label="Créditos"
                    value={formatSensitiveValue(data.outstandingCredits)}
                    infoTip={<>Saldo pendiente por cobrar en ventas a crédito (esta sucursal).</>}
                  />
                </DashboardReportSection>
              </>
            ) : null}
            </div>

            {reportsFullAccess ? (
            <section className="rounded-3xl bg-white px-5 py-6 sm:px-8 sm:py-7 dark:bg-[#121212]">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500">Tendencia de ingresos</p>
              <div
                className="relative mt-4 min-h-[220px] h-56 w-full min-w-0 sm:h-60"
                role="region"
                aria-label={`Gráfico de ingresos de los últimos ${INCOME_TREND_DAY_COUNT} días`}
              >
                <IncomeTrendChart days={data.last15Days} hideSensitiveInfo={hideSensitiveInfo} />
              </div>
          <div className="mt-4 flex flex-col gap-2 text-center sm:flex-row sm:flex-nowrap sm:items-center sm:justify-between sm:gap-4 sm:text-left sm:whitespace-nowrap">
            <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
              Promedio diario ({INCOME_TREND_DAY_COUNT} días calendario, con $0):{" "}
              <span className="font-bold text-slate-900 dark:text-slate-50">
                {hideSensitiveInfo
                  ? "***"
                  : (() => {
                      const total = data.last15Days.reduce((a, d) => a + d.sales, 0);
                      return `$${Math.round(total / INCOME_TREND_DAY_COUNT).toLocaleString("es-CO")}`;
                    })()}
              </span>
            </div>
            <div className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
              Total ({INCOME_TREND_DAY_COUNT} días):{" "}
              <span className="font-bold text-slate-900 dark:text-slate-50">
                {hideSensitiveInfo ? "***" : `$${data.last15Days.reduce((a, d) => a + d.sales, 0).toLocaleString("es-CO")}`}
              </span>
            </div>
          </div>
        </section>
            ) : null}
      </div>
        </>
      )}
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
      const { start, end } = getDayBounds(selectedDate);

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

