"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { MdLocalShipping, MdStorefront, MdWarning, MdCheckCircle } from "react-icons/md";
import { getCopy, getStatusLabelForSale, getStatusClass, type SalesMode, ORDER_STATUS_FILTERS, SALES_STATUS_FILTERS } from "./sales-mode";

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
  customers: { name: string } | null;
  users: { name: string } | null;
};

type StatusFilter = "all" | "completed" | "cancelled" | "pending" | "preparing" | "on_the_way" | "delivered";
type PaymentFilter = "all" | "cash" | "transfer" | "mixed";

export default function SalesPage() {
  const [sales, setSales] = useState<SaleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [paymentFilter, setPaymentFilter] = useState<PaymentFilter>("all");
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [showLoadingUI, setShowLoadingUI] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [salesMode, setSalesMode] = useState<SalesMode>("sales");
  const listRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const hasFocusedList = useRef(false);
  const loadingDelayRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (loading) {
      loadingDelayRef.current = setTimeout(() => setShowLoadingUI(true), 400);
    } else {
      if (loadingDelayRef.current) clearTimeout(loadingDelayRef.current);
      loadingDelayRef.current = null;
      setShowLoadingUI(false);
    }
    return () => {
      if (loadingDelayRef.current) clearTimeout(loadingDelayRef.current);
    };
  }, [loading]);

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
          "id, branch_id, user_id, customer_id, invoice_number, total, payment_method, status, payment_pending, is_delivery, delivery_paid, delivery_fee, created_at, customers(name), users!user_id(name)",
          { count: "exact" }
        )
        .eq("branch_id", ub.branch_id)
        .order("created_at", { ascending: false })
        .range(from, to);

      const qTrim = searchQuery.trim();
      if (qTrim) q = q.ilike("invoice_number", `%${qTrim}%`);
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
  }, [refreshKey, page, searchQuery, statusFilter, paymentFilter]);

  const filteredSales = sales.filter((s) => {
    const matchSearch =
      !searchQuery.trim() ||
      s.invoice_number.toLowerCase().includes(searchQuery.trim().toLowerCase()) ||
      (s.customers?.name?.toLowerCase().includes(searchQuery.trim().toLowerCase()) ?? false);
    return matchSearch;
  });

  useEffect(() => {
    setSelectedIndex((i) => Math.min(i, Math.max(0, filteredSales.length - 1)));
  }, [filteredSales.length]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (filteredSales.length === 0) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, filteredSales.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        router.push(`/ventas/${filteredSales[selectedIndex].id}`);
      }
    },
    [filteredSales, selectedIndex, router]
  );

  useEffect(() => {
    cardRefs.current[selectedIndex]?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [selectedIndex]);

  useEffect(() => {
    if (!loading && filteredSales.length > 0 && listRef.current && !hasFocusedList.current) {
      hasFocusedList.current = true;
      listRef.current.focus({ preventScroll: true });
    }
  }, [loading, filteredSales.length]);

  const copy = getCopy(salesMode);
  const paymentLabel = (p: SaleRow) =>
    p.payment_method === "cash" ? "Efectivo" : p.payment_method === "mixed" ? "Mixto" : "Transferencia";
  const paymentColorClass = (p: SaleRow) =>
    p.payment_method === "cash" ? "font-semibold text-emerald-600 dark:text-emerald-400" : p.payment_method === "mixed" ? "font-semibold text-violet-600 dark:text-violet-400" : "font-semibold text-blue-600 dark:text-blue-400";
  const statusLabel = (s: SaleRow) => getStatusLabelForSale(s.status, s.is_delivery);
  const statusClass = (s: SaleRow) => getStatusClass(s.status);
  const statusFilterOptions = salesMode === "orders" ? ORDER_STATUS_FILTERS : SALES_STATUS_FILTERS;

  return (
    <div className="min-w-0 space-y-4 max-w-[1600px] mx-auto">
      <header className="space-y-2 min-w-0">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-lg font-bold tracking-tight text-slate-900 dark:text-emerald-50 sm:text-2xl">
              {copy.sectionTitle}
            </h1>
            <p className="mt-0.5 text-[13px] font-medium text-slate-500 dark:text-slate-400">
              Facturas de mostrador y pedidos con envío. Busca por número o cliente y filtra por estado o forma de pago.
            </p>
          </div>
          <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-wrap sm:items-center">
            <button
              type="button"
              onClick={() => setRefreshKey((k) => k + 1)}
              className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3 text-[13px] font-medium text-slate-700 transition-colors hover:bg-slate-50 sm:w-auto sm:px-4 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Actualizar
            </button>
            <Link
              href="/ventas/nueva"
              className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-lg bg-ov-pink px-3 text-[13px] font-medium text-white shadow-sm transition-colors hover:bg-ov-pink-hover sm:w-auto sm:px-4 dark:bg-ov-pink dark:hover:bg-ov-pink-hover"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              {copy.newButton}
            </Link>
          </div>
        </div>
      </header>

      {!loading && totalCount > 0 && (
        <div className="space-y-3">
          <div className="relative min-w-0 w-full lg:max-w-md">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
              placeholder="Buscar por número o cliente..."
              aria-label="Buscar por número o cliente"
              className="h-10 w-full rounded-lg border border-slate-300 bg-white pl-10 pr-4 text-[14px] text-slate-800 placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-ov-pink/30 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-400"
            />
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:max-w-md">
            <div className="space-y-1">
              <label className="block text-[12px] font-medium text-slate-600 dark:text-slate-400">Estado</label>
              <select
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value as StatusFilter); setPage(1); }}
                className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-[13px] font-medium text-slate-700 outline-none focus:ring-2 focus:ring-ov-pink/30 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
              >
                {statusFilterOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="block text-[12px] font-medium text-slate-600 dark:text-slate-400">Pago</label>
              <select
                value={paymentFilter}
                onChange={(e) => { setPaymentFilter(e.target.value as PaymentFilter); setPage(1); }}
                className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-[13px] font-medium text-slate-700 outline-none focus:ring-2 focus:ring-ov-pink/30 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200"
              >
                <option value="all">Todas</option>
                <option value="cash">Efectivo</option>
                <option value="transfer">Transferencia</option>
                <option value="mixed">Mixto</option>
              </select>
            </div>
          </div>
        </div>
      )}

      <section
        ref={listRef}
        tabIndex={0}
        onKeyDown={handleKeyDown}
        className="space-y-3 outline-none"
        aria-label="Lista de facturas y pedidos. Usa flechas arriba y abajo para moverte, Enter para abrir."
      >
        {loading && showLoadingUI ? (
          <div className="flex min-h-[200px] items-center justify-center pt-48 pb-12">
            <p className="font-logo text-lg font-bold tracking-tight text-slate-800 dark:text-white sm:text-xl" aria-live="polite">
              NOU<span className="animate-pulse">...</span>
            </p>
          </div>
        ) : loading ? (
          <div className="min-h-[280px]" aria-hidden />
        ) : loadError ? (
          <div className="rounded-xl bg-amber-50 p-6 text-center dark:bg-amber-900/20">
            <p className="text-[15px] font-medium text-amber-800 dark:text-amber-200">
              Error al cargar las ventas
            </p>
            <p className="mt-1 text-[13px] text-amber-700 dark:text-amber-300/90">
              {loadError}
            </p>
            <p className="mt-2 text-[12px] text-slate-500 dark:text-slate-400">
              Si acabas de agregar migraciones (is_delivery, cancellation_requested_at, etc.), ejecuta las migraciones de Supabase y vuelve a intentar.
            </p>
            <button
              type="button"
              onClick={() => setRefreshKey((k) => k + 1)}
              className="mt-4 inline-flex h-9 items-center gap-2 rounded-lg bg-ov-pink px-4 text-[13px] font-medium text-white shadow-sm hover:bg-ov-pink-hover"
            >
              Actualizar
            </button>
          </div>
        ) : filteredSales.length === 0 ? (
          <div className="rounded-xl bg-white p-8 text-center shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
            <p className="text-[15px] font-medium text-slate-700 dark:text-slate-300">
              {totalCount === 0 ? copy.emptyTitle : "Ningún documento coincide con los filtros en esta página"}
            </p>
            <p className="mt-1 text-[13px] text-slate-500 dark:text-slate-400">
              {totalCount === 0 ? "Registra tu primera factura o pedido para verlo aquí." : "Prueba cambiando la búsqueda, el estado o la forma de pago."}
            </p>
            <Link
              href="/ventas/nueva"
              className="mt-4 inline-flex h-9 items-center gap-2 rounded-lg bg-ov-pink px-4 text-[13px] font-medium text-white shadow-sm transition-colors hover:bg-ov-pink-hover"
            >
              {copy.newButton}
            </Link>
          </div>
        ) : (
          <>
            {/* Desktop: tabla con encabezado y filas alineadas (igual que productos) */}
            <div className="hidden overflow-hidden rounded-xl ring-1 ring-slate-200 bg-white dark:ring-slate-800 dark:bg-slate-900 xl:block">
              <div
                className="grid grid-cols-[minmax(100px,1fr)_1fr_minmax(100px,1.2fr)_minmax(70px,0.8fr)_minmax(90px,0.9fr)_minmax(72px,0.7fr)_minmax(155px,auto)] gap-x-6 items-center px-5 py-3 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800"
                aria-hidden
              >
                <div className="min-w-0 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Factura / pedido</div>
                <div className="min-w-0 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Fecha</div>
                <div className="min-w-0 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Cliente</div>
                <div className="min-w-0 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Pago</div>
                <div className="min-w-0 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Estado</div>
                <div className="min-w-0 w-full text-right text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Total</div>
                <div className="min-w-0 pl-4 text-right text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Acciones</div>
              </div>
              {filteredSales.map((s, index) => {
                const isSelected = index === selectedIndex;
                const customerName = s.customers?.name ?? "Cliente final";
                const isLast = index === filteredSales.length - 1;
                return (
                  <div
                    key={s.id}
                    ref={(el) => { cardRefs.current[index] = el; }}
                    role="button"
                    tabIndex={-1}
                    onClick={() => router.push(`/ventas/${s.id}`)}
                    className={`grid grid-cols-[minmax(100px,1fr)_1fr_minmax(100px,1.2fr)_minmax(70px,0.8fr)_minmax(90px,0.9fr)_minmax(72px,0.7fr)_minmax(155px,auto)] gap-x-6 items-center px-5 py-4 cursor-pointer transition-colors border-b border-slate-100 dark:border-slate-800 ${
                      isLast ? "border-b-0" : ""
                    } ${
                      isSelected ? "bg-slate-100 dark:bg-slate-800" : "hover:bg-slate-50 dark:hover:bg-slate-800/50"
                    }`}
                  >
                    <div className="min-w-0 flex items-center gap-2">
                      {s.is_delivery ? (
                        <span className="group relative inline-flex">
                          <MdLocalShipping
                            className={`h-5 w-5 shrink-0 ${
                              s.delivery_fee && s.delivery_fee > 0 && !s.delivery_paid
                                ? "text-amber-500 dark:text-amber-400"
                                : "text-emerald-600 dark:text-emerald-400"
                            }`}
                            aria-hidden
                          />
                          <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 flex items-start gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-[13px] font-medium text-white opacity-0 shadow-xl transition-opacity duration-200 group-hover:opacity-100 dark:bg-slate-800">
                            {s.delivery_fee && s.delivery_fee > 0 && !s.delivery_paid ? (
                              <><MdWarning className="h-4 w-4 shrink-0 mt-0.5 text-amber-400" aria-hidden /><span className="flex flex-col leading-tight"><span>El envío</span><span>no se ha pagado</span></span></>
                            ) : s.delivery_fee && s.delivery_fee > 0 && s.delivery_paid ? (
                              <><MdCheckCircle className="h-4 w-4 shrink-0 mt-0.5 text-emerald-400" aria-hidden /><span className="flex flex-col leading-tight"><span>El envío</span><span>está pagado</span></span></>
                            ) : (
                              <span>Envío</span>
                            )}
                          </span>
                        </span>
                      ) : (
                        <MdStorefront className="h-5 w-5 shrink-0 text-ov-pink dark:text-ov-pink-muted" title="En tienda" aria-hidden />
                      )}
                      <p className="text-[14px] font-bold text-slate-900 dark:text-slate-50 tabular-nums truncate">{displayInvoiceNumber(s.invoice_number)}</p>
                    </div>
                    <div className="min-w-0">
                      <p className="text-[14px] font-medium text-slate-700 dark:text-slate-200">{formatTime(s.created_at)} · {formatDate(s.created_at)}</p>
                    </div>
                    <div className="min-w-0">
                      <p className="text-[15px] sm:text-base font-bold text-slate-900 dark:text-slate-50 truncate">{customerName}</p>
                    </div>
                    <div className="min-w-0">
                      <p className={`text-[14px] ${paymentColorClass(s)}`}>{paymentLabel(s)}</p>
                    </div>
                    <div className="min-w-0">
                      <p className={`text-[14px] font-bold ${statusClass(s)}`}>{statusLabel(s)}</p>
                    </div>
                    <div className="min-w-0 w-full flex items-center justify-end">
                      <span className="text-[14px] sm:text-base font-bold text-slate-900 dark:text-slate-50 tabular-nums">$ {formatMoney(Number(s.total))}</span>
                    </div>
                    <div className="min-w-0 pl-6 flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                      <span className="relative inline-flex group/tooltip">
                        <Link href={`/ventas/${s.id}`} className="inline-flex p-1 text-ov-pink hover:text-ov-pink-hover dark:text-ov-pink dark:hover:text-ov-pink-hover" aria-label="Ver detalle">
                          <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                        </Link>
                        <span className="absolute left-1/2 -translate-x-1/2 top-full mt-1 px-2 py-1 text-[11px] font-medium text-white bg-slate-800 dark:bg-slate-700 rounded shadow-lg whitespace-nowrap opacity-0 pointer-events-none transition-opacity duration-150 group-hover/tooltip:opacity-100 z-50">Ver detalle</span>
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Mobile: tarjetas apiladas (igual que productos) */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:hidden">
              {filteredSales.map((s, index) => {
                const isSelected = index === selectedIndex;
                const customerName = s.customers?.name ?? "Cliente final";
                return (
                  <div
                    key={s.id}
                    ref={(el) => { cardRefs.current[index] = el; }}
                    role="button"
                    tabIndex={-1}
                    onClick={() => router.push(`/ventas/${s.id}`)}
                    className={`rounded-xl shadow-sm ring-1 cursor-pointer transition-all px-4 py-3 ${
                      isSelected ? "bg-slate-100 ring-slate-300 dark:bg-slate-800 dark:ring-slate-600" : "bg-white ring-slate-200 hover:bg-slate-100 dark:bg-slate-900 dark:ring-slate-800 dark:hover:bg-slate-800"
                    }`}
                  >
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[12px] font-medium text-slate-500 dark:text-slate-400">Número</span>
                        <div className="flex min-w-0 items-center gap-2">
                          {s.is_delivery ? (
                            <MdLocalShipping
                              className={`h-4 w-4 shrink-0 ${
                                s.delivery_fee && s.delivery_fee > 0 && !s.delivery_paid
                                  ? "text-amber-500 dark:text-amber-400"
                                  : "text-emerald-600 dark:text-emerald-400"
                              }`}
                              aria-hidden
                            />
                          ) : (
                            <MdStorefront className="h-4 w-4 shrink-0 text-ov-pink dark:text-ov-pink-muted" title="En tienda" aria-hidden />
                          )}
                          <span className="truncate font-bold tabular-nums text-slate-900 dark:text-slate-50">{displayInvoiceNumber(s.invoice_number)}</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[12px] font-medium text-slate-500 dark:text-slate-400">Fecha</span>
                        <span className="text-[14px] font-medium text-slate-700 dark:text-slate-200">{formatTime(s.created_at)} · {formatDate(s.created_at)}</span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[12px] font-medium text-slate-500 dark:text-slate-400">Cliente</span>
                        <span className="truncate text-right text-[14px] font-medium text-slate-900 dark:text-slate-50">{customerName}</span>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[12px] font-medium text-slate-500 dark:text-slate-400">Pago · Estado</span>
                        <span className="text-[14px]"><span className={paymentColorClass(s)}>{paymentLabel(s)}</span> · <span className={statusClass(s)}>{statusLabel(s)}</span></span>
                      </div>
                      <div className="flex items-center justify-between gap-2 border-t border-slate-100 pt-2 dark:border-slate-800">
                        <span className="text-[12px] font-medium text-slate-500 dark:text-slate-400">Total</span>
                        <span className="text-base font-bold tabular-nums text-slate-900 dark:text-slate-50">$ {formatMoney(Number(s.total))}</span>
                      </div>
                      <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
                        <span className="inline-flex gap-1 text-[13px] font-medium text-ov-pink" onClick={(e) => e.stopPropagation()}>
                          <Link href={`/ventas/${s.id}`} className="hover:underline" title="Ver detalle">Ver detalle</Link>
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
