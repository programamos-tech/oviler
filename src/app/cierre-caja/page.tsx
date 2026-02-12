"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import Breadcrumb from "@/app/components/Breadcrumb";
import { useEffect, useState, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

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

/** Genera el ID del cierre de caja: "001 cierre de caja", "002 cierre de caja", etc. */
function displayClosingId(index: number, total: number) {
  const number = String(total - index).padStart(3, "0");
  return `${number} cierre de caja`;
}

type CashClosingRow = {
  id: string;
  branch_id: string;
  user_id: string;
  closing_date: string;
  expected_cash: number;
  expected_transfer: number;
  actual_cash: number;
  actual_transfer: number;
  cash_difference: number;
  transfer_difference: number;
  total_sales: number;
  physical_sales: number;
  delivery_sales: number;
  total_units: number;
  cancelled_invoices: number;
  cancelled_total: number;
  warranties_count: number;
  notes: string | null;
  difference_reason: string | null;
  created_at: string;
  users: { name: string } | null;
};

export default function CashClosingsPage() {
  const [closings, setClosings] = useState<CashClosingRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [showLoadingUI, setShowLoadingUI] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
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
      const { data: ub } = await supabase
        .from("user_branches")
        .select("branch_id")
        .eq("user_id", user.id)
        .limit(1)
        .single();
      if (!ub?.branch_id || cancelled) return;

      const from = (page - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      let q = supabase
        .from("cash_closings")
        .select("*, users!user_id(name)", { count: "exact" })
        .eq("branch_id", ub.branch_id)
        .order("closing_date", { ascending: false })
        .range(from, to);

      const qTrim = searchQuery.trim();
      if (qTrim) {
        // Buscar por fecha o responsable
        q = q.or(`closing_date.ilike.%${qTrim}%,users.name.ilike.%${qTrim}%`);
      }

      const { data: closingsData, error: queryError, count } = await q;
      if (cancelled) return;
      if (queryError) {
        setLoadError(queryError.message);
        setClosings([]);
        setTotalCount(0);
      } else {
        setLoadError(null);
        setClosings((closingsData ?? []) as CashClosingRow[]);
        setTotalCount(count ?? 0);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshKey, page, searchQuery]);

  const filteredClosings = closings.filter((c) => {
    const matchSearch =
      !searchQuery.trim() ||
      c.closing_date.toLowerCase().includes(searchQuery.trim().toLowerCase()) ||
      (c.users?.name?.toLowerCase().includes(searchQuery.trim().toLowerCase()) ?? false);
    return matchSearch;
  });

  useEffect(() => {
    setSelectedIndex((i) => Math.min(i, Math.max(0, filteredClosings.length - 1)));
  }, [filteredClosings.length]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (filteredClosings.length === 0) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, filteredClosings.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        router.push(`/cierre-caja/${filteredClosings[selectedIndex].id}`);
      }
    },
    [filteredClosings, selectedIndex, router]
  );

  useEffect(() => {
    cardRefs.current[selectedIndex]?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [selectedIndex]);

  useEffect(() => {
    if (!loading && filteredClosings.length > 0 && listRef.current && !hasFocusedList.current) {
      hasFocusedList.current = true;
      listRef.current.focus({ preventScroll: true });
    }
  }, [loading, filteredClosings.length]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const showPagination = !loading && totalCount > 0;
  const pageNumbers = (() => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const around = 2;
    const start = Math.max(1, page - around);
    const end = Math.min(totalPages, page + around);
    const nums: (number | "…")[] = [];
    if (start > 1) { nums.push(1); if (start > 2) nums.push("…"); }
    for (let i = start; i <= end; i++) nums.push(i);
    if (end < totalPages) { if (end < totalPages - 1) nums.push("…"); nums.push(totalPages); }
    return nums;
  })();

  const getDifferenceStatus = (cashDiff: number, transferDiff: number) => {
    const totalDiff = cashDiff + transferDiff;
    if (totalDiff === 0) return { label: "Cuadre perfecto", class: "text-emerald-600 dark:text-emerald-400" };
    if (totalDiff < 0) return { label: "Falta dinero", class: "text-red-600 dark:text-red-400" };
    return { label: "Sobra dinero", class: "text-amber-600 dark:text-amber-400" };
  };

  const paginationBar = showPagination && (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-900">
      <p className="text-[13px] font-medium text-slate-600 dark:text-slate-400">
        {totalCount} {totalCount === 1 ? "cierre" : "cierres"}
        {totalPages > 1 && <> · Página {page} de {totalPages}</>}
      </p>
      {totalPages > 1 && (
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-300 bg-white font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:pointer-events-none dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            aria-label="Página anterior"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          {pageNumbers.map((n, i) =>
            n === "…" ? (
              <span key={`ellipsis-${i}`} className="px-2 text-slate-400">…</span>
            ) : (
              <button
                key={n}
                type="button"
                onClick={() => setPage(n)}
                className={`inline-flex h-9 min-w-[2.25rem] items-center justify-center rounded-lg border px-2 text-[13px] font-medium ${
                  page === n
                    ? "border-ov-pink bg-ov-pink text-white dark:bg-ov-pink dark:text-white"
                    : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
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
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-300 bg-white font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:pointer-events-none dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
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

  return (
    <div className="space-y-4 max-w-[1600px] mx-auto">
      <header className="space-y-2">
        <Breadcrumb items={[{ label: "Cierres de caja" }]} />
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-emerald-50">
              Cierres de caja
            </h1>
            <p className="mt-0.5 text-[13px] font-medium text-slate-500 dark:text-slate-400">
              Historial de cierres de caja diarios. Busca por fecha o responsable.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setRefreshKey((k) => k + 1)}
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 text-[13px] font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Actualizar
            </button>
            <Link
              href="/cierre-caja/nuevo"
              className="inline-flex h-9 items-center gap-2 rounded-lg bg-ov-pink px-4 text-[13px] font-medium text-white shadow-sm transition-colors hover:bg-ov-pink-hover dark:bg-ov-pink dark:hover:bg-ov-pink-hover"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Nuevo cierre
            </Link>
          </div>
        </div>
      </header>

      {!loading && totalCount > 0 && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
          <div className="relative flex-1 min-w-0 max-w-md">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </span>
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
              placeholder="Buscar por fecha o responsable..."
              className="h-10 w-full rounded-lg border border-slate-300 bg-white pl-10 pr-4 text-[14px] text-slate-800 placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-ov-pink/30 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-400"
            />
          </div>
        </div>
      )}

      <section
        ref={listRef}
        tabIndex={0}
        onKeyDown={handleKeyDown}
        className="space-y-3 outline-none"
        aria-label="Lista de cierres de caja. Usa flechas arriba y abajo para moverte, Enter para abrir."
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
              Error al cargar los cierres de caja
            </p>
            <p className="mt-1 text-[13px] text-amber-700 dark:text-amber-300/90">
              {loadError}
            </p>
            <button
              type="button"
              onClick={() => setRefreshKey((k) => k + 1)}
              className="mt-4 inline-flex h-9 items-center gap-2 rounded-lg bg-ov-pink px-4 text-[13px] font-medium text-white shadow-sm hover:bg-ov-pink-hover"
            >
              Actualizar
            </button>
          </div>
        ) : filteredClosings.length === 0 ? (
          <div className="rounded-xl bg-white p-8 text-center shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
            <p className="text-[15px] font-medium text-slate-700 dark:text-slate-300">
              {totalCount === 0 ? "Aún no hay cierres de caja" : "Ningún cierre coincide con los filtros en esta página"}
            </p>
            <p className="mt-1 text-[13px] text-slate-500 dark:text-slate-400">
              {totalCount === 0 ? "Registra tu primer cierre de caja para verlo aquí." : "Prueba cambiando la búsqueda."}
            </p>
            <Link
              href="/cierre-caja/nuevo"
              className="mt-4 inline-flex h-9 items-center gap-2 rounded-lg bg-ov-pink px-4 text-[13px] font-medium text-white shadow-sm transition-colors hover:bg-ov-pink-hover"
            >
              Nuevo cierre
            </Link>
          </div>
        ) : (
          filteredClosings.map((c, index) => {
            const isSelected = index === selectedIndex;
            const userName = c.users?.name ?? "—";
            const diffStatus = getDifferenceStatus(c.cash_difference, c.transfer_difference);
            const globalIndex = (page - 1) * PAGE_SIZE + index;
            
            return (
              <div
                key={c.id}
                ref={(el) => { cardRefs.current[index] = el; }}
                role="button"
                tabIndex={-1}
                onClick={() => router.push(`/cierre-caja/${c.id}`)}
                className={`rounded-xl shadow-sm ring-1 cursor-pointer transition-all ${
                  isSelected
                    ? "bg-slate-100 ring-slate-300 dark:bg-slate-800 dark:ring-slate-600"
                    : "bg-white ring-slate-200 hover:bg-slate-100 dark:bg-slate-900 dark:ring-slate-800 dark:hover:bg-slate-800"
                }`}
              >
                <div className="grid grid-cols-2 sm:grid-cols-[0.75fr_0.9fr_1.2fr_1fr_1fr_1.2fr_auto] gap-x-3 gap-y-2 sm:gap-x-4 sm:gap-y-0 items-center px-4 py-3 sm:px-5 sm:py-4">
                  <div className="col-span-2 sm:col-span-1 min-w-0 flex items-center gap-2">
                    <svg className="h-5 w-5 shrink-0 text-slate-600 dark:text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className="text-[14px] font-bold text-slate-900 dark:text-slate-50 tabular-nums truncate">
                      {displayClosingId(globalIndex, totalCount)}
                    </p>
                  </div>
                  <div className="min-w-0 flex items-center gap-2">
                    <svg className="h-4 w-4 shrink-0 text-slate-500 sm:hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-[14px] font-medium text-slate-700 dark:text-slate-200">
                      {formatDate(c.closing_date)} · {formatTime(c.created_at)}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[15px] sm:text-base font-bold text-slate-900 dark:text-slate-50 truncate">
                      {userName}
                    </p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[14px] font-medium text-slate-700 dark:text-slate-200">
                      {c.total_sales} {c.total_sales === 1 ? "venta" : "ventas"}
                    </p>
                  </div>
                  <div className="min-w-0">
                    <p className={`text-[14px] font-bold ${diffStatus.class}`}>
                      {diffStatus.label}
                    </p>
                  </div>
                  <div className="min-w-0">
                    <p className="text-[14px] sm:text-base font-bold text-slate-900 dark:text-slate-50 tabular-nums">
                      $ {formatMoney(Number(c.actual_cash + c.actual_transfer))}
                    </p>
                  </div>
                  <div className="col-span-2 sm:col-span-1 flex items-center justify-end">
                    <span className="group relative inline-flex" onClick={(e) => e.stopPropagation()}>
                      <Link
                        href={`/cierre-caja/${c.id}`}
                        className="inline-flex shrink-0 items-center justify-center p-1 text-ov-pink hover:text-ov-pink-hover dark:text-ov-pink dark:hover:text-ov-pink-hover"
                        aria-label="Ver detalle"
                      >
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      </Link>
                      <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 whitespace-nowrap rounded bg-slate-800 px-2 py-1 text-[11px] font-medium text-white opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100 dark:bg-slate-700">
                        Ver detalle
                      </span>
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </section>

      {paginationBar}
    </div>
  );
}
