"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

const PAGE_SIZE = 20;

type CustomerAddress = {
  id: string;
  label: string;
  address: string;
  reference_point: string | null;
  is_default: boolean;
  display_order: number;
};

type CustomerRow = {
  id: string;
  organization_id: string;
  name: string;
  cedula: string | null;
  email: string | null;
  phone: string | null;
  created_at: string;
  customer_addresses: CustomerAddress[] | null;
};

export default function CustomersPage() {
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [showLoadingUI, setShowLoadingUI] = useState(false);
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
      const { data: userRow } = await supabase.from("users").select("organization_id").eq("id", user.id).single();
      if (!userRow?.organization_id || cancelled) return;

      const from = (page - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      let q = supabase
        .from("customers")
        .select("id, organization_id, name, cedula, email, phone, created_at, customer_addresses(id, label, address, reference_point, is_default, display_order)", { count: "exact" })
        .eq("organization_id", userRow.organization_id)
        .eq("active", true)
        .order("name", { ascending: true })
        .range(from, to);

      const qTrim = searchQuery.trim();
      if (qTrim) {
        q = q.or(`name.ilike.%${qTrim}%,cedula.ilike.%${qTrim}%,email.ilike.%${qTrim}%,phone.ilike.%${qTrim}%`);
      }

      let { data: customersData, count, error } = await q;
      if (cancelled) return;
      // Si falla (ej. columna active no existe), intentar sin filtrar por active
      if (error) {
        const q2 = supabase
          .from("customers")
          .select("id, organization_id, name, cedula, email, phone, created_at, customer_addresses(id, label, address, reference_point, is_default, display_order)", { count: "exact" })
          .eq("organization_id", userRow.organization_id)
          .order("name", { ascending: true })
          .range(from, to);
        const q2WithSearch = qTrim ? q2.or(`name.ilike.%${qTrim}%,cedula.ilike.%${qTrim}%,email.ilike.%${qTrim}%,phone.ilike.%${qTrim}%`) : q2;
        const res2 = await q2WithSearch;
        if (cancelled) return;
        customersData = res2.data;
        count = res2.count;
        error = res2.error;
      }
      if (!error) {
        setCustomers((customersData ?? []) as CustomerRow[]);
        setTotalCount(count ?? 0);
      } else {
        setCustomers([]);
        setTotalCount(0);
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [refreshKey, page, searchQuery]);

  const filteredCustomers = customers.filter((c) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      c.name.toLowerCase().includes(q) ||
      (c.cedula?.includes(searchQuery.trim()) ?? false) ||
      (c.email?.toLowerCase().includes(q) ?? false) ||
      (c.phone?.includes(searchQuery.trim()) ?? false)
    );
  });

  useEffect(() => {
    setSelectedIndex((i) => Math.min(i, Math.max(0, filteredCustomers.length - 1)));
  }, [filteredCustomers.length]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (filteredCustomers.length === 0) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, filteredCustomers.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        router.push(`/clientes/${filteredCustomers[selectedIndex].id}`);
      }
    },
    [filteredCustomers, selectedIndex, router]
  );

  useEffect(() => {
    cardRefs.current[selectedIndex]?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [selectedIndex]);

  useEffect(() => {
    if (!loading && filteredCustomers.length > 0 && listRef.current && !hasFocusedList.current) {
      hasFocusedList.current = true;
      listRef.current.focus({ preventScroll: true });
    }
  }, [loading, filteredCustomers.length]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const showPagination = !loading && totalCount > PAGE_SIZE;
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

  const paginationBar = showPagination && (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-900">
      <p className="text-[13px] font-medium text-slate-600 dark:text-slate-400">
        {totalCount} {totalCount === 1 ? "cliente" : "clientes"}
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
    <div className="min-w-0 space-y-4 max-w-[1600px] mx-auto">
      <header className="space-y-2 min-w-0">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-lg font-bold tracking-tight text-slate-900 dark:text-emerald-50 sm:text-2xl">
              Clientes
            </h1>
            <p className="mt-0.5 text-[13px] font-medium text-slate-500 dark:text-slate-400">
              Lista de clientes de tu organización. Busca por nombre, email o teléfono.
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
              href="/clientes/nueva"
              className="inline-flex h-9 items-center gap-2 rounded-lg bg-ov-pink px-4 text-[13px] font-medium text-white shadow-sm transition-colors hover:bg-ov-pink-hover dark:bg-ov-pink dark:hover:bg-ov-pink-hover"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Nuevo cliente
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
              placeholder="Buscar por nombre, cédula, email o teléfono..."
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
        aria-label="Lista de clientes. Usa flechas arriba y abajo para moverte, Enter para abrir."
      >
        {loading && showLoadingUI ? (
          <div className="flex min-h-[200px] items-center justify-center pt-48 pb-12">
            <p className="font-logo text-lg font-bold tracking-tight text-slate-800 dark:text-white sm:text-xl" aria-live="polite">
              NOU<span className="animate-pulse">...</span>
            </p>
          </div>
        ) : loading ? (
          <div className="min-h-[280px]" aria-hidden />
        ) : filteredCustomers.length === 0 ? (
          <div className="rounded-xl bg-white p-8 text-center shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
            <p className="text-[15px] font-medium text-slate-700 dark:text-slate-300">
              {totalCount === 0 ? "Aún no tienes clientes" : "Ningún cliente coincide con la búsqueda en esta página"}
            </p>
            <p className="mt-1 text-[13px] text-slate-500 dark:text-slate-400">
              {totalCount === 0 ? "Registra tu primer cliente para verlo aquí." : "Prueba con otro término de búsqueda."}
            </p>
            <Link
              href="/clientes/nueva"
              className="mt-4 inline-flex h-9 items-center gap-2 rounded-lg bg-ov-pink px-4 text-[13px] font-medium text-white shadow-sm transition-colors hover:bg-ov-pink-hover"
            >
              Nuevo cliente
            </Link>
          </div>
        ) : (
          <>
            {/* Desktop: tabla con mismos encabezados y grid que inventario */}
            <div className="hidden overflow-hidden rounded-xl ring-1 ring-slate-200 bg-white dark:ring-slate-800 dark:bg-slate-900 sm:block">
              <div
                className="grid grid-cols-[minmax(120px,1.5fr)_minmax(80px,0.8fr)_1fr_minmax(90px,0.9fr)_minmax(140px,1.5fr)_minmax(155px,auto)] gap-x-6 items-center px-5 py-3 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800"
                aria-hidden
              >
                <div className="min-w-0 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Cliente</div>
                <div className="min-w-0 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Cédula</div>
                <div className="min-w-0 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Email</div>
                <div className="min-w-0 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Teléfono</div>
                <div className="min-w-0 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Dirección</div>
                <div className="min-w-0 pl-4 text-right text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Acciones</div>
              </div>
              {filteredCustomers.map((c, index) => {
                const isSelected = index === selectedIndex;
                const isLast = index === filteredCustomers.length - 1;
                const addrs = c.customer_addresses ?? [];
                const sortedAddrs = [...addrs].sort((a, b) => (a.is_default ? -1 : 0) - (b.is_default ? -1 : 0) || a.display_order - b.display_order);
                const firstAddr = sortedAddrs[0];
                return (
                  <div
                    key={c.id}
                    ref={(el) => { cardRefs.current[index] = el; }}
                    role="button"
                    tabIndex={-1}
                    onClick={() => router.push(`/clientes/${c.id}`)}
                    className={`grid grid-cols-[minmax(120px,1.5fr)_minmax(80px,0.8fr)_1fr_minmax(90px,0.9fr)_minmax(140px,1.5fr)_minmax(155px,auto)] gap-x-6 items-center px-5 py-4 cursor-pointer transition-colors border-b border-slate-100 dark:border-slate-800 ${
                      isLast ? "border-b-0" : ""
                    } ${
                      isSelected ? "bg-slate-100 dark:bg-slate-800" : "hover:bg-slate-50 dark:hover:bg-slate-800/50"
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="text-[15px] sm:text-base font-bold text-slate-900 dark:text-slate-50 truncate">{c.name}</p>
                    </div>
                    <div className="min-w-0">
                      <p className="text-[14px] font-medium text-slate-700 dark:text-slate-200 truncate">{c.cedula ? `CC ${c.cedula}` : "—"}</p>
                    </div>
                    <div className="min-w-0">
                      <p className="text-[14px] font-medium text-slate-700 dark:text-slate-200 truncate">{c.email || "—"}</p>
                    </div>
                    <div className="min-w-0">
                      <p className="text-[14px] font-medium text-slate-700 dark:text-slate-200 truncate">{c.phone || "—"}</p>
                    </div>
                    <div className="min-w-0">
                      {firstAddr ? (
                        <>
                          <p className="text-[14px] font-medium text-slate-700 dark:text-slate-200 truncate" title={firstAddr.address}>
                            {addrs.length > 1 ? `${firstAddr.label}: ${firstAddr.address}` : firstAddr.address}
                          </p>
                          {firstAddr.reference_point && (
                            <p className="mt-0.5 text-[12px] text-slate-500 dark:text-slate-400 truncate" title={firstAddr.reference_point}>Ref: {firstAddr.reference_point}</p>
                          )}
                          {addrs.length > 1 && (
                            <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">+{addrs.length - 1} {addrs.length === 2 ? "dirección más" : "direcciones más"}</p>
                          )}
                        </>
                      ) : (
                        <p className="text-[14px] font-medium text-slate-500 dark:text-slate-400">—</p>
                      )}
                    </div>
                    <div className="min-w-0 pl-6 flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                      <span className="relative inline-flex group/tooltip">
                        <Link href={`/clientes/${c.id}`} className="inline-flex p-1 text-ov-pink hover:text-ov-pink-hover dark:text-ov-pink dark:hover:text-ov-pink-hover" aria-label="Ver detalle">
                          <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                        </Link>
                        <span className="absolute left-1/2 -translate-x-1/2 top-full mt-1 px-2 py-1 text-[11px] font-medium text-white bg-slate-800 dark:bg-slate-700 rounded shadow-lg whitespace-nowrap opacity-0 pointer-events-none transition-opacity duration-150 group-hover/tooltip:opacity-100 z-50">Ver detalle del cliente</span>
                      </span>
                      <span className="relative inline-flex group/tooltip">
                        <Link href={`/clientes/${c.id}/editar`} className="inline-flex p-1 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200" aria-label="Editar">
                          <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125" /></svg>
                        </Link>
                        <span className="absolute left-1/2 -translate-x-1/2 top-full mt-1 px-2 py-1 text-[11px] font-medium text-white bg-slate-800 dark:bg-slate-700 rounded shadow-lg whitespace-nowrap opacity-0 pointer-events-none transition-opacity duration-150 group-hover/tooltip:opacity-100 z-50">Editar nombre, cédula, contacto y direcciones</span>
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Mobile: tarjetas apiladas (igual estilo que inventario) */}
            <div className="space-y-3 sm:hidden">
              {filteredCustomers.map((c, index) => {
                const isSelected = index === selectedIndex;
                const addrs = c.customer_addresses ?? [];
                const sortedAddrs = [...addrs].sort((a, b) => (a.is_default ? -1 : 0) - (b.is_default ? -1 : 0) || a.display_order - b.display_order);
                const firstAddr = sortedAddrs[0];
                return (
                  <div
                    key={c.id}
                    ref={(el) => { cardRefs.current[index] = el; }}
                    role="button"
                    tabIndex={-1}
                    onClick={() => router.push(`/clientes/${c.id}`)}
                    className={`rounded-xl shadow-sm ring-1 cursor-pointer transition-all px-4 py-3 ${
                      isSelected ? "bg-slate-100 ring-slate-300 dark:bg-slate-800 dark:ring-slate-600" : "bg-white ring-slate-200 hover:bg-slate-100 dark:bg-slate-900 dark:ring-slate-800 dark:hover:bg-slate-800"
                    }`}
                  >
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center justify-between gap-2"><span className="text-[12px] font-medium text-slate-500 dark:text-slate-400">Cliente</span><p className="truncate text-right text-[14px] font-bold text-slate-900 dark:text-slate-50">{c.name}</p></div>
                      <div className="flex items-center justify-between gap-2"><span className="text-[12px] font-medium text-slate-500 dark:text-slate-400">Cédula</span><p className="text-[14px] font-medium text-slate-700 dark:text-slate-200">{c.cedula ? `CC ${c.cedula}` : "—"}</p></div>
                      <div className="flex items-center justify-between gap-2"><span className="text-[12px] font-medium text-slate-500 dark:text-slate-400">Email</span><p className="truncate text-right text-[14px] font-medium text-slate-700 dark:text-slate-200">{c.email || "—"}</p></div>
                      <div className="flex items-center justify-between gap-2"><span className="text-[12px] font-medium text-slate-500 dark:text-slate-400">Teléfono</span><p className="text-[14px] font-medium text-slate-700 dark:text-slate-200">{c.phone || "—"}</p></div>
                      <div className="flex items-center justify-between gap-2 border-t border-slate-100 pt-2 dark:border-slate-800"><span className="text-[12px] font-medium text-slate-500 dark:text-slate-400">Dirección</span><div className="min-w-0 text-right"><p className="text-[13px] font-medium text-slate-600 dark:text-slate-300 truncate" title={firstAddr?.address}>{firstAddr ? (addrs.length > 1 ? `${firstAddr.label}: ${firstAddr.address}` : firstAddr.address) : "—"}</p>{addrs.length > 1 && <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">+{addrs.length - 1} {addrs.length === 2 ? "dirección más" : "direcciones más"}</p>}</div></div>
                      <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
                        <span className="inline-flex gap-1 text-[13px] font-medium text-ov-pink" onClick={(e) => e.stopPropagation()}><Link href={`/clientes/${c.id}`} className="hover:underline" title="Ver detalle del cliente">Ver detalle</Link><svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg></span>
                        <span onClick={(e) => e.stopPropagation()}><Link href={`/clientes/${c.id}/editar`} className="text-[13px] font-medium text-slate-600 dark:text-slate-300 hover:underline" title="Editar nombre, cédula, contacto y direcciones">Editar</Link></span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </section>


      {paginationBar}
    </div>
  );
}
