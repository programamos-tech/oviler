"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useRef, useCallback, useMemo, Fragment } from "react";
import { ACTIVE_BRANCH_CHANGED_EVENT } from "@/lib/active-branch";
import { getSalesDateBounds } from "@/lib/sales-list-filters";
import {
  shouldShowListSkeleton,
  visibleCountFromCache,
  visibleRowsFromCache,
} from "@/lib/list-page-display";
import { prefetchSaleDetails } from "@/lib/ventas-detail-cache";
import {
  clearVentasListCache,
  getCachedVentasList,
  setCachedVentasList,
  ventasListCacheKey,
} from "@/lib/ventas-list-cache";
import { useSession } from "@/app/components/SessionProvider";
import { MdOutlineLocalShipping, MdOutlinePublic, MdOutlineReceiptLong, MdOutlineStorefront } from "react-icons/md";
import {
  getCopy,
  getStatusLabelForSale,
  getPedidoPaymentMethodChipClass,
  type SalesMode,
  ORDER_STATUS_FILTERS,
  SALES_STATUS_FILTERS,
} from "./sales-mode";
import DatePickerCard from "@/app/components/DatePickerCard";
const PAGE_SIZE = 20;

type PaymentTotals = {
  cash: number;
  transfer: number;
  mixed: number;
  countedSales: number;
  truncated: boolean;
};

function formatMoney(value: number) {
  return new Intl.NumberFormat("es-CO", { style: "decimal", minimumFractionDigits: 0 }).format(value);
}

function formatTime(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" });
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("es-CO", { day: "2-digit", month: "short" });
}

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Número de factura para mostrar: sin prefijo FV- (normaliza datos antiguos) */
function displayInvoiceNumber(invoiceNumber: string) {
  if (!invoiceNumber) return invoiceNumber;
  const sin = invoiceNumber.replace(/^FV-?\s*/i, "").trim();
  return sin || invoiceNumber;
}

type SaleRow = {
  id: string;
  branch_id: string;
  customer_id: string | null;
  invoice_number: string;
  total: number;
  payment_method: "cash" | "transfer" | "mixed";
  status: string;
  payment_pending?: boolean;
  is_delivery: boolean;
  delivery_paid: boolean;
  delivery_fee: number | null;
  created_at: string;
  channel?: string | null;
  payment_proof_url?: string | null;
  customers: { name: string } | null;
  amount_cash?: number | null;
  amount_transfer?: number | null;
};

type PaymentTotalsResponse = PaymentTotals & { skipped?: boolean };

type StatusFilter = "all" | "completed" | "cancelled" | "pending" | "preparing" | "on_the_way" | "delivered";
type PaymentFilter = "all" | "cash" | "transfer" | "mixed";
const PAYMENT_FILTER_OPTIONS: { value: PaymentFilter; label: string }[] = [
  { value: "all", label: "Todas" },
  { value: "cash", label: "Efectivo" },
  { value: "transfer", label: "Transferencia" },
  { value: "mixed", label: "Mixto" },
];

const REPORTS_SURFACE = "berea-reports-surface";

const BEREA_STATUS_STYLES: Record<string, string> = {
  success: "bg-emerald-100 text-emerald-900 ring-emerald-300",
  warning: "bg-amber-100 text-amber-950 ring-amber-300",
  info: "bg-sky-100 text-sky-950 ring-sky-300",
  danger: "bg-rose-100 text-rose-900 ring-rose-300",
};

const statusBadgeClass = (tone: keyof typeof BEREA_STATUS_STYLES) =>
  `inline-flex rounded-md px-2.5 py-1 text-[13px] font-semibold ring-1 ring-inset ${BEREA_STATUS_STYLES[tone]}`;

const paymentChipClass = (method: string) =>
  `${getPedidoPaymentMethodChipClass(method)} px-2.5 py-1 text-[13px] font-semibold`;

function rowStatusTone(status: string): keyof typeof BEREA_STATUS_STYLES {
  if (status === "cancelled") return "danger";
  if (status === "completed" || status === "delivered") return "success";
  if (status === "pending") return "warning";
  return "info";
}

const bereaFieldClass =
  "h-11 w-full rounded-xl border border-[var(--shell-workspace-search-border)] bg-[var(--shell-workspace-search-bg)] text-[14px] text-[var(--berea-ink)] shadow-[inset_0_0_0_0.5px_rgba(44,40,36,0.04)] outline-none transition-[border-color,box-shadow] placeholder:text-[var(--berea-ink-muted)] focus:border-[rgba(44,40,36,0.22)] focus:ring-0 dark:border-[var(--shell-nav-border)] dark:bg-[var(--shell-nav-card-bg)] dark:text-[var(--shell-nav-fg)] dark:placeholder:text-[var(--shell-nav-fg-subtle)]";

const bereaFilterLabel = "block text-[11px] font-semibold uppercase tracking-wider text-[var(--berea-ink-muted)]";

function PaymentTotalsStrip({
  totals,
  totalCount,
}: {
  totals: PaymentTotalsResponse;
  totalCount: number;
}) {
  if (totals.skipped) {
    return (
      <div
        className={`min-w-0 max-w-md rounded-xl px-3 py-2 text-[12px] text-[var(--berea-ink-muted)] sm:px-4 ${REPORTS_SURFACE}`}
        title="Con muchos registros sin filtro de fecha, los totales se omiten para cargar más rápido."
      >
        Filtra por fecha para ver totales por forma de pago ({totalCount.toLocaleString("es-CO")} ventas).
      </div>
    );
  }
  const items = [
    { label: "Efectivo", value: totals.cash },
    { label: "Transferencia", value: totals.transfer },
    { label: "Mixto", value: totals.mixed },
  ] as const;
  const grandTotal = totals.cash + totals.transfer + totals.mixed;
  const detail = totals.truncated
    ? `Totales sobre las últimas 2.000 ventas del filtro${
        totalCount > 2000 ? ` (${totalCount.toLocaleString("es-CO")} en total)` : ""
      }. Sin anuladas ni cobros pendientes.`
    : `Por forma de pago (${totals.countedSales} ${totals.countedSales === 1 ? "venta" : "ventas"}); total $${formatMoney(grandTotal)}. Sin envíos ni cobros pendientes.`;
  const summary = `${totals.countedSales} ${totals.countedSales === 1 ? "venta" : "ventas"} · $${formatMoney(grandTotal)}`;

  return (
    <div
      className={`flex min-w-0 flex-wrap items-center gap-x-3 gap-y-2 rounded-xl px-3 py-2 sm:gap-x-4 sm:px-4 ${REPORTS_SURFACE}`}
      title={detail}
    >
      {items.map((item, index) => (
        <Fragment key={item.label}>
          {index > 0 ? (
            <span className="hidden h-7 w-px shrink-0 bg-[var(--berea-card-border)] sm:block" aria-hidden />
          ) : null}
          <div className="flex items-baseline gap-2 whitespace-nowrap">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-[var(--berea-ink-muted)]">
              {item.label}
            </span>
            <span className="text-[14px] font-semibold tabular-nums text-[var(--berea-ink)]">
              ${formatMoney(item.value)}
            </span>
          </div>
        </Fragment>
      ))}
      <span className="hidden h-7 w-px shrink-0 bg-[var(--berea-card-border)] md:block" aria-hidden />
      <span className="whitespace-nowrap text-[13px] font-medium text-[var(--berea-ink-muted)]">{summary}</span>
    </div>
  );
}

export default function SalesPage() {
  const { branch, ready: sessionReady } = useSession();
  const branchId = branch?.id ?? null;
  const [sales, setSales] = useState<SaleRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  /** Evita un refetch por tecla al buscar (menos carga y sensación más fluida). */
  const [searchQueryDebounced, setSearchQueryDebounced] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>("all");
  const [dateFrom, setDateFrom] = useState<Date | null>(null);
  const [dateTo, setDateTo] = useState<Date | null>(null);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [paymentTotals, setPaymentTotals] = useState<PaymentTotalsResponse | null>(null);
  const salesMode: SalesMode = branch?.sales_mode === "orders" ? "orders" : "sales";
  const [activeBranchEpoch, setActiveBranchEpoch] = useState(0);

  const dateBoundsForCache = useMemo(() => getSalesDateBounds(dateFrom, dateTo), [dateFrom, dateTo]);
  const listCacheKey = useMemo(() => {
    if (!branchId) return null;
    return ventasListCacheKey({
      branchId,
      page,
      search: searchQueryDebounced,
      status: statusFilter,
      payment: paymentFilter,
      dateStart: dateBoundsForCache?.start ?? "",
      dateEnd: dateBoundsForCache?.end ?? "",
      salesMode,
      refreshKey,
    });
  }, [
    branchId,
    page,
    searchQueryDebounced,
    statusFilter,
    paymentFilter,
    dateBoundsForCache,
    salesMode,
    refreshKey,
  ]);

  type VentasListBundle = {
    sales: SaleRow[];
    totalCount: number;
    paymentTotals: PaymentTotalsResponse | null;
  };

  const cachedList = useMemo(
    () => (listCacheKey ? (getCachedVentasList(listCacheKey) as VentasListBundle | null) : null),
    [listCacheKey]
  );
  const displaySales = useMemo(
    () => visibleRowsFromCache(sales, cachedList?.sales),
    [sales, cachedList]
  );
  const displayTotalCount = useMemo(
    () => visibleCountFromCache(totalCount, cachedList?.totalCount),
    [totalCount, cachedList]
  );
  const displayPaymentTotals = paymentTotals ?? cachedList?.paymentTotals ?? null;
  const showListLoading = shouldShowListSkeleton(loading, displaySales.length, sessionReady);

  const listRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | HTMLTableRowElement | null)[]>([]);
  const hasFocusedList = useRef(false);
  const router = useRouter();

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onBranch = () => {
      setActiveBranchEpoch((n) => n + 1);
      setPage(1);
    };
    window.addEventListener(ACTIVE_BRANCH_CHANGED_EVENT, onBranch);
    return () => window.removeEventListener(ACTIVE_BRANCH_CHANGED_EVENT, onBranch);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setSearchQueryDebounced(searchQuery), 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  useEffect(() => {
    if (!sessionReady) return;
    if (!branchId) {
      setLoadError(null);
      setSales([]);
      setTotalCount(0);
      setPaymentTotals(null);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    let cancelled = false;
    const dateBounds = getSalesDateBounds(dateFrom, dateTo);
    const cacheKey = ventasListCacheKey({
      branchId,
      page,
      search: searchQueryDebounced,
      status: statusFilter,
      payment: paymentFilter,
      dateStart: dateBounds?.start ?? "",
      dateEnd: dateBounds?.end ?? "",
      salesMode,
      refreshKey,
    });
    const cached = getCachedVentasList(cacheKey);

    type Bundle = {
      sales: SaleRow[];
      totalCount: number;
      paymentTotals: PaymentTotalsResponse | null;
    };

    if (cached) {
      const bundle = cached as Bundle;
      setLoadError(null);
      setSales(bundle.sales);
      setTotalCount(bundle.totalCount);
      setPaymentTotals(bundle.paymentTotals);
      setLoading(false);
      setRefreshing(false);
      prefetchSaleDetails(bundle.sales.map((s) => s.id));

      if (!bundle.paymentTotals) {
        void (async () => {
          const totalsParams = new URLSearchParams({
            branchId,
            salesMode,
            page: String(page),
            pageSize: String(PAGE_SIZE),
            search: searchQueryDebounced,
            status: statusFilter,
            payment: paymentFilter,
            onlyTotals: "1",
            totalCount: String(bundle.totalCount),
          });
          if (dateBounds?.start) totalsParams.set("dateStart", dateBounds.start);
          if (dateBounds?.end) totalsParams.set("dateEnd", dateBounds.end);
          try {
            const totalsRes = await fetch(`/api/ventas/query-bundle?${totalsParams.toString()}`, {
              credentials: "include",
            });
            if (!totalsRes.ok || cancelled) return;
            const totalsJson = (await totalsRes.json()) as { paymentTotals: PaymentTotalsResponse | null };
            setPaymentTotals(totalsJson.paymentTotals);
            setCachedVentasList(cacheKey, { ...bundle, paymentTotals: totalsJson.paymentTotals });
          } catch {
            // Totales en segundo plano.
          }
        })();
      }

      return () => {
        cancelled = true;
      };
    }

    if (sales.length === 0) setLoading(true);
    else setRefreshing(true);

    (async () => {
      try {
        let bundle: Bundle;
        const params = new URLSearchParams({
          branchId,
          salesMode,
          page: String(page),
          pageSize: String(PAGE_SIZE),
          search: searchQueryDebounced,
          status: statusFilter,
          payment: paymentFilter,
          skipTotals: "1",
        });
        if (dateBounds?.start) params.set("dateStart", dateBounds.start);
        if (dateBounds?.end) params.set("dateEnd", dateBounds.end);

        const res = await fetch(`/api/ventas/query-bundle?${params.toString()}`, {
          credentials: "include",
        });
        if (!res.ok) {
          const err = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(err.error ?? "No se pudo cargar ventas");
        }
        const json = (await res.json()) as Omit<Bundle, "paymentTotals"> & {
          paymentTotals?: PaymentTotalsResponse | null;
        };
        bundle = { ...json, paymentTotals: json.paymentTotals ?? null };
        setCachedVentasList(cacheKey, bundle);

        void (async () => {
          const totalsParams = new URLSearchParams(params);
          totalsParams.delete("skipTotals");
          totalsParams.set("onlyTotals", "1");
          totalsParams.set("totalCount", String(json.totalCount));
          try {
            const totalsRes = await fetch(`/api/ventas/query-bundle?${totalsParams.toString()}`, {
              credentials: "include",
            });
            if (!totalsRes.ok || cancelled) return;
            const totalsJson = (await totalsRes.json()) as { paymentTotals: PaymentTotalsResponse | null };
            setPaymentTotals(totalsJson.paymentTotals);
            const cachedBundle = getCachedVentasList(cacheKey) as Bundle | null;
            if (cachedBundle) {
              setCachedVentasList(cacheKey, {
                ...cachedBundle,
                paymentTotals: totalsJson.paymentTotals,
              });
            }
          } catch {
            // Totales en segundo plano: no bloquear la lista.
          }
        })();

        if (cancelled) return;
        setLoadError(null);
        setSales(bundle.sales);
        setTotalCount(bundle.totalCount);
        setPaymentTotals(bundle.paymentTotals);
        prefetchSaleDetails(bundle.sales.map((s) => s.id));
      } catch (e) {
        if (!cancelled) {
          setLoadError(e instanceof Error ? e.message : "Error inesperado al cargar ventas");
          setSales([]);
          setTotalCount(0);
          setPaymentTotals(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    sessionReady,
    branchId,
    salesMode,
    refreshKey,
    page,
    searchQueryDebounced,
    statusFilter,
    paymentFilter,
    dateFrom,
    dateTo,
    activeBranchEpoch,
  ]);

  useEffect(() => {
    setPage(1);
  }, [searchQuery, statusFilter, paymentFilter, dateFrom, dateTo]);

  useEffect(() => {
    cardRefs.current[selectedIndex]?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [selectedIndex]);

  useEffect(() => {
    setSelectedIndex((i) => Math.min(i, Math.max(0, displaySales.length - 1)));
  }, [displaySales.length]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (displaySales.length === 0) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, displaySales.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        router.push(`/ventas/${displaySales[selectedIndex].id}`);
      }
    },
    [displaySales, selectedIndex, router]
  );

  useEffect(() => {
    if (!showListLoading && displaySales.length > 0 && listRef.current && !hasFocusedList.current) {
      hasFocusedList.current = true;
      listRef.current.focus({ preventScroll: true });
    }
  }, [showListLoading, displaySales.length]);

  const copy = getCopy(salesMode);
  const paymentLabel = (p: SaleRow) =>
    p.payment_method === "cash" ? "Efectivo" : p.payment_method === "mixed" ? "Mixto" : "Transferencia";
  const statusLabel = (s: SaleRow) => getStatusLabelForSale(s.status, s.is_delivery);
  const statusFilterOptions = salesMode === "orders" ? ORDER_STATUS_FILTERS : SALES_STATUS_FILTERS;

  const totalPages = Math.max(1, Math.ceil(displayTotalCount / PAGE_SIZE));
  const showPagination = !showListLoading && !loadError && displayTotalCount > 0 && displayTotalCount > PAGE_SIZE;
  const pageNumbers = (() => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const around = 2;
    const start = Math.max(1, page - around);
    const end = Math.min(totalPages, page + around);
    const nums: (number | "…")[] = [];
    if (start > 1) {
      nums.push(1);
      if (start > 2) nums.push("…");
    }
    for (let i = start; i <= end; i++) nums.push(i);
    if (end < totalPages) {
      if (end < totalPages - 1) nums.push("…");
      nums.push(totalPages);
    }
    return nums;
  })();

  const paginationBar = showPagination && (
    <div className={`flex flex-wrap items-center justify-between gap-2 rounded-xl px-4 py-3 sm:px-5 ${REPORTS_SURFACE}`}>
      <p className="text-[13px] font-medium text-[var(--berea-ink-muted)] md:text-[14px]">
        {displayTotalCount} {displayTotalCount === 1 ? "registro" : "registros"}
        {totalPages > 1 && (
          <>
            {" "}
            · Página {page} de {totalPages}
          </>
        )}
      </p>
      {totalPages > 1 && (
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className={`inline-flex h-9 w-9 items-center justify-center rounded-lg text-[var(--berea-ink-muted)] transition-colors hover:bg-[var(--shell-workspace)] disabled:pointer-events-none disabled:opacity-50 ${REPORTS_SURFACE}`}
            aria-label="Página anterior"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          {pageNumbers.map((n, i) =>
            n === "…" ? (
              <span key={`ellipsis-${i}`} className="px-2 text-[var(--berea-ink-subtle)]">
                …
              </span>
            ) : (
              <button
                key={n}
                type="button"
                onClick={() => setPage(n)}
                className={`inline-flex h-9 min-w-[2.25rem] items-center justify-center rounded-lg px-2 text-[13px] font-semibold transition-colors ${
                  page === n
                    ? "bg-[var(--berea-accent)] text-[var(--shell-nav-fg)]"
                    : `${REPORTS_SURFACE} text-[var(--berea-ink-muted)] hover:bg-[var(--shell-workspace)]`
                }`}
              >
                {n}
              </button>
            )
          )}
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className={`inline-flex h-9 w-9 items-center justify-center rounded-lg text-[var(--berea-ink-muted)] transition-colors hover:bg-[var(--shell-workspace)] disabled:pointer-events-none disabled:opacity-50 ${REPORTS_SURFACE}`}
            aria-label="Página siguiente"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );

  const actionIconClass =
    "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[var(--berea-ink-subtle)] transition-colors hover:bg-[var(--shell-workspace)] hover:text-[var(--berea-accent)]";

  const hasActiveFilters =
    searchQuery.trim() !== "" ||
    statusFilter !== "all" ||
    paymentFilter !== "all" ||
    dateFrom !== null ||
    dateTo !== null;

  const clearFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setPaymentFilter("all");
    setDateFrom(null);
    setDateTo(null);
    setPage(1);
  };

  const today = startOfToday();

  const channelIconWrap = (sale: SaleRow) => {
    const unpaid =
      sale.is_delivery && sale.delivery_fee && sale.delivery_fee > 0 && !sale.delivery_paid;
    const isWeb = sale.channel === "web_catalog";
    const hasProof = Boolean(sale.payment_proof_url);
    const creditPending = Boolean(sale.payment_pending);
    const iconClass = "h-6 w-6 shrink-0 text-[var(--berea-ink-muted)]";
    const creditIconClass = "h-6 w-6 shrink-0 text-amber-700 dark:text-amber-300";

    const channelLabel = isWeb
      ? "Catálogo"
      : creditPending && !isWeb
        ? sale.is_delivery
          ? "Pedido a crédito"
          : "Factura a crédito"
        : sale.is_delivery
          ? "Pedido con envío"
          : "Venta en mostrador";

    const secondaryLabel = hasProof
      ? "Comprobante adjunto"
      : creditPending && !isWeb
        ? "Cobro del cliente pendiente"
        : sale.is_delivery && sale.delivery_fee && sale.delivery_fee > 0
          ? unpaid
            ? "Envío pendiente de pago"
            : "Envío pagado"
          : null;

    return (
      <span className="group relative inline-flex shrink-0 items-center">
        {isWeb ? (
          <MdOutlinePublic className={iconClass} aria-hidden />
        ) : creditPending ? (
          <MdOutlineReceiptLong className={creditIconClass} aria-hidden />
        ) : sale.is_delivery ? (
          <MdOutlineLocalShipping className={iconClass} aria-hidden />
        ) : (
          <MdOutlineStorefront className={iconClass} aria-hidden />
        )}
        <span className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 flex -translate-x-1/2 flex-col rounded-lg bg-slate-900 px-3 py-2 text-[12px] font-medium leading-tight text-white opacity-0 shadow-xl transition-opacity duration-200 group-hover:opacity-100 dark:bg-slate-800">
          <span>{channelLabel}</span>
          {secondaryLabel && <span className="mt-0.5 text-slate-200/95">{secondaryLabel}</span>}
        </span>
      </span>
    );
  };

  return (
    <div className="berea-reports mx-auto min-w-0 max-w-[1600px] space-y-5 text-[15px] text-[var(--berea-ink)] sm:space-y-6">
      <header className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between lg:gap-6">
        <div className="min-w-0 shrink-0">
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--berea-ink)] sm:text-[1.65rem]">{copy.sectionTitle}</h1>
          <p className="mt-0.5 text-[14px] text-[var(--berea-ink-muted)] sm:truncate lg:max-w-md xl:max-w-lg">
            Gestiona facturas de mostrador y pedidos con envío desde un solo lugar.
          </p>
        </div>
        <div className="flex min-w-0 flex-1 flex-wrap items-center justify-end gap-2 sm:gap-3">
          {!showListLoading && !loadError && displayPaymentTotals ? (
            <PaymentTotalsStrip totals={displayPaymentTotals} totalCount={displayTotalCount} />
          ) : null}
          {refreshing ? (
            <span className="hidden text-[12px] font-medium text-[var(--berea-accent)] sm:inline">
              Actualizando…
            </span>
          ) : null}
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => {
                clearVentasListCache();
                setRefreshKey((k) => k + 1);
              }}
              className={`inline-flex h-10 items-center gap-2 rounded-lg px-3.5 text-[13px] font-semibold text-[var(--berea-ink)] hover:bg-[var(--shell-workspace)] ${REPORTS_SURFACE}`}
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Actualizar
            </button>
            <Link
              href="/ventas/nueva"
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-[color:var(--shell-sidebar)] px-4 text-[13px] font-semibold text-white shadow-sm transition-colors hover:bg-[color:var(--shell-sidebar-cta-hover)]"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              {copy.newButton}
            </Link>
          </div>
        </div>
      </header>

      <section
        ref={listRef}
        tabIndex={0}
        onKeyDown={handleKeyDown}
        className="outline-none"
        aria-label="Lista de facturas y pedidos. Usa flechas arriba y abajo para moverte, Enter para abrir."
      >
        {showListLoading ? (
          <div className={`min-h-[280px] animate-pulse rounded-xl ${REPORTS_SURFACE}`} aria-hidden />
        ) : loadError ? (
          <div className={`rounded-xl px-6 py-10 text-center ${REPORTS_SURFACE}`}>
            <p className="text-[15px] font-semibold text-amber-900">Error al cargar las ventas</p>
            <p className="mt-2 text-[13px] text-[var(--berea-ink-muted)]">{loadError}</p>
            <p className="mt-3 text-[12px] text-[var(--berea-ink-subtle)]">
              Si acabas de aplicar migraciones en Supabase, ejecuta las migraciones y vuelve a intentar.
            </p>
            <button
              type="button"
              onClick={() => setRefreshKey((k) => k + 1)}
              className="mt-6 inline-flex h-9 items-center gap-2 rounded-lg bg-[color:var(--shell-sidebar)] px-4 text-[13px] font-semibold text-white transition-colors hover:bg-[color:var(--shell-sidebar-cta-hover)]"
            >
              Reintentar
            </button>
          </div>
        ) : (
          <div
            className={`space-y-6 rounded-xl p-5 sm:p-6 ${REPORTS_SURFACE}${refreshing ? " opacity-[0.72] transition-opacity duration-200" : ""}`}
          >
              <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-end lg:gap-4">
                <div className="relative min-w-0 w-full lg:min-w-0 lg:flex-1">
                  <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--berea-ink-muted)]">
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </span>
                  <input
                    type="search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Factura, cliente…"
                    className={`${bereaFieldClass} py-2.5 pl-11 pr-4`}
                  />
                </div>
                <div className="flex w-full min-w-0 flex-col gap-2 sm:flex-row sm:items-end sm:justify-between sm:gap-4 lg:ml-auto lg:min-w-0 lg:flex-[1.4] lg:flex-row lg:justify-end lg:gap-3 xl:flex-[1.6]">
                  <div className="grid min-w-0 w-full grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
                    <div className="min-w-0 space-y-1.5">
                      <label htmlFor="ventas-filter-status" className={bereaFilterLabel}>
                        Estado
                      </label>
                      <select
                        id="ventas-filter-status"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                        className={`${bereaFieldClass} px-3 font-medium`}
                      >
                        {statusFilterOptions.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="min-w-0 space-y-1.5">
                      <label htmlFor="ventas-filter-payment" className={bereaFilterLabel}>
                        <span className="sm:hidden">Pago</span>
                        <span className="hidden sm:inline">Forma de pago</span>
                      </label>
                      <select
                        id="ventas-filter-payment"
                        value={paymentFilter}
                        onChange={(e) => setPaymentFilter(e.target.value as PaymentFilter)}
                        className={`${bereaFieldClass} px-3 font-medium`}
                      >
                        {PAYMENT_FILTER_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-span-2 min-w-0 space-y-1.5">
                      <span className={bereaFilterLabel}>Fecha</span>
                      <div className="grid min-w-0 grid-cols-2 gap-2 sm:gap-3">
                        <DatePickerCard
                          id="ventas-filter-from"
                          value={dateFrom}
                          onChange={(d) => {
                            setDateFrom(d);
                            if (d && dateTo && d > dateTo) setDateTo(d);
                          }}
                          max={dateTo ?? today}
                          placeholder="Desde"
                          allowClear
                          fullWidth
                          size="md"
                          triggerTone="berea"
                          aria-label="Fecha desde"
                        />
                        <DatePickerCard
                          id="ventas-filter-to"
                          value={dateTo}
                          onChange={(d) => {
                            setDateTo(d);
                            if (d && dateFrom && d < dateFrom) setDateFrom(d);
                          }}
                          min={dateFrom ?? undefined}
                          max={today}
                          placeholder="Hasta"
                          allowClear
                          fullWidth
                          size="md"
                          triggerTone="berea"
                          aria-label="Fecha hasta"
                        />
                      </div>
                    </div>
                  </div>
                  {hasActiveFilters ? (
                    <button
                      type="button"
                      onClick={clearFilters}
                      className="shrink-0 self-start text-left text-[13px] font-semibold text-[var(--berea-accent)] underline-offset-2 hover:underline sm:self-end"
                    >
                      Limpiar filtros
                    </button>
                  ) : null}
                </div>
              </div>

            {displayTotalCount === 0 && !hasActiveFilters ? (
              <div className="px-2 py-8 text-center sm:px-4">
                <p className="text-[15px] font-semibold text-[var(--berea-ink)]">{copy.emptyTitle}</p>
                <p className="mt-2 text-[13px] text-[var(--berea-ink-muted)]">
                  Registra tu primera factura o pedido para verlo aquí.
                </p>
                <Link
                  href="/ventas/nueva"
                  className="mt-6 inline-flex h-9 items-center gap-2 rounded-lg bg-[color:var(--shell-sidebar)] px-4 text-[13px] font-semibold text-white transition-colors hover:bg-[color:var(--shell-sidebar-cta-hover)]"
                >
                  {copy.newButton}
                </Link>
              </div>
            ) : displaySales.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[var(--berea-card-border)] px-6 py-14 text-center">
                <p className="text-[15px] font-semibold text-[var(--berea-ink)]">
                  Ningún documento coincide con la búsqueda o los filtros
                </p>
                <p className="mt-2 text-[13px] text-[var(--berea-ink-muted)]">
                  Prueba con otro término o ajusta estado, forma de pago o fechas.
                </p>
              </div>
            ) : (
              <>
            {/* Desktop: tabla estilo Berea */}
            <div className="hidden overflow-x-auto xl:block">
              <table className="w-full min-w-[760px] border-collapse text-left text-[14px] leading-relaxed">
                <thead>
                  <tr className="border-b border-[var(--berea-card-border)] text-[13px] text-[var(--berea-ink-muted)]">
                    <th className="pb-3 pr-4 font-semibold">Factura / pedido</th>
                    <th className="pb-3 pr-4 font-semibold">Fecha</th>
                    <th className="pb-3 pr-4 font-semibold">Cliente</th>
                    <th className="pb-3 pr-4 font-semibold">Pago</th>
                    <th className="pb-3 pr-4 font-semibold">Estado</th>
                    <th className="pb-3 pr-4 text-right font-semibold">Total</th>
                    <th className="pb-3 text-right font-semibold">Acciones</th>
                  </tr>
                </thead>
                <tbody>
              {displaySales.map((s, index) => {
                const isSelected = index === selectedIndex;
                const customerName = s.customers?.name ?? "Cliente final";
                const tone = rowStatusTone(s.status);
                return (
                  <tr
                    key={s.id}
                    ref={(el) => { cardRefs.current[index] = el; }}
                    role="button"
                    tabIndex={-1}
                    onClick={() => router.push(`/ventas/${s.id}`)}
                    onMouseEnter={() => prefetchSaleDetails([s.id])}
                    className={`cursor-pointer transition-colors ${
                      isSelected ? "bg-[var(--shell-workspace)]" : "hover:bg-[var(--shell-workspace)]/70"
                    }`}
                  >
                    <td className="py-4 pr-4">
                      <div className="flex min-w-0 items-center gap-2.5">
                        {channelIconWrap(s)}
                        <span className="truncate text-[15px] font-semibold tabular-nums text-[var(--berea-ink)]">
                          {displayInvoiceNumber(s.invoice_number)}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 pr-4 text-[var(--berea-ink-muted)]">
                      {formatTime(s.created_at)} · {formatDate(s.created_at)}
                    </td>
                    <td className="max-w-[12rem] truncate py-4 pr-4 font-medium text-[var(--berea-ink)]">{customerName}</td>
                    <td className="py-4 pr-4">
                      <span className={paymentChipClass(s.payment_method)}>{paymentLabel(s)}</span>
                    </td>
                    <td className="py-4 pr-4">
                      <span className={statusBadgeClass(tone)}>
                        {statusLabel(s)}
                      </span>
                    </td>
                    <td className="py-4 pr-4 text-right text-[15px] font-bold tabular-nums text-[var(--berea-ink)]">
                      ${formatMoney(Number(s.total))}
                    </td>
                    <td className="py-4 text-right" onClick={(e) => e.stopPropagation()}>
                      <Link href={`/ventas/${s.id}`} className={actionIconClass} aria-label="Ver detalle" title="Ver detalle">
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </Link>
                    </td>
                  </tr>
                );
              })}
                </tbody>
              </table>
            </div>

            {/* Mobile: tarjetas Berea */}
            <div className="grid grid-cols-1 gap-4 pt-2 sm:grid-cols-2 xl:hidden">
              {displaySales.map((s, index) => {
                const isSelected = index === selectedIndex;
                const customerName = s.customers?.name ?? "Cliente final";
                const tone = rowStatusTone(s.status);
                return (
                  <div
                    key={s.id}
                    ref={(el) => { cardRefs.current[index] = el; }}
                    role="button"
                    tabIndex={-1}
                    onClick={() => router.push(`/ventas/${s.id}`)}
                    onMouseEnter={() => prefetchSaleDetails([s.id])}
                    className={`cursor-pointer rounded-xl border border-[var(--berea-card-border)] bg-[var(--shell-workspace)] px-5 py-4 transition-colors ${
                      isSelected ? "ring-2 ring-[var(--berea-accent)]/30" : "hover:bg-white"
                    }`}
                  >
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className={bereaFilterLabel}>Factura / pedido</span>
                        <div className="flex min-w-0 items-center gap-2">
                          {channelIconWrap(s)}
                          <span className="truncate text-[15px] font-semibold tabular-nums text-[var(--berea-ink)]">
                            {displayInvoiceNumber(s.invoice_number)}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className={bereaFilterLabel}>Fecha</span>
                        <span className="text-[14px] text-[var(--berea-ink-muted)]">
                          {formatTime(s.created_at)} · {formatDate(s.created_at)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className={bereaFilterLabel}>Cliente</span>
                        <span className="truncate text-right text-[14px] font-medium text-[var(--berea-ink)]">{customerName}</span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className={bereaFilterLabel}>Pago · Estado</span>
                        <span className="flex flex-wrap items-center justify-end gap-2">
                          <span className={paymentChipClass(s.payment_method)}>{paymentLabel(s)}</span>
                          <span className={statusBadgeClass(tone)}>
                            {statusLabel(s)}
                          </span>
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-2 border-t border-[var(--berea-card-border)] pt-3">
                        <span className={bereaFilterLabel}>Total</span>
                        <span className="text-[16px] font-bold tabular-nums text-[var(--berea-ink)]">
                          ${formatMoney(Number(s.total))}
                        </span>
                      </div>
                      <div className="flex items-center justify-end" onClick={(e) => e.stopPropagation()}>
                        <Link href={`/ventas/${s.id}`} className={actionIconClass} title="Ver detalle" aria-label="Ver detalle">
                          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

              </>
            )}
          </div>
        )}
      </section>

      {paginationBar}
    </div>
  );
}
