"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { useMemo } from "react";
import DatePickerCard from "@/app/components/DatePickerCard";
import { InfoTip } from "@/app/components/InfoTip";
import {
  EXPENSE_KIND_BADGE_STYLES,
  EXPENSE_KIND_LABELS,
  type ExpenseConceptKind,
} from "@/lib/expense-concept-kind";
import {
  buildRecentActivities,
  DASHBOARD_CARD_ITEM_LIMIT,
  saleChannelLabel,
  saleStatusLabel,
  saleStatusTone,
  sparklinePath,
  storeIncomeFromSale,
  type DashboardActivity,
  type DashboardActivityKind,
  type DashboardPaymentSlice,
} from "@/lib/dashboard-berea";
import {
  dashboardExpensesLabel,
  dashboardMarginKpiLabel,
  dashboardSalesKpiLabel,
  STORE_TECH_COPY,
} from "@/lib/store-tech-copy";

const D = STORE_TECH_COPY.dashboard;

const IncomeTrendChart = dynamic(
  () => import("@/app/components/IncomeTrendChart").then((m) => m.IncomeTrendChart),
  {
    ssr: false,
    loading: () => (
      <div className="h-full min-h-[220px] w-full animate-pulse rounded-xl bg-[var(--shell-workspace)]" aria-hidden />
    ),
  }
);

export type BereaDashboardProps = {
  loading: boolean;
  /** Recarga en segundo plano sin ocultar el reporte ya visible. */
  refreshing?: boolean;
  hideSensitive: boolean;
  onToggleHideSensitive: () => void;
  onRefresh: () => void;
  userName: string;
  reportsFullAccess: boolean;
  dateFilterMode: "today" | "range";
  onDateFilterMode: (mode: "today" | "range") => void;
  selectedDay: Date;
  onSelectedDay: (d: Date) => void;
  dateFrom: Date;
  dateTo: Date;
  onDateFrom: (d: Date) => void;
  onDateTo: (d: Date) => void;
  today: Date;
  /** Día seleccionado coincide con el calendario de hoy (modo “Hoy” en vivo). */
  isViewingCalendarToday?: boolean;
  showDeltas: boolean;
  formatValue: (n: number, type?: "currency" | "number") => string;
  kpis: {
    sales: number;
    salesPrev: number;
    grossProfit: number;
    cash: number;
    cashCollected: number;
    cashExpenses: number;
    cashPrev: number;
    transfer: number;
    transferCollected: number;
    transferExpenses: number;
    transferPrev: number;
    netCashTotal: number;
    stockInvestment: number;
    salesSpark: number[];
    cashSpark: number[];
    transferSpark: number[];
  };
  paymentMix: DashboardPaymentSlice[];
  trendDays: { day: string; sales: number; previousSales?: number }[];
  recentOrders: Array<{
    id: string;
    invoice_number: string;
    customer_name: string;
    channel_label: string;
    total: number;
    status: string;
    created_at: string;
  }>;
  topProducts: Array<{ id: string; name: string; units: number; total: number }>;
  activities: DashboardActivity[];
  totalExpenses: number;
  operationalExpenses: number;
  inventoryExpenses: number;
  recentExpenses: Array<{
    id: string;
    concept: string;
    conceptKind: ExpenseConceptKind;
    amount: number;
    payment_method: "cash" | "transfer";
    created_at: string;
  }>;
};

function ProductListIcon() {
  return (
    <span
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--shell-workspace)] text-[var(--berea-accent)]"
      aria-hidden
    >
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
        />
      </svg>
    </span>
  );
}

const TOP_PRODUCTS_LIMIT = DASHBOARD_CARD_ITEM_LIMIT;

function bereaEnterStyle(index: number): CSSProperties {
  return { ["--berea-enter-i" as string]: index };
}

function bereaEnterItemStyle(itemIndex: number): CSSProperties {
  return { ["--berea-item-i" as string]: itemIndex };
}

function TopProductsCard({
  products,
  hideSensitive,
  formatValue,
  enterIndex,
}: {
  products: Array<{ id: string; name: string; units: number; total: number }>;
  hideSensitive: boolean;
  formatValue: (n: number, type?: "currency" | "number") => string;
  enterIndex?: number;
}) {
  const visibleProducts = products.slice(0, TOP_PRODUCTS_LIMIT);

  return (
    <BereaCard enterIndex={enterIndex} className="flex min-w-0 flex-col p-3 sm:p-4 lg:col-span-5">
      <div
        className="berea-enter-layer mb-3 flex items-center justify-between gap-2"
        style={bereaEnterItemStyle(0)}
      >
        <h2 className="text-[15px] font-semibold text-[var(--berea-ink)]">{D.topProducts}</h2>
        <Link href="/ventas" className="berea-card-more-inline">
          Ver todos
        </Link>
      </div>
      <ul className="berea-enter-layer space-y-2.5" style={bereaEnterItemStyle(1)}>
        {visibleProducts.length === 0 ? (
          <li className="text-[12px] text-[var(--berea-ink-muted)]">Sin ventas de productos en el período.</li>
        ) : (
          visibleProducts.map((p, index) => (
            <li key={`${p.id}-${index}`} className="flex items-center gap-2.5">
              <ProductListIcon />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[12px] font-medium leading-snug text-[var(--berea-ink)]">{p.name}</p>
                {!hideSensitive ? (
                  <p className="mt-0.5 text-[10px] tabular-nums text-[var(--berea-ink-subtle)]">
                    {formatValue(p.total)}
                  </p>
                ) : null}
              </div>
              <div className="shrink-0 text-right">
                <p className="text-base font-semibold leading-none tabular-nums text-[var(--berea-accent)]">
                  {hideSensitive ? "**" : p.units}
                </p>
                <p className="mt-0.5 text-[10px] text-[var(--berea-ink-subtle)]">unidades</p>
              </div>
            </li>
          ))
        )}
      </ul>
    </BereaCard>
  );
}

function TrendUpIcon({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
    </svg>
  );
}

function TrendDownIcon({ className = "h-3.5 w-3.5" }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  );
}

function KpiMetricIcon({ children }: { children: ReactNode }) {
  return (
    <span
      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[var(--shell-workspace)] text-[var(--berea-ink-muted)]"
      aria-hidden
    >
      {children}
    </span>
  );
}

const KPI_ICONS = {
  sales: (
    <KpiMetricIcon>
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
        />
      </svg>
    </KpiMetricIcon>
  ),
  orders: (
    <KpiMetricIcon>
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
        />
      </svg>
    </KpiMetricIcon>
  ),
  units: (
    <KpiMetricIcon>
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
        />
      </svg>
    </KpiMetricIcon>
  ),
  customers: (
    <KpiMetricIcon>
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
        />
      </svg>
    </KpiMetricIcon>
  ),
  cash: (
    <KpiMetricIcon>
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"
        />
      </svg>
    </KpiMetricIcon>
  ),
  transfer: (
    <KpiMetricIcon>
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
        />
      </svg>
    </KpiMetricIcon>
  ),
  stock: (
    <KpiMetricIcon>
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
        />
      </svg>
    </KpiMetricIcon>
  ),
} as const;

function KpiPercentTrend({
  cur,
  prev,
  hide,
  showDelta,
  hint,
}: {
  cur: number;
  prev: number;
  hide: boolean;
  showDelta: boolean;
  hint?: string;
}) {
  if (hint) {
    return <span className="text-[10px] font-medium text-[var(--berea-ink-subtle)]">{hint}</span>;
  }
  if (hide) {
    return <span className="text-[10px] font-medium text-[var(--berea-ink-subtle)]">***</span>;
  }
  if (!showDelta) {
    return <span className="text-[10px] font-medium text-[var(--berea-ink-subtle)]">Período seleccionado</span>;
  }
  if (prev <= 0) {
    return null;
  }
  const pct = Math.round((Math.abs((cur - prev) / prev) * 1000)) / 10;
  const up = cur >= prev;
  const color = up ? "text-emerald-700" : "text-rose-600";
  return (
    <span className={`inline-flex items-center gap-0.5 text-[10px] font-semibold tabular-nums ${color}`}>
      {up ? <TrendUpIcon /> : <TrendDownIcon />}
      {pct}% vs ayer
    </span>
  );
}

function kpiTrendIsUp(cur: number, prev: number, showDelta: boolean): boolean {
  if (!showDelta) return true;
  if (prev <= 0) return cur > 0;
  return cur >= prev;
}

function BereaCard({
  className = "",
  children,
  enterIndex,
  enterVariant = "default",
}: {
  className?: string;
  children: ReactNode;
  enterIndex?: number;
  enterVariant?: "default" | "kpi";
}) {
  return (
    <section
      className={`rounded-xl ${reportsSurfaceClass} ${
        enterIndex !== undefined ? `berea-card-enter ${enterVariant === "kpi" ? "berea-kpi-card" : ""}` : ""
      } ${className}`}
      style={enterIndex !== undefined ? bereaEnterStyle(enterIndex) : undefined}
    >
      {children}
    </section>
  );
}

function ActivityFeedIcon({ kind }: { kind: DashboardActivityKind }) {
  const pathByKind: Record<DashboardActivityKind, string> = {
    sale: "M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z",
    credit: "M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z",
    customer: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z",
    product: "M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4",
    category: "M7 7h10v10H7V7zM4 7h16M4 17h16",
    expense: "M19 14l-7 7m0 0l-7-7m7 7V3",
    warranty: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z",
    user: "M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z",
    system: "M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
  };

  return (
    <span
      className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center text-[var(--berea-accent)]"
      aria-hidden
    >
      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={pathByKind[kind]} />
      </svg>
    </span>
  );
}

function RecentActivityCard({
  activities,
  enterIndex,
}: {
  activities: DashboardActivity[];
  enterIndex?: number;
}) {
  const visibleActivities = activities.slice(0, DASHBOARD_CARD_ITEM_LIMIT);

  return (
    <BereaCard enterIndex={enterIndex} className="flex flex-col p-4 sm:p-5">
      <h2
        className="berea-enter-layer text-[15px] font-semibold text-[var(--berea-ink)]"
        style={bereaEnterItemStyle(0)}
      >
        {D.activities}
      </h2>
      <ul className="berea-enter-layer mt-3 space-y-2.5" style={bereaEnterItemStyle(1)}>
        {visibleActivities.length === 0 ? (
          <li className="text-[12px] text-[var(--berea-ink-muted)]">Sin actividad en el período.</li>
        ) : (
          visibleActivities.map((a) => (
            <li key={a.id} className="flex items-start gap-2.5">
              <ActivityFeedIcon kind={a.kind} />
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-[12px] font-medium leading-snug text-[var(--berea-ink)]">{a.title}</p>
                  <span className="shrink-0 pt-0.5 text-[10px] font-medium tabular-nums text-[var(--berea-ink-subtle)]">
                    {a.rel}
                  </span>
                </div>
                {a.detail ? (
                  <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-[var(--berea-ink-muted)]">
                    {a.detail}
                  </p>
                ) : null}
              </div>
            </li>
          ))
        )}
      </ul>
      <Link
        href="/actividades"
        className="berea-card-more berea-enter-layer"
        style={bereaEnterItemStyle(2)}
      >
        Ver todas las actividades
      </Link>
    </BereaCard>
  );
}

function KpiCard({
  icon,
  label,
  labelSuffix,
  value,
  valueClassName,
  cur,
  prev,
  spark,
  hide,
  showDelta,
  comparisonHint,
  subdetail,
  enterIndex,
}: {
  icon: ReactNode;
  label: string;
  labelSuffix?: ReactNode;
  value: string;
  valueClassName?: string;
  cur: number;
  prev: number;
  spark: number[];
  hide: boolean;
  showDelta: boolean;
  comparisonHint?: string;
  subdetail?: ReactNode;
  enterIndex?: number;
}) {
  const path = sparklinePath(spark);
  const trendUp = kpiTrendIsUp(cur, prev, showDelta && !comparisonHint);
  const sparkColor = !showDelta || comparisonHint
    ? "text-[var(--berea-accent)]"
    : trendUp
      ? "text-emerald-600"
      : "text-rose-500";
  const showTrend = showDelta || Boolean(comparisonHint);
  const showSpark = !hide && Boolean(path);

  return (
    <BereaCard enterIndex={enterIndex} enterVariant="kpi" className="flex min-h-0 flex-col p-3 sm:p-3.5">
      <div className="berea-enter-layer flex min-w-0 items-center gap-2" style={bereaEnterItemStyle(0)}>
        {icon}
        <div className="flex min-w-0 flex-1 items-center gap-1 text-[12px] font-semibold leading-none text-[var(--berea-ink)] sm:text-[13px]">
          <span className="leading-snug">{label}</span>
          {labelSuffix}
        </div>
      </div>

      <div className="mt-2 flex min-w-0 items-end justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p
            className={`berea-enter-value text-xl font-semibold leading-none tabular-nums tracking-tight sm:text-[1.35rem] ${
              valueClassName ?? "text-[var(--berea-ink)]"
            }`}
          >
            {value}
          </p>
          {subdetail ? (
            <div
              className="berea-enter-layer mt-1.5 text-[11px] leading-snug text-[var(--berea-ink-muted)]"
              style={bereaEnterItemStyle(2)}
            >
              {subdetail}
            </div>
          ) : null}
        </div>
        {showSpark ? (
          <svg
            width={64}
            height={26}
            viewBox="0 0 72 28"
            className={`berea-sparkline-draw mb-0.5 shrink-0 ${sparkColor}`}
            aria-hidden
          >
            <path
              d={path}
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        ) : null}
      </div>

      {showTrend ? (
        <div
          className="berea-enter-layer mt-2 border-t border-[var(--berea-card-border)] pt-2"
          style={bereaEnterItemStyle(3)}
        >
          <KpiPercentTrend cur={cur} prev={prev} hide={hide} showDelta={showDelta} hint={comparisonHint} />
        </div>
      ) : null}
    </BereaCard>
  );
}

function formatTotalEnCajaSubdetail(
  cash: number,
  transfer: number,
  hide: boolean,
  formatValue: (n: number, type?: "currency" | "number") => string
): ReactNode {
  const total = cash + transfer;
  if (hide) return <span>Total en caja: ***</span>;
  return (
    <span>
      Total en caja:{" "}
      <span className="font-semibold tabular-nums text-[var(--berea-accent)]">{formatValue(total)}</span>
    </span>
  );
}

function formatStockKpiSubdetail(
  grossProfit: number,
  marginLabel: string,
  hide: boolean,
  formatValue: (n: number, type?: "currency" | "number") => string
): ReactNode {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[var(--berea-ink-muted)]">Costo en inventario</span>
      {hide ? (
        <span>
          {marginLabel}: ***
        </span>
      ) : (
        <span>
          {marginLabel}:{" "}
          <span className="font-semibold tabular-nums text-emerald-800">{formatValue(grossProfit)}</span>
        </span>
      )}
    </div>
  );
}

function formatCashFlowSubdetail(
  collected: number,
  expenses: number,
  hide: boolean,
  formatValue: (n: number, type?: "currency" | "number") => string
): ReactNode {
  if (hide) {
    return (
      <div className="flex flex-col gap-0.5">
        <span>Entró ***</span>
        <span>Salió ***</span>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-0.5">
      <span>
        Entró <span className="font-semibold tabular-nums text-emerald-800">{formatValue(collected)}</span>
      </span>
      <span>
        Salió <span className="font-semibold tabular-nums text-rose-700">{formatValue(expenses)}</span>
      </span>
    </div>
  );
}

/** Misma superficie que el buscador del navbar (fondo blanco + borde fino). */
const reportsSurfaceClass = "berea-reports-surface";
const reportsDividerClass = "berea-reports-divider";

const STATUS_STYLES: Record<string, string> = {
  success: "bg-emerald-50 text-emerald-800 ring-emerald-200/80",
  warning: "bg-amber-50 text-amber-900 ring-amber-200/80",
  info: "bg-sky-50 text-sky-900 ring-sky-200/80",
  danger: "bg-rose-50 text-rose-800 ring-rose-200/80",
};

const PAYMENT_LABELS: Record<string, string> = {
  cash: "Efectivo",
  transfer: "Transferencia",
};

function formatExpenseTime(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" });
}

function PeriodExpensesCard({
  expenses,
  total,
  operationalExpenses,
  inventoryExpenses,
  netCashTotal,
  hideSensitive,
  formatValue,
  periodLabel,
  enterIndex,
}: {
  expenses: BereaDashboardProps["recentExpenses"];
  total: number;
  operationalExpenses: number;
  inventoryExpenses: number;
  netCashTotal: number;
  hideSensitive: boolean;
  formatValue: (n: number, type?: "currency" | "number") => string;
  periodLabel: string;
  enterIndex?: number;
}) {
  const visible = expenses.slice(0, DASHBOARD_CARD_ITEM_LIMIT);

  return (
    <BereaCard enterIndex={enterIndex} className="flex flex-col p-4 sm:p-5">
      <div
        className="berea-enter-layer mb-3 flex items-start justify-between gap-2"
        style={bereaEnterItemStyle(0)}
      >
        <div className="min-w-0">
          <h2 className="flex items-center gap-1 text-[15px] font-semibold text-[var(--berea-ink)]">
            {periodLabel}
            <InfoTip tone="berea" ariaLabel="Qué significan los egresos">
              Dinero que salió del negocio. Resta de caja según pagaste: efectivo o transferencia.
            </InfoTip>
          </h2>
          <p className="berea-enter-value mt-0.5 text-lg font-semibold tabular-nums tracking-tight text-[var(--berea-ink)]">
            {hideSensitive ? "***" : formatValue(total)}
          </p>
          {!hideSensitive ? (
            <div className="mt-1 space-y-0.5 text-[11px] text-[var(--berea-ink-muted)]">
              <p>Operativos: {formatValue(operationalExpenses)}</p>
              <p>Compras inventario: {formatValue(inventoryExpenses)}</p>
              <p className="pt-0.5 font-medium text-[var(--berea-ink)]">
                Saldo neto en caja: {formatValue(netCashTotal)}
              </p>
            </div>
          ) : null}
        </div>
        <Link
          href="/egresos/nuevo"
          className="shrink-0 rounded-lg bg-[color:var(--shell-sidebar)] px-2.5 py-1.5 text-[11px] font-semibold text-white transition-colors hover:bg-[color:var(--shell-sidebar-cta-hover)]"
        >
          + Egreso
        </Link>
      </div>
      <ul className="berea-enter-layer space-y-2.5" style={bereaEnterItemStyle(1)}>
        {visible.length === 0 ? (
          <li className="text-[12px] text-[var(--berea-ink-muted)]">Sin egresos registrados en este período.</li>
        ) : (
          visible.map((e) => (
            <li key={e.id}>
              <Link
                href={`/egresos/${e.id}`}
                className="flex items-start justify-between gap-2 rounded-lg px-1 py-0.5 transition-colors hover:bg-[var(--shell-workspace)]"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <p className="min-w-0 truncate text-[12px] font-medium text-[var(--berea-ink)]">{e.concept}</p>
                    <span
                      className={`inline-flex shrink-0 items-center rounded px-1 py-0.5 text-[9px] font-semibold uppercase tracking-wide ring-1 ring-inset ${EXPENSE_KIND_BADGE_STYLES[e.conceptKind]}`}
                    >
                      {EXPENSE_KIND_LABELS[e.conceptKind]}
                    </span>
                  </div>
                  <p className="mt-0.5 text-[10px] text-[var(--berea-ink-subtle)]">
                    {formatExpenseTime(e.created_at)} · {PAYMENT_LABELS[e.payment_method] ?? e.payment_method}
                  </p>
                </div>
                <p className="shrink-0 text-[12px] font-semibold tabular-nums text-rose-700">
                  {hideSensitive ? "***" : formatValue(e.amount)}
                </p>
              </Link>
            </li>
          ))
        )}
      </ul>
      <Link
        href="/egresos"
        className="berea-card-more berea-enter-layer"
        style={bereaEnterItemStyle(2)}
      >
        Ver todos los egresos
      </Link>
    </BereaCard>
  );
}

function describeDonutSlice(
  startAngle: number,
  endAngle: number,
  cx: number,
  cy: number,
  outerR: number,
  innerR: number
): string {
  const start = (startAngle * Math.PI) / 180;
  const end = (endAngle * Math.PI) / 180;
  const x1 = cx + outerR * Math.cos(start);
  const y1 = cy + outerR * Math.sin(start);
  const x2 = cx + outerR * Math.cos(end);
  const y2 = cy + outerR * Math.sin(end);
  const x3 = cx + innerR * Math.cos(end);
  const y3 = cy + innerR * Math.sin(end);
  const x4 = cx + innerR * Math.cos(start);
  const y4 = cy + innerR * Math.sin(start);
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;
  return [
    `M ${x1} ${y1}`,
    `A ${outerR} ${outerR} 0 ${largeArc} 1 ${x2} ${y2}`,
    `L ${x3} ${y3}`,
    `A ${innerR} ${innerR} 0 ${largeArc} 0 ${x4} ${y4}`,
    "Z",
  ].join(" ");
}

function PaymentMixDonut({ slices }: { slices: DashboardPaymentSlice[] }) {
  const active = slices.filter((s) => s.value > 0);
  const total = active.reduce((sum, s) => sum + s.value, 0);
  if (total <= 0) {
    return <div className="absolute inset-0 rounded-full bg-[var(--berea-card-border)]" aria-hidden />;
  }
  let angle = -90;
  return (
    <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" aria-hidden>
      {active.map((slice) => {
        const sweep = (slice.value / total) * 360;
        const start = angle;
        const end = angle + sweep;
        angle = end;
        return (
          <path key={slice.key} d={describeDonutSlice(start, end, 50, 50, 42, 28)} fill={slice.color} />
        );
      })}
    </svg>
  );
}

export default function BereaReportsDashboard(props: BereaDashboardProps) {
  const {
    loading,
    refreshing = false,
    hideSensitive,
    onToggleHideSensitive,
    onRefresh,
    userName,
    reportsFullAccess,
    dateFilterMode,
    onDateFilterMode,
    selectedDay,
    onSelectedDay,
    dateFrom,
    dateTo,
    onDateFrom,
    onDateTo,
    today,
    isViewingCalendarToday = true,
    showDeltas,
    formatValue,
    kpis,
    paymentMix,
    trendDays,
    recentOrders,
    topProducts,
    activities,
    totalExpenses,
    operationalExpenses,
    inventoryExpenses,
    recentExpenses,
  } = props;

  const firstName = userName.trim().split(/\s+/)[0] || "equipo";
  const salesKpiLabel = dashboardSalesKpiLabel(dateFilterMode === "today" || !reportsFullAccess);
  const expensesPeriodLabel = dashboardExpensesLabel(dateFilterMode === "today" || !reportsFullAccess);
  const marginKpiLabel = dashboardMarginKpiLabel(dateFilterMode === "today" || !reportsFullAccess);
  const salesKpiSubdetail = formatTotalEnCajaSubdetail(kpis.cash, kpis.transfer, hideSensitive, formatValue);
  const stockKpiSubdetail = formatStockKpiSubdetail(
    kpis.grossProfit,
    marginKpiLabel,
    hideSensitive,
    formatValue
  );
  const cashKpiSubdetail = formatCashFlowSubdetail(
    kpis.cashCollected,
    kpis.cashExpenses,
    hideSensitive,
    formatValue
  );
  const transferKpiSubdetail = formatCashFlowSubdetail(
    kpis.transferCollected,
    kpis.transferExpenses,
    hideSensitive,
    formatValue
  );
  const cashIsNegative = kpis.cash < 0;
  const visibleOrders = recentOrders.slice(0, DASHBOARD_CARD_ITEM_LIMIT);
  const paymentTotal = useMemo(
    () => paymentMix.reduce((sum, slice) => sum + slice.value, 0),
    [paymentMix]
  );
  const topPayment = useMemo(() => {
    if (paymentMix.length === 0) return null;
    return paymentMix.reduce((best, slice) => (slice.value > best.value ? slice : best), paymentMix[0]);
  }, [paymentMix]);

  return (
    <div
      className={`berea-reports min-w-0 space-y-5 text-[14px] text-[var(--berea-ink)] sm:space-y-6${refreshing ? " berea-reports--refreshing" : ""}`}
    >
      <header
        className={`flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between ${
          loading ? "" : "berea-header-enter"
        }`}
      >
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--berea-ink)] sm:text-[1.65rem]">
            Hola, {firstName}!
          </h1>
          <p className="mt-1 text-[13px] text-[var(--berea-ink-muted)]">
            {isViewingCalendarToday && dateFilterMode === "today"
              ? D.greetingToday
              : `${D.greetingDayPrefix} ${selectedDay.toLocaleDateString("es-CO", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                })}`}
            {refreshing ? (
              <span className="ml-2 inline-flex items-center gap-1 text-[12px] text-[var(--berea-accent)]">
                <span className="berea-refresh-dot" aria-hidden />
                Actualizando…
              </span>
            ) : null}
          </p>
        </div>

        <div className="flex min-w-0 flex-wrap items-center gap-2 lg:justify-end">
          {reportsFullAccess ? (
            <div className={`inline-grid grid-cols-2 rounded-lg p-0.5 ${reportsSurfaceClass}`}>
              <button
                type="button"
                onClick={() => onDateFilterMode("today")}
                className={`rounded-md px-3 py-1.5 text-[12px] font-semibold ${
                  dateFilterMode === "today"
                    ? "bg-[var(--berea-accent)] text-[var(--shell-nav-fg)]"
                    : "text-[var(--berea-ink-muted)]"
                }`}
              >
                Hoy
              </button>
              <button
                type="button"
                onClick={() => onDateFilterMode("range")}
                className={`rounded-md px-3 py-1.5 text-[12px] font-semibold ${
                  dateFilterMode === "range"
                    ? "bg-[var(--berea-accent)] text-[var(--shell-nav-fg)]"
                    : "text-[var(--berea-ink-muted)]"
                }`}
              >
                Rango
              </button>
            </div>
          ) : null}

          {dateFilterMode === "today" || !reportsFullAccess ? (
            <DatePickerCard
              id="berea-dashboard-day"
              value={selectedDay}
              onChange={(d) => d && onSelectedDay(d)}
              max={today}
              allowClear={false}
              size="sm"
              fullWidth={false}
              triggerTone="berea"
              aria-label="Fecha del reporte"
            />
          ) : (
            <div className="flex items-center gap-1.5">
              <DatePickerCard
                id="berea-dashboard-from"
                value={dateFrom}
                onChange={(d) => d && onDateFrom(d)}
                max={dateTo}
                allowClear={false}
                size="sm"
                triggerTone="berea"
                aria-label="Desde"
              />
              <span className="text-[var(--berea-ink-subtle)]">—</span>
              <DatePickerCard
                id="berea-dashboard-to"
                value={dateTo}
                onChange={(d) => d && onDateTo(d)}
                min={dateFrom}
                max={today}
                allowClear={false}
                size="sm"
                triggerTone="berea"
                aria-label="Hasta"
              />
            </div>
          )}

          <button
            type="button"
            onClick={onRefresh}
            className={`inline-flex h-9 items-center rounded-lg px-3 text-[12px] font-semibold text-[var(--berea-ink)] hover:bg-[var(--shell-workspace)] ${reportsSurfaceClass}`}
          >
            Actualizar
          </button>
          <button
            type="button"
            onClick={onToggleHideSensitive}
            className={`inline-flex h-9 w-9 items-center justify-center rounded-lg text-[var(--berea-ink-muted)] ${reportsSurfaceClass}`}
            title={hideSensitive ? "Mostrar montos" : "Ocultar montos"}
          >
            {hideSensitive ? "◌" : "◉"}
          </button>
        </div>
      </header>

      {loading ? (
        <div className="space-y-4 md:space-y-5" aria-busy aria-label="Cargando reportes">
          <div className="grid grid-cols-1 gap-4 md:gap-5 xl:grid-cols-12">
            <div className="grid grid-cols-2 gap-2.5 sm:gap-3 md:gap-4 xl:col-span-9 xl:grid-cols-4">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className={`berea-loading-shimmer h-[5.5rem] rounded-xl ${reportsSurfaceClass}`}
                />
              ))}
            </div>
            <div className={`berea-loading-shimmer min-h-[200px] rounded-xl xl:col-span-3 ${reportsSurfaceClass}`} />
          </div>
          <div className="grid grid-cols-1 gap-4 md:gap-5 lg:grid-cols-12">
            <div className={`berea-loading-shimmer min-h-[220px] rounded-xl lg:col-span-7 ${reportsSurfaceClass}`} />
            <div className={`berea-loading-shimmer min-h-[220px] rounded-xl lg:col-span-5 ${reportsSurfaceClass}`} />
          </div>
          <div className={`berea-loading-shimmer min-h-[160px] rounded-xl ${reportsSurfaceClass}`} />
        </div>
      ) : (
        <div className={refreshing ? "pointer-events-none opacity-[0.72] transition-opacity duration-200" : undefined}>
          <div className="grid grid-cols-1 gap-4 md:gap-5 xl:grid-cols-12 xl:items-stretch">
            <div className="flex min-w-0 flex-col gap-4 md:gap-5 xl:col-span-9">
              <div className="grid grid-cols-2 gap-2.5 sm:gap-3 md:gap-4 xl:grid-cols-4">
                <KpiCard
                  enterIndex={0}
                  icon={KPI_ICONS.sales}
                  label={salesKpiLabel}
                  labelSuffix={
                    <InfoTip tone="berea" ariaLabel={D.infoTipSales}>
                      Monto facturado. Abajo: efectivo + transferencia disponibles tras egresos (no es lo vendido).
                    </InfoTip>
                  }
                  value={formatValue(kpis.sales)}
                  cur={kpis.sales}
                  prev={kpis.salesPrev}
                  hide={hideSensitive}
                  showDelta={showDeltas}
                  spark={kpis.salesSpark}
                  subdetail={salesKpiSubdetail}
                />
                <KpiCard
                  enterIndex={1}
                  icon={KPI_ICONS.cash}
                  label={D.cashKpi}
                  labelSuffix={
                    <InfoTip tone="berea" ariaLabel="Caja efectivo">
                      Parte del total en caja. Entró = cobros; salió = egresos pagados en efectivo.
                    </InfoTip>
                  }
                  value={formatValue(kpis.cash)}
                  valueClassName={cashIsNegative ? "text-rose-700" : "text-[var(--berea-ink)]"}
                  cur={kpis.cash}
                  prev={kpis.cashPrev}
                  hide={hideSensitive}
                  showDelta={showDeltas}
                  spark={kpis.cashSpark}
                  subdetail={cashKpiSubdetail}
                />
                <KpiCard
                  enterIndex={2}
                  icon={KPI_ICONS.transfer}
                  label={D.transferKpi}
                  labelSuffix={
                    <InfoTip tone="berea" ariaLabel="Caja transferencia">
                      Parte del total en caja. Entró = cobros; salió = egresos pagados por transferencia.
                    </InfoTip>
                  }
                  value={formatValue(kpis.transfer)}
                  cur={kpis.transfer}
                  prev={kpis.transferPrev}
                  hide={hideSensitive}
                  showDelta={showDeltas}
                  spark={kpis.transferSpark}
                  subdetail={transferKpiSubdetail}
                />
                <KpiCard
                  enterIndex={3}
                  icon={KPI_ICONS.stock}
                  label={D.stockKpi}
                  labelSuffix={
                    <InfoTip tone="berea" ariaLabel={D.infoTipStock}>
                      Arriba: inventario al costo. Abajo: margen bruto (precio − costo en ventas), distinto del dinero en caja.
                    </InfoTip>
                  }
                  value={formatValue(kpis.stockInvestment)}
                  cur={kpis.stockInvestment}
                  prev={kpis.stockInvestment}
                  hide={hideSensitive}
                  showDelta={false}
                  spark={[]}
                  subdetail={stockKpiSubdetail}
                />
              </div>

              <div className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-12">
                <BereaCard enterIndex={4} className="flex min-w-0 flex-col p-3 sm:p-4 lg:col-span-7">
                  <div
                    className="berea-enter-layer mb-3 flex items-center justify-between gap-2"
                    style={bereaEnterItemStyle(0)}
                  >
                    <h2 className="text-[15px] font-semibold text-[var(--berea-ink)]">{D.salesSummary}</h2>
                    <span
                      className={`inline-flex shrink-0 items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-semibold text-[var(--berea-ink-muted)] ${reportsSurfaceClass}`}
                    >
                      {D.last7Days}
                      <svg
                        className="h-3.5 w-3.5 opacity-55"
                        viewBox="0 0 16 16"
                        fill="none"
                        aria-hidden
                      >
                        <path
                          d="M4 6l4 4 4-4"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    </span>
                  </div>
                  <div className="berea-chart-reveal h-[13rem] w-full min-w-0 sm:h-[14rem]">
                    <IncomeTrendChart days={trendDays} hideSensitiveInfo={hideSensitive} comparePreviousWeek />
                  </div>
                </BereaCard>

                <BereaCard enterIndex={5} className="flex min-w-0 flex-col p-3 sm:p-4 lg:col-span-5">
                  <div
                    className="berea-enter-layer mb-3 flex items-center justify-between gap-2"
                    style={bereaEnterItemStyle(0)}
                  >
                    <h2 className="text-[15px] font-semibold text-[var(--berea-ink)]">{D.paymentMix}</h2>
                    <span
                      className={`shrink-0 rounded-md border px-2 py-0.5 text-[10px] font-semibold text-[var(--berea-ink-muted)] ${reportsSurfaceClass}`}
                    >
                      {D.thisPeriod}
                    </span>
                  </div>
                  <div className="berea-chart-reveal flex min-h-[13rem] flex-1 items-center lg:min-h-[14rem]">
                    <div className="flex w-full flex-col items-stretch gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="relative mx-auto flex h-[7.75rem] w-[7.75rem] shrink-0 items-center justify-center sm:mx-0 sm:h-[8.25rem] sm:w-[8.25rem]">
                      <PaymentMixDonut slices={paymentMix} />
                      <div className="absolute inset-[16%] rounded-full bg-[var(--shell-workspace-search-bg)]" aria-hidden />
                      <div className="relative z-[1] flex flex-col items-center px-2 text-center">
                        {topPayment && paymentTotal > 0 ? (
                          <>
                            <span className="text-[1.1rem] font-semibold leading-none tabular-nums tracking-tight text-[var(--berea-ink)] sm:text-[1.2rem]">
                              {hideSensitive ? "**%" : `${topPayment.percent}%`}
                            </span>
                            <span className="mt-0.5 max-w-[4.75rem] text-[9px] font-medium leading-tight text-[var(--berea-ink-muted)] sm:text-[10px]">
                              {topPayment.label}
                            </span>
                          </>
                        ) : (
                          <span className="text-[10px] font-medium text-[var(--berea-ink-muted)]">Sin cobros</span>
                        )}
                      </div>
                    </div>
                    <ul className="min-w-0 flex-1 space-y-2 sm:pl-1">
                      {paymentMix.map((p) => (
                        <li key={p.key} className="flex items-center justify-between gap-2 text-[11px] sm:text-[12px]">
                          <span className="flex min-w-0 items-center gap-1.5">
                            <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: p.color }} />
                            <span className="truncate text-[var(--berea-ink-muted)]">{p.label}</span>
                          </span>
                          <span className="shrink-0 font-semibold tabular-nums text-[var(--berea-ink)]">
                            {hideSensitive ? "**%" : `${p.percent}%`}
                          </span>
                        </li>
                      ))}
                    </ul>
                    </div>
                  </div>
                </BereaCard>
              </div>

              <div className="grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-12">
                <BereaCard enterIndex={6} className="flex min-w-0 flex-col overflow-hidden p-3 sm:p-4 lg:col-span-7">
                  <div
                    className="berea-enter-layer mb-3 flex items-center justify-between gap-2"
                    style={bereaEnterItemStyle(0)}
                  >
                    <h2 className="text-[15px] font-semibold text-[var(--berea-ink)]">{D.recentOrders}</h2>
                    <Link href="/ventas" className="berea-card-more-inline">
                      {D.recentOrdersLink}
                    </Link>
                  </div>
                  <div className="berea-enter-layer overflow-x-auto" style={bereaEnterItemStyle(1)}>
                    <table className="w-full min-w-[420px] border-collapse text-left text-[12px] leading-normal">
                      <thead>
                        <tr className="text-[var(--berea-ink-muted)]">
                          <th className="pb-2.5 pr-3 font-semibold">{D.recentOrdersColumnOrder}</th>
                          <th className="pb-2.5 pr-3 font-semibold">Cliente</th>
                          <th className="pb-2.5 pr-3 font-semibold">Canal</th>
                          <th className="pb-2.5 pr-3 font-semibold">Total</th>
                          <th className="pb-2.5 font-semibold">Estado</th>
                        </tr>
                      </thead>
                      <tbody>
                        {visibleOrders.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="py-5 text-[var(--berea-ink-muted)]">
                              {D.recentOrdersEmpty}
                            </td>
                          </tr>
                        ) : (
                          visibleOrders.map((o) => {
                            const tone = saleStatusTone(o.status);
                            return (
                              <tr key={o.id}>
                                <td className="py-3 pr-3 font-medium text-[var(--berea-ink)]">
                                  <Link href={`/ventas/${o.id}`} className="hover:text-[var(--berea-accent)]">
                                    #{o.invoice_number}
                                  </Link>
                                </td>
                                <td className="max-w-[7rem] truncate py-3 pr-3 text-[var(--berea-ink-muted)]">
                                  {o.customer_name}
                                </td>
                                <td className="py-3 pr-3 text-[var(--berea-ink-muted)]">{o.channel_label}</td>
                                <td className="py-3 pr-3 font-semibold tabular-nums text-[var(--berea-ink)]">
                                  {formatValue(o.total)}
                                </td>
                                <td className="py-3">
                                  <span
                                    className={`inline-flex rounded-md px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${STATUS_STYLES[tone]}`}
                                  >
                                    {saleStatusLabel(o.status)}
                                  </span>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </BereaCard>

                <TopProductsCard
                  enterIndex={7}
                  products={topProducts}
                  hideSensitive={hideSensitive}
                  formatValue={formatValue}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:col-span-3 xl:flex xl:flex-col xl:gap-5">
              <RecentActivityCard enterIndex={8} activities={activities} />
              <PeriodExpensesCard
                enterIndex={9}
                expenses={recentExpenses}
                total={totalExpenses}
                operationalExpenses={operationalExpenses}
                inventoryExpenses={inventoryExpenses}
                netCashTotal={kpis.netCashTotal}
                hideSensitive={hideSensitive}
                formatValue={formatValue}
                periodLabel={expensesPeriodLabel}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
