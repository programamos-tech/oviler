"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  workspaceFilterLabelClass,
  workspaceFilterSearchPillClass,
  workspaceFilterSelectClass,
} from "@/lib/workspace-field-classes";
import { MdOutlineLocalShipping, MdOutlinePublic, MdOutlineReceiptLong, MdOutlineStorefront } from "react-icons/md";
import {
  getCopy,
  getStatusLabelForSale,
  getStatusListChipClass,
  getPaymentListChipClass,
  type SalesMode,
  ORDER_STATUS_FILTERS,
  SALES_STATUS_FILTERS,
} from "./sales-mode";

const PAGE_SIZE = 20;

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

/** Número de factura para mostrar: sin prefijo FV- (normaliza datos antiguos) */
function displayInvoiceNumber(invoiceNumber: string) {
  if (!invoiceNumber) return invoiceNumber;
  const sin = invoiceNumber.replace(/^FV-?\s*/i, "").trim();
  return sin || invoiceNumber;
}

type SaleRow = {
  id: string;
  branch_id: string;
  user_id: string;
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
  users: { name: string } | null;
};

type StatusFilter = "all" | "completed" | "cancelled" | "pending" | "preparing" | "on_the_way" | "delivered";
type PaymentFilter = "all" | "cash" | "transfer" | "mixed";
type ChannelFilter = "all" | "pos" | "web_catalog";

const PAYMENT_FILTER_OPTIONS: { value: PaymentFilter; label: string }[] = [
  { value: "all", label: "Todas" },
  { value: "cash", label: "Efectivo" },
  { value: "transfer", label: "Transferencia" },
  { value: "mixed", label: "Mixto" },
];

const CHANNEL_FILTER_OPTIONS: { value: ChannelFilter; label: string }[] = [
  { value: "all", label: "Todos" },
  { value: "pos", label: "Mostrador / POS" },
  { value: "web_catalog", label: "Catálogo web" },
];

export default function SalesPage() {
  const [sales, setSales] = useState<SaleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>("all");
  const [channelFilter, setChannelFilter] = useState<ChannelFilter>("all");
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [salesMode, setSalesMode] = useState<SalesMode>("sales");
  const listRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const hasFocusedList = useRef(false);
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;
    setLoading(true);
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) return;
      const { data: ub } = await supabase.from("user_branches").select("branch_id").eq("user_id", user.id).limit(1).single();
      if (!ub?.branch_id || cancelled) return;

      const { data: branchRow } = await supabase.from("branches").select("sales_mode").eq("id", ub.branch_id).single();
      const branchSalesMode: SalesMode =
        branchRow && (branchRow as { sales_mode?: string }).sales_mode === "orders" ? "orders" : "sales";
      if (!cancelled && branchRow) setSalesMode(branchSalesMode);

      const from = (page - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      let q = supabase
        .from("sales")
        .select(
          "id, branch_id, user_id, customer_id, invoice_number, total, payment_method, status, payment_pending, is_delivery, delivery_paid, delivery_fee, created_at, channel, payment_proof_url, customers(name), users!user_id(name)",
          { count: "exact" }
        )
        .eq("branch_id", ub.branch_id)
        .order("created_at", { ascending: false })
        .range(from, to);

      const qTrim = searchQuery.trim();
      if (qTrim) {
        const esc = qTrim.replace(/\\/g, "\\\\").replace(/%/g, "\\%").replace(/_/g, "\\_");
        q = q.or(`invoice_number.ilike.%${esc}%,customers.name.ilike.%${esc}%`);
      }
      if (statusFilter !== "all") {
        if (branchSalesMode === "orders" && statusFilter === "preparing") {
          q = q.in("status", ["preparing", "packing"]);
        } else if (branchSalesMode === "orders" && statusFilter === "completed") {
          q = q.in("status", ["completed", "delivered"]);
        } else {
          q = q.eq("status", statusFilter);
        }
      }
      if (paymentFilter !== "all") q = q.eq("payment_method", paymentFilter);
      if (channelFilter !== "all") q = q.eq("channel", channelFilter);

      const { data: salesData, error: queryError, count } = await q;
      if (cancelled) return;
      if (queryError) {
        setLoadError(queryError.message);
        setSales([]);
        setTotalCount(0);
      } else {
        setLoadError(null);
        setSales(((salesData ?? []) as Array<{
          id: string;
          branch_id: string;
          user_id: string;
          customer_id: string | null;
          invoice_number: string;
          total: number;
          payment_method: string;
          status: string;
          payment_pending?: boolean;
          is_delivery: boolean;
          delivery_paid: boolean;
          delivery_fee: number | null;
          created_at: string;
          customers: { name: string }[] | { name: string } | null;
          users: { name: string }[] | { name: string } | null;
        }>).map((s) => ({
          ...s,
          customers: Array.isArray(s.customers) ? (s.customers[0] || null) : s.customers,
          users: Array.isArray(s.users) ? (s.users[0] || null) : s.users,
        })) as SaleRow[]);
        setTotalCount(count ?? 0);
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [refreshKey, page, searchQuery, statusFilter, paymentFilter, channelFilter]);

  useEffect(() => {
    setPage(1);
  }, [searchQuery, statusFilter, paymentFilter, channelFilter]);

  useEffect(() => {
    setSelectedIndex((i) => Math.min(i, Math.max(0, sales.length - 1)));
  }, [sales.length]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (sales.length === 0) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, sales.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        router.push(`/ventas/${sales[selectedIndex].id}`);
      }
    },
    [sales, selectedIndex, router]
  );

  useEffect(() => {
    cardRefs.current[selectedIndex]?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [selectedIndex]);

  useEffect(() => {
    if (!loading && sales.length > 0 && listRef.current && !hasFocusedList.current) {
      hasFocusedList.current = true;
      listRef.current.focus({ preventScroll: true });
    }
  }, [loading, sales.length]);

  const copy = getCopy(salesMode);
  const paymentLabel = (p: SaleRow) =>
    p.payment_method === "cash" ? "Efectivo" : p.payment_method === "mixed" ? "Mixto" : "Transferencia";
  const statusLabel = (s: SaleRow) => getStatusLabelForSale(s.status, s.is_delivery);
  const statusFilterOptions = salesMode === "orders" ? ORDER_STATUS_FILTERS : SALES_STATUS_FILTERS;

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const showPagination = !loading && !loadError && totalCount > 0 && totalCount > PAGE_SIZE;
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
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl bg-white px-5 py-4 dark:bg-slate-900">
      <p className="text-[13px] font-medium text-slate-600 dark:text-slate-400">
        {totalCount} {totalCount === 1 ? "registro" : "registros"}
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
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100/90 text-slate-700 transition-colors hover:bg-slate-200/80 disabled:pointer-events-none disabled:opacity-50 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            aria-label="Página anterior"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          {pageNumbers.map((n, i) =>
            n === "…" ? (
              <span key={`ellipsis-${i}`} className="px-2 text-slate-400">
                …
              </span>
            ) : (
              <button
                key={n}
                type="button"
                onClick={() => setPage(n)}
                className={`inline-flex h-9 min-w-[2.25rem] items-center justify-center rounded-xl px-2 text-[13px] font-medium transition-colors ${
                  page === n
                    ? "bg-[color:var(--shell-sidebar)] text-white dark:bg-[color:var(--shell-sidebar)]"
                    : "bg-slate-100/80 text-slate-700 hover:bg-slate-200/80 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
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
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100/90 text-slate-700 transition-colors hover:bg-slate-200/80 disabled:pointer-events-none disabled:opacity-50 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
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
    "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-400 transition-colors hover:bg-slate-100 hover:text-[color:var(--shell-sidebar)] dark:text-slate-500 dark:hover:bg-white/10 dark:hover:text-zinc-300";

  const hasActiveFilters =
    searchQuery.trim() !== "" ||
    statusFilter !== "all" ||
    paymentFilter !== "all" ||
    channelFilter !== "all";

  const clearFilters = () => {
    setSearchQuery("");
    setStatusFilter("all");
    setPaymentFilter("all");
    setChannelFilter("all");
    setPage(1);
  };

  const channelIconWrap = (sale: SaleRow) => {
    const unpaid =
      sale.is_delivery && sale.delivery_fee && sale.delivery_fee > 0 && !sale.delivery_paid;
    const isWeb = sale.channel === "web_catalog";
    const hasProof = Boolean(sale.payment_proof_url);
    const creditPending = Boolean(sale.payment_pending);
    const iconClass = "h-5 w-5 shrink-0 text-slate-500 dark:text-slate-400";
    const creditIconClass = "h-5 w-5 shrink-0 text-amber-700 dark:text-amber-300";

    const channelLabel = isWeb
      ? "Catálogo web"
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
    <div className="mx-auto min-w-0 max-w-[1600px] space-y-8 font-sans text-[13px] font-normal leading-normal tracking-normal text-slate-800 antialiased dark:text-slate-100">
      <header className="min-w-0 rounded-2xl bg-white px-4 py-5 shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-slate-900 dark:shadow-none sm:px-6 sm:py-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <h1 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-50 sm:text-xl">{copy.sectionTitle}</h1>
            <p className="mt-1 whitespace-nowrap text-left text-[13px] font-medium leading-snug text-slate-500 dark:text-slate-400">
              Gestiona facturas de mostrador y pedidos con envío desde un solo lugar.
            </p>
          </div>
          <div className="w-full lg:overflow-x-auto">
            <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-2 lg:flex lg:min-w-max lg:flex-nowrap lg:items-center lg:justify-end">
              <button
                type="button"
                onClick={() => {
                  setLoading(true);
                  setRefreshKey((k) => k + 1);
                }}
                className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-xl bg-slate-100/90 px-4 text-[13px] font-medium text-slate-700 transition-colors hover:bg-slate-200/70 sm:w-auto dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Actualizar
              </button>
              <Link
                href="/ventas/nueva"
                className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-xl bg-[color:var(--shell-sidebar)] px-4 text-[13px] font-medium text-white shadow-[0_1px_2px_rgba(15,23,42,0.12)] transition-colors hover:bg-[color:var(--shell-sidebar-cta-hover)] sm:w-auto"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                {copy.newButton}
              </Link>
            </div>
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
        {loading ? (
          <div className="min-h-[280px] animate-pulse rounded-3xl bg-white dark:bg-slate-900" aria-hidden />
        ) : loadError ? (
          <div className="rounded-3xl border border-amber-200/80 bg-white px-6 py-10 text-center dark:border-amber-900/35 dark:bg-slate-900">
            <p className="text-[15px] font-semibold text-amber-900 dark:text-amber-200">Error al cargar las ventas</p>
            <p className="mt-2 text-[13px] font-medium text-amber-800/95 dark:text-amber-300/95">{loadError}</p>
            <p className="mt-3 text-[12px] font-medium text-slate-500 dark:text-slate-400">
              Si acabas de aplicar migraciones en Supabase, ejecuta las migraciones y vuelve a intentar.
            </p>
            <button
              type="button"
              onClick={() => setRefreshKey((k) => k + 1)}
              className="mt-6 inline-flex h-9 items-center gap-2 rounded-xl bg-[color:var(--shell-sidebar)] px-4 text-[13px] font-medium text-white shadow-[0_1px_2px_rgba(15,23,42,0.12)] transition-colors hover:bg-[color:var(--shell-sidebar-cta-hover)]"
            >
              Reintentar
            </button>
          </div>
        ) : (
          <div className="space-y-6 rounded-3xl bg-white px-5 py-6 dark:bg-slate-900 sm:px-7 sm:py-7">
              <div className="flex min-w-0 flex-col gap-3 md:flex-row md:flex-nowrap md:items-end md:gap-2 md:overflow-x-auto md:pb-0.5 md:[scrollbar-width:thin] lg:gap-3 lg:overflow-visible xl:gap-3">
                <div className="relative min-w-0 md:min-w-[14rem] md:flex-1">
                  <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </span>
                  <input
                    type="search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Buscar por número de factura o cliente…"
                    className={workspaceFilterSearchPillClass}
                  />
                </div>
                <div className="w-full shrink-0 space-y-1.5 md:w-[9rem] lg:w-[9.25rem] xl:w-[10rem]">
                  <label htmlFor="ventas-filter-status" className={workspaceFilterLabelClass}>
                    Estado
                  </label>
                  <select
                    id="ventas-filter-status"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                    className={workspaceFilterSelectClass}
                  >
                    {statusFilterOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="w-full shrink-0 space-y-1.5 md:w-[9rem] lg:w-[9.25rem] xl:w-[10rem]">
                  <label htmlFor="ventas-filter-payment" className={workspaceFilterLabelClass}>
                    Forma de pago
                  </label>
                  <select
                    id="ventas-filter-payment"
                    value={paymentFilter}
                    onChange={(e) => setPaymentFilter(e.target.value as PaymentFilter)}
                    className={workspaceFilterSelectClass}
                  >
                    {PAYMENT_FILTER_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="w-full shrink-0 space-y-1.5 md:w-[9rem] lg:w-[9.25rem] xl:w-[10rem]">
                  <label htmlFor="ventas-filter-channel" className={workspaceFilterLabelClass}>
                    Canal
                  </label>
                  <select
                    id="ventas-filter-channel"
                    value={channelFilter}
                    onChange={(e) => setChannelFilter(e.target.value as ChannelFilter)}
                    className={workspaceFilterSelectClass}
                  >
                    {CHANNEL_FILTER_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="shrink-0 self-end whitespace-nowrap pb-2 text-left text-[13px] font-medium text-[color:var(--shell-sidebar)] underline-offset-2 hover:underline md:self-auto md:pb-2.5 dark:text-zinc-300"
                  >
                    Limpiar filtros
                  </button>
                )}
              </div>

            {totalCount === 0 && !hasActiveFilters ? (
              <div className="px-2 py-8 text-center sm:px-4">
                <p className="text-[15px] font-semibold text-slate-800 dark:text-slate-200">{copy.emptyTitle}</p>
                <p className="mt-2 text-[13px] font-medium text-slate-500 dark:text-slate-400">
                  Registra tu primera factura o pedido para verlo aquí.
                </p>
                <Link
                  href="/ventas/nueva"
                  className="mt-6 inline-flex h-9 items-center gap-2 rounded-xl bg-[color:var(--shell-sidebar)] px-4 text-[13px] font-medium text-white transition-colors hover:bg-[color:var(--shell-sidebar-cta-hover)]"
                >
                  {copy.newButton}
                </Link>
              </div>
            ) : sales.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 px-6 py-14 text-center dark:border-slate-700">
                <p className="text-[15px] font-semibold text-slate-800 dark:text-slate-200">
                  Ningún documento coincide con la búsqueda o los filtros
                </p>
                <p className="mt-2 text-[13px] font-medium text-slate-500 dark:text-slate-400">
                  Prueba con otro término o ajusta estado, pago o canal.
                </p>
              </div>
            ) : (
              <>
            {/* Desktop: tabla (estilo clientes) */}
            <div className="hidden overflow-hidden rounded-2xl border border-slate-100 dark:border-slate-800 xl:block">
              <div
                className="grid grid-cols-[minmax(100px,1fr)_1fr_minmax(100px,1.2fr)_minmax(70px,0.8fr)_minmax(90px,0.9fr)_minmax(72px,0.7fr)_minmax(96px,auto)] items-center gap-x-6 border-b border-slate-100 px-5 py-3.5 dark:border-slate-800"
                aria-hidden
              >
                <div className="min-w-0 text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-500">Factura / pedido</div>
                <div className="min-w-0 text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-500">Fecha</div>
                <div className="min-w-0 text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-500">Cliente</div>
                <div className="min-w-0 text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-500">Pago</div>
                <div className="min-w-0 text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-500">Estado</div>
                <div className="min-w-0 w-full text-right text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-500">Total</div>
                <div className="min-w-0 text-right text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-500">Acciones</div>
              </div>
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {sales.map((s, index) => {
                const isSelected = index === selectedIndex;
                const customerName = s.customers?.name ?? "Cliente final";
                return (
                  <div
                    key={s.id}
                    ref={(el) => { cardRefs.current[index] = el; }}
                    role="button"
                    tabIndex={-1}
                    onClick={() => router.push(`/ventas/${s.id}`)}
                    className={`grid grid-cols-[minmax(100px,1fr)_1fr_minmax(100px,1.2fr)_minmax(70px,0.8fr)_minmax(90px,0.9fr)_minmax(72px,0.7fr)_minmax(96px,auto)] items-center gap-x-6 px-5 py-4 cursor-pointer transition-colors duration-150 ${
                      isSelected
                        ? "bg-slate-50 hover:bg-slate-100/95 dark:bg-slate-800/60 dark:hover:bg-slate-800/85"
                        : "hover:bg-slate-100/90 dark:hover:bg-slate-800/55"
                    }`}
                  >
                    <div className="min-w-0 flex items-center gap-2.5">
                      {channelIconWrap(s)}
                      <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                        <p className="truncate text-[15px] font-medium tabular-nums tracking-tight text-slate-900 dark:text-slate-50">{displayInvoiceNumber(s.invoice_number)}</p>
                      </div>
                    </div>
                    <div className="min-w-0 self-center">
                      <p className="text-[14px] font-medium leading-snug text-slate-700 dark:text-slate-200">{formatTime(s.created_at)} · {formatDate(s.created_at)}</p>
                    </div>
                    <div className="min-w-0 self-center">
                      <p className="truncate text-[15px] font-medium tracking-tight text-slate-900 dark:text-slate-50">{customerName}</p>
                    </div>
                    <div className="min-w-0 self-center">
                      <span className={getPaymentListChipClass()}>{paymentLabel(s)}</span>
                    </div>
                    <div className="min-w-0 self-center">
                      <span className={getStatusListChipClass(s.status)}>{statusLabel(s)}</span>
                    </div>
                    <div className="min-w-0 flex w-full items-center justify-end self-center">
                      <span className="text-[15px] font-medium tabular-nums text-slate-900 dark:text-slate-50">$ {formatMoney(Number(s.total))}</span>
                    </div>
                    <div className="flex items-center justify-end gap-0.5 self-center" onClick={(e) => e.stopPropagation()}>
                      <Link href={`/ventas/${s.id}`} className={actionIconClass} aria-label="Ver detalle" title="Ver detalle">
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </Link>
                    </div>
                  </div>
                );
              })}
              </div>
            </div>

            {/* Mobile: tarjetas (estilo clientes) */}
            <div className="grid grid-cols-1 gap-4 pt-1 sm:grid-cols-2 xl:hidden">
              {sales.map((s, index) => {
                const isSelected = index === selectedIndex;
                const customerName = s.customers?.name ?? "Cliente final";
                return (
                  <div
                    key={s.id}
                    ref={(el) => { cardRefs.current[index] = el; }}
                    role="button"
                    tabIndex={-1}
                    onClick={() => router.push(`/ventas/${s.id}`)}
                    className={`cursor-pointer rounded-2xl border border-slate-100 bg-slate-50/40 px-5 py-4 transition-[border-color,background-color,box-shadow] duration-150 dark:border-slate-800 dark:bg-slate-800/25 ${
                      isSelected
                        ? "ring-2 ring-slate-400/55 hover:border-slate-200 hover:bg-white hover:shadow-md dark:hover:border-slate-600 dark:hover:bg-slate-800/55 dark:hover:shadow-[0_4px_14px_rgba(0,0,0,0.25)]"
                        : "hover:border-slate-200 hover:bg-white hover:shadow-md dark:hover:border-slate-600 dark:hover:bg-slate-800/50 dark:hover:shadow-[0_4px_14px_rgba(0,0,0,0.25)]"
                    }`}
                  >
                    <div className="flex flex-col gap-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-500">Factura / pedido</span>
                        <div className="flex min-w-0 items-center gap-2">
                          {channelIconWrap(s)}
                          <span className="truncate text-[15px] font-medium tabular-nums tracking-tight text-slate-900 dark:text-slate-50">{displayInvoiceNumber(s.invoice_number)}</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-500">Fecha</span>
                        <span className="text-[14px] font-medium text-slate-700 dark:text-slate-200">{formatTime(s.created_at)} · {formatDate(s.created_at)}</span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-500">Cliente</span>
                        <span className="truncate text-right text-[14px] font-medium text-slate-900 dark:text-slate-50">{customerName}</span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-500">Pago · Estado</span>
                        <span className="flex flex-wrap items-center justify-end gap-1.5 text-[14px]">
                          <span className={getPaymentListChipClass()}>{paymentLabel(s)}</span>
                          <span className="text-slate-300 dark:text-slate-600" aria-hidden>
                            ·
                          </span>
                          <span className={getStatusListChipClass(s.status)}>{statusLabel(s)}</span>
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-500">Total</span>
                        <span className="text-[15px] font-medium tabular-nums text-slate-900 dark:text-slate-50">$ {formatMoney(Number(s.total))}</span>
                      </div>
                      <div className="flex items-center justify-end gap-0.5 border-t border-slate-100 pt-3 dark:border-slate-800" onClick={(e) => e.stopPropagation()}>
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
