"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { workspaceFilterSearchPillClass } from "@/lib/workspace-field-classes";
import { MdOutlineEdit, MdOutlineVisibility } from "react-icons/md";
import WorkspaceCharacterAvatar from "@/app/components/WorkspaceCharacterAvatar";
import { getAvatarVariant } from "@/app/components/app-nav-data";

const PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 350;

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
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const hasFocusedList = useRef(false);
  const fetchRequestId = useRef(0);
  const prevDebouncedSearch = useRef<string | undefined>(undefined);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const qp = searchParams.get("q");
    if (typeof qp === "string" && qp.trim()) {
      const t = qp.trim();
      setSearchInput(t);
      setDebouncedSearch(t);
    }
  }, [searchParams]);

  useEffect(() => {
    const id = window.setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(id);
  }, [searchInput]);

  useEffect(() => {
    if (prevDebouncedSearch.current !== undefined && prevDebouncedSearch.current !== debouncedSearch) {
      setPage(1);
    }
    prevDebouncedSearch.current = debouncedSearch;
  }, [debouncedSearch]);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;
    const reqId = ++fetchRequestId.current;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) {
        if (!cancelled && reqId === fetchRequestId.current) setLoading(false);
        return;
      }
      const { data: userRow } = await supabase.from("users").select("organization_id").eq("id", user.id).single();
      if (!userRow?.organization_id || cancelled) {
        if (!cancelled && reqId === fetchRequestId.current) setLoading(false);
        return;
      }
      const { data: ub } = await supabase.from("user_branches").select("branch_id").eq("user_id", user.id).limit(1).single();
      if (!ub?.branch_id || cancelled) {
        if (!cancelled && reqId === fetchRequestId.current) {
          setCustomers([]);
          setTotalCount(0);
          setLoading(false);
        }
        return;
      }

      const from = (page - 1) * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      let q = supabase
        .from("customers")
        .select("id, organization_id, name, cedula, email, phone, created_at, customer_addresses(id, label, address, reference_point, is_default, display_order)", { count: "exact" })
        .eq("organization_id", userRow.organization_id)
        .eq("branch_id", ub.branch_id)
        .eq("active", true)
        .order("name", { ascending: true })
        .range(from, to);

      const qTrim = debouncedSearch.trim();
      if (qTrim) {
        q = q.or(`name.ilike.%${qTrim}%,cedula.ilike.%${qTrim}%,email.ilike.%${qTrim}%,phone.ilike.%${qTrim}%`);
      }

      let { data: customersData, count, error } = await q;
      if (cancelled || reqId !== fetchRequestId.current) return;
      // Si falla (ej. columna active no existe), intentar sin filtrar por active
      if (error) {
        const q2 = supabase
          .from("customers")
          .select("id, organization_id, name, cedula, email, phone, created_at, customer_addresses(id, label, address, reference_point, is_default, display_order)", { count: "exact" })
          .eq("organization_id", userRow.organization_id)
          .eq("branch_id", ub.branch_id)
          .order("name", { ascending: true })
          .range(from, to);
        const q2WithSearch = qTrim ? q2.or(`name.ilike.%${qTrim}%,cedula.ilike.%${qTrim}%,email.ilike.%${qTrim}%,phone.ilike.%${qTrim}%`) : q2;
        const res2 = await q2WithSearch;
        if (cancelled || reqId !== fetchRequestId.current) return;
        customersData = res2.data;
        count = res2.count;
        error = res2.error;
      }
      if (cancelled || reqId !== fetchRequestId.current) return;
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
  }, [refreshKey, page, debouncedSearch]);

  useEffect(() => {
    setSelectedIndex((i) => Math.min(i, Math.max(0, customers.length - 1)));
  }, [customers.length]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (customers.length === 0) return;
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, customers.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        router.push(`/clientes/${customers[selectedIndex].id}`);
      }
    },
    [customers, selectedIndex, router]
  );

  useEffect(() => {
    cardRefs.current[selectedIndex]?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [selectedIndex]);

  useEffect(() => {
    if (!loading && customers.length > 0 && listRef.current && !hasFocusedList.current) {
      hasFocusedList.current = true;
      listRef.current.focus({ preventScroll: true });
    }
  }, [loading, customers.length]);

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
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-3xl bg-white px-5 py-4 dark:bg-slate-900">
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
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100/90 text-slate-700 transition-colors hover:bg-slate-200/80 disabled:pointer-events-none disabled:opacity-50 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
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
    "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[color:var(--shell-sidebar)] transition-colors hover:bg-slate-100 dark:text-zinc-300 dark:hover:bg-white/10";

  const showSearch =
    totalCount > 0 ||
    searchInput.trim() !== "" ||
    debouncedSearch.trim() !== "";

  return (
    <div className="mx-auto min-w-0 max-w-[1600px] space-y-8 font-sans text-[13px] font-normal leading-normal tracking-normal text-slate-800 antialiased dark:text-slate-100">
      <header className="min-w-0 rounded-2xl bg-white px-4 py-5 shadow-[0_1px_3px_rgba(15,23,42,0.06)] dark:bg-slate-900 dark:shadow-none sm:px-6 sm:py-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <h1 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-50 sm:text-xl">Clientes</h1>
            <p className="mt-1 whitespace-nowrap text-left text-[13px] font-medium leading-snug text-slate-500 dark:text-slate-400">
              Lista de esta sucursal. Busca por nombre, cédula, email o teléfono.
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
                href="/clientes/nueva"
                className="inline-flex h-9 w-full items-center justify-center gap-2 rounded-xl bg-[color:var(--shell-sidebar)] px-4 text-[13px] font-medium text-white shadow-[0_1px_2px_rgba(15,23,42,0.12)] transition-colors hover:bg-[color:var(--shell-sidebar-cta-hover)] sm:w-auto"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Nuevo cliente
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
        aria-label="Lista de clientes. Usa flechas arriba y abajo para moverte, Enter para abrir."
      >
        {loading ? (
          <div className="min-h-[280px] animate-pulse rounded-3xl bg-white dark:bg-slate-900" aria-hidden />
        ) : !showSearch && customers.length === 0 ? (
          <div className="rounded-3xl bg-white px-6 py-10 text-center dark:bg-slate-900">
            <p className="text-[15px] font-semibold text-slate-800 dark:text-slate-200">Aún no tienes clientes</p>
            <p className="mt-2 text-[13px] font-medium text-slate-500 dark:text-slate-400">
              Registra tu primer cliente para verlo aquí.
            </p>
            <Link
              href="/clientes/nueva"
              className="mt-6 inline-flex h-9 items-center gap-2 rounded-xl bg-[color:var(--shell-sidebar)] px-4 text-[13px] font-medium text-white transition-colors hover:bg-[color:var(--shell-sidebar-cta-hover)]"
            >
              Nuevo cliente
            </Link>
          </div>
        ) : (
          <>
            <div className="space-y-6 rounded-3xl bg-white px-5 py-6 dark:bg-slate-900 sm:px-7 sm:py-7">
              {showSearch && (
                <div className="relative min-w-0">
                  <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-zinc-500">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </span>
                  <input
                    type="search"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    placeholder="Buscar por nombre, cédula, email o teléfono…"
                    className={workspaceFilterSearchPillClass}
                  />
                </div>
              )}
            {customers.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-200 px-6 py-14 text-center dark:border-slate-700">
                <p className="text-[15px] font-semibold text-slate-800 dark:text-slate-200">
                  {debouncedSearch.trim() ? "Ningún cliente coincide con la búsqueda" : "Sin resultados en esta página"}
                </p>
                <p className="mt-2 text-[13px] font-medium text-slate-500 dark:text-slate-400">
                  {debouncedSearch.trim() ? "Prueba con otro término o revisa la ortografía." : "Cambia de página o ajusta el filtro."}
                </p>
              </div>
            ) : (
              <>
            <div className="hidden overflow-hidden rounded-2xl border border-slate-100 dark:border-zinc-800/80 xl:block">
              <div
                className="grid grid-cols-[minmax(200px,2fr)_minmax(72px,0.75fr)_minmax(100px,1.1fr)_minmax(88px,0.95fr)_minmax(120px,1.4fr)_minmax(96px,auto)] gap-x-6 border-b border-slate-100 px-5 py-3.5 dark:border-zinc-800/80"
                aria-hidden
              >
                <div className="min-w-0 text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-500">Cliente</div>
                <div className="min-w-0 text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-500">Cédula</div>
                <div className="min-w-0 text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-500">Email</div>
                <div className="min-w-0 text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-500">Teléfono</div>
                <div className="min-w-0 text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-500">Dirección</div>
                <div className="min-w-0 text-right text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-zinc-500">Acciones</div>
              </div>
              <div className="divide-y divide-slate-100 dark:divide-zinc-800/70">
              {customers.map((c, index) => {
                const isSelected = index === selectedIndex;
                const addrs = c.customer_addresses ?? [];
                const sortedAddrs = [...addrs].sort((a, b) => (a.is_default ? -1 : 0) - (b.is_default ? -1 : 0) || a.display_order - b.display_order);
                const firstAddr = sortedAddrs[0];
                const avatarSeed = `${c.email || c.name || c.id}-${getAvatarVariant(null)}`;
                return (
                  <div
                    key={c.id}
                    ref={(el) => { cardRefs.current[index] = el; }}
                    role="button"
                    tabIndex={-1}
                    onClick={() => router.push(`/clientes/${c.id}`)}
                    className={`cursor-pointer grid grid-cols-[minmax(200px,2fr)_minmax(72px,0.75fr)_minmax(100px,1.1fr)_minmax(88px,0.95fr)_minmax(120px,1.4fr)_minmax(96px,auto)] gap-x-6 px-5 py-4 transition-colors duration-150 ${
                      isSelected
                        ? "bg-slate-50 hover:bg-slate-100/95 dark:bg-zinc-900/70 dark:hover:bg-zinc-900/85"
                        : "hover:bg-slate-100/90 dark:hover:bg-zinc-900/35"
                    }`}
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                        <WorkspaceCharacterAvatar seed={avatarSeed} size={80} className="h-full w-full object-cover" />
                      </div>
                      <p className="truncate text-[15px] font-medium tracking-tight text-slate-900 dark:text-slate-50">{c.name}</p>
                    </div>
                    <div className="min-w-0 self-center">
                      <p className="truncate text-[13px] font-medium text-slate-700 dark:text-slate-200">{c.cedula ? `CC ${c.cedula}` : "—"}</p>
                    </div>
                    <div className="min-w-0 self-center">
                      <p className="truncate text-[13px] font-medium text-slate-700 dark:text-slate-200">{c.email || "—"}</p>
                    </div>
                    <div className="min-w-0 self-center">
                      <p className="truncate text-[13px] font-medium text-slate-700 dark:text-slate-200">{c.phone || "—"}</p>
                    </div>
                    <div className="min-w-0 self-center">
                      {firstAddr ? (
                        <>
                          <p className="truncate text-[13px] font-medium text-slate-700 dark:text-slate-200" title={firstAddr.address}>
                            {addrs.length > 1 ? `${firstAddr.label}: ${firstAddr.address}` : firstAddr.address}
                          </p>
                          {firstAddr.reference_point && (
                            <p className="mt-0.5 truncate text-[12px] font-medium text-slate-500 dark:text-slate-400" title={firstAddr.reference_point}>
                              Ref: {firstAddr.reference_point}
                            </p>
                          )}
                          {addrs.length > 1 && (
                            <p className="mt-0.5 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                              +{addrs.length - 1} {addrs.length === 2 ? "dirección más" : "direcciones más"}
                            </p>
                          )}
                        </>
                      ) : (
                        <p className="text-[13px] font-medium text-slate-400 dark:text-slate-500">—</p>
                      )}
                    </div>
                    <div className="flex items-center justify-end gap-0.5 self-center" onClick={(e) => e.stopPropagation()}>
                      <Link
                        href={`/clientes/${c.id}`}
                        className={actionIconClass}
                        aria-label="Ver detalle"
                        title="Ver detalle del cliente"
                      >
                        <MdOutlineVisibility className="h-5 w-5" aria-hidden />
                      </Link>
                      <Link
                        href={`/clientes/${c.id}/editar`}
                        className={actionIconClass}
                        aria-label="Editar"
                        title="Editar nombre, cédula, contacto y direcciones"
                      >
                        <MdOutlineEdit className="h-5 w-5" aria-hidden />
                      </Link>
                    </div>
                  </div>
                );
              })}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:hidden pt-1">
              {customers.map((c, index) => {
                const isSelected = index === selectedIndex;
                const addrs = c.customer_addresses ?? [];
                const sortedAddrs = [...addrs].sort((a, b) => (a.is_default ? -1 : 0) - (b.is_default ? -1 : 0) || a.display_order - b.display_order);
                const firstAddr = sortedAddrs[0];
                const avatarSeed = `${c.email || c.name || c.id}-${getAvatarVariant(null)}`;
                return (
                  <div
                    key={c.id}
                    ref={(el) => { cardRefs.current[index] = el; }}
                    role="button"
                    tabIndex={-1}
                    onClick={() => router.push(`/clientes/${c.id}`)}
                    className={`cursor-pointer rounded-2xl border border-slate-100 bg-slate-50/40 px-5 py-4 transition-[border-color,background-color,box-shadow] duration-150 dark:border-slate-800 dark:bg-slate-800/25 ${
                      isSelected
                        ? "ring-2 ring-slate-400/55 hover:border-slate-200 hover:bg-white hover:shadow-md dark:hover:border-slate-600 dark:hover:bg-slate-800/55 dark:hover:shadow-[0_4px_14px_rgba(0,0,0,0.25)]"
                        : "hover:border-slate-200 hover:bg-white hover:shadow-md dark:hover:border-slate-600 dark:hover:bg-slate-800/50 dark:hover:shadow-[0_4px_14px_rgba(0,0,0,0.25)]"
                    }`}
                  >
                    <div className="flex flex-col gap-3">
                      <div className="flex items-start gap-3">
                        <div className="h-11 w-11 shrink-0 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                          <WorkspaceCharacterAvatar seed={avatarSeed} size={88} className="h-full w-full object-cover" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-500">Cliente</p>
                          <p className="mt-0.5 truncate text-[15px] font-medium text-slate-900 dark:text-slate-50">{c.name}</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-500">Cédula</span>
                        <p className="text-[13px] font-medium text-slate-700 dark:text-slate-200">{c.cedula ? `CC ${c.cedula}` : "—"}</p>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-500">Email</span>
                        <p className="max-w-[58%] truncate text-right text-[13px] font-medium text-slate-700 dark:text-slate-200">{c.email || "—"}</p>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-500">Teléfono</span>
                        <p className="text-[13px] font-medium text-slate-700 dark:text-slate-200">{c.phone || "—"}</p>
                      </div>
                      <div className="space-y-1 border-t border-slate-100 pt-3 dark:border-slate-800">
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-500">Dirección</span>
                        <div className="min-w-0">
                          <p className="break-words text-[13px] font-medium text-slate-700 dark:text-slate-200" title={firstAddr?.address}>
                            {firstAddr ? (addrs.length > 1 ? `${firstAddr.label}: ${firstAddr.address}` : firstAddr.address) : "—"}
                          </p>
                          {addrs.length > 1 && (
                            <p className="mt-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                              +{addrs.length - 1} {addrs.length === 2 ? "dirección más" : "direcciones más"}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center justify-end gap-1 border-t border-slate-100 pt-3 dark:border-slate-800" onClick={(e) => e.stopPropagation()}>
                        <Link href={`/clientes/${c.id}`} className={actionIconClass} title="Ver detalle" aria-label="Ver detalle">
                          <MdOutlineVisibility className="h-5 w-5" aria-hidden />
                        </Link>
                        <Link href={`/clientes/${c.id}/editar`} className={actionIconClass} title="Editar" aria-label="Editar">
                          <MdOutlineEdit className="h-5 w-5" aria-hidden />
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
          </>
        )}
      </section>


      {paginationBar}
    </div>
  );
}
