"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useRef, useCallback } from "react";
import { SearchParamsBoundary } from "@/app/components/SearchParamsBoundary";
import { useSession } from "@/app/components/SessionProvider";
import { ACTIVE_BRANCH_CHANGED_EVENT } from "@/lib/active-branch";
import {
  clearClientesListCache,
  clientesListCacheKey,
  getCachedClientesList,
  prefetchClienteDetails,
  setCachedClientesList,
} from "@/lib/clientes-detail-cache";
import { MdOutlineEdit, MdOutlineVisibility } from "react-icons/md";
import WorkspaceCharacterAvatar from "@/app/components/WorkspaceCharacterAvatar";
import { getAvatarVariant } from "@/app/components/app-nav-data";

const PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 350;
const REPORTS_SURFACE = "berea-reports-surface";

const bereaFieldClass =
  "h-11 w-full rounded-xl border border-[var(--shell-workspace-search-border)] bg-[var(--shell-workspace-search-bg)] text-[14px] text-[var(--berea-ink)] shadow-[inset_0_0_0_0.5px_rgba(44,40,36,0.04)] outline-none transition-[border-color,box-shadow] placeholder:text-[var(--berea-ink-muted)] focus:border-[rgba(44,40,36,0.22)] focus:ring-0 dark:border-[var(--shell-nav-border)] dark:bg-[var(--shell-nav-card-bg)] dark:text-[var(--shell-nav-fg)] dark:placeholder:text-[var(--shell-nav-fg-subtle)]";

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

function CustomersPage() {
  const { branch, ready: sessionReady } = useSession();
  const branchId = branch?.id ?? null;
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | HTMLTableRowElement | null)[]>([]);
  const hasFocusedList = useRef(false);
  const fetchRequestId = useRef(0);
  const prevDebouncedSearch = useRef<string | undefined>(undefined);
  const [activeBranchEpoch, setActiveBranchEpoch] = useState(0);
  const router = useRouter();
  const searchParams = useSearchParams();

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
    if (!sessionReady) {
      setLoading(true);
      return;
    }
    if (!branchId) {
      setCustomers([]);
      setTotalCount(0);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    let cancelled = false;
    const reqId = ++fetchRequestId.current;
    const cacheKey = clientesListCacheKey({
      branchId,
      page,
      search: debouncedSearch,
      refreshKey,
    });
    const cached = getCachedClientesList(cacheKey);
    const useCache = Boolean(cached);

    if (useCache) {
      setRefreshing(true);
    } else if (customers.length === 0) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }

    (async () => {
      try {
        type Bundle = { customers: CustomerRow[]; totalCount: number };
        let bundle: Bundle;

        if (useCache) {
          bundle = cached as Bundle;
        } else {
          const params = new URLSearchParams({
            branchId,
            page: String(page),
            pageSize: String(PAGE_SIZE),
            search: debouncedSearch,
          });
          const res = await fetch(`/api/clientes/query-bundle?${params.toString()}`, {
            credentials: "include",
          });
          if (!res.ok) {
            const err = (await res.json().catch(() => ({}))) as { error?: string };
            throw new Error(err.error ?? "No se pudo cargar clientes");
          }
          bundle = (await res.json()) as Bundle;
          setCachedClientesList(cacheKey, bundle);
        }

        if (cancelled || reqId !== fetchRequestId.current) return;
        setCustomers(bundle.customers);
        setTotalCount(bundle.totalCount);
        prefetchClienteDetails(bundle.customers.map((c) => c.id), branchId);
      } catch {
        if (!cancelled && reqId === fetchRequestId.current) {
          setCustomers([]);
          setTotalCount(0);
        }
      } finally {
        if (!cancelled && reqId === fetchRequestId.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [sessionReady, branchId, refreshKey, page, debouncedSearch, activeBranchEpoch]);

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
    <div className={`flex flex-wrap items-center justify-between gap-2 rounded-xl px-4 py-3 sm:px-5 ${REPORTS_SURFACE}`}>
      <p className="text-[13px] font-medium text-[var(--berea-ink-muted)] md:text-[14px]">
        {totalCount} {totalCount === 1 ? "cliente" : "clientes"}
        {totalPages > 1 && <> · Página {page} de {totalPages}</>}
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
              <span key={`ellipsis-${i}`} className="px-2 text-[var(--berea-ink-subtle)]">…</span>
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

  const showSearch =
    totalCount > 0 ||
    searchInput.trim() !== "" ||
    debouncedSearch.trim() !== "";

  return (
    <div className="berea-reports mx-auto min-w-0 max-w-[1600px] space-y-5 text-[15px] text-[var(--berea-ink)] sm:space-y-6">
      <header className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between lg:gap-6">
        <div className="min-w-0 shrink-0">
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--berea-ink)] sm:text-[1.65rem]">Clientes</h1>
          <p className="mt-0.5 text-[14px] text-[var(--berea-ink-muted)]">
            Lista de esta sucursal. Busca por nombre, cédula, email o teléfono.
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  clearClientesListCache();
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
                href="/clientes/nueva"
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-[color:var(--shell-sidebar)] px-4 text-[13px] font-semibold text-white shadow-sm transition-colors hover:bg-[color:var(--shell-sidebar-cta-hover)]"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
            Nuevo cliente
          </Link>
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
          <div className={`min-h-[280px] animate-pulse rounded-xl ${REPORTS_SURFACE}`} aria-hidden />
        ) : !showSearch && customers.length === 0 ? (
          <div className={`rounded-xl px-6 py-10 text-center ${REPORTS_SURFACE}`}>
            <p className="text-[15px] font-semibold text-[var(--berea-ink)]">Aún no tienes clientes</p>
            <p className="mt-2 text-[13px] text-[var(--berea-ink-muted)]">
              Registra tu primer cliente para verlo aquí.
            </p>
            <Link
              href="/clientes/nueva"
              className="mt-6 inline-flex h-10 items-center gap-2 rounded-lg bg-[color:var(--shell-sidebar)] px-4 text-[13px] font-semibold text-white transition-colors hover:bg-[color:var(--shell-sidebar-cta-hover)]"
            >
              Nuevo cliente
            </Link>
          </div>
        ) : (
          <>
            <div className={`space-y-6 rounded-xl p-5 sm:p-6 ${REPORTS_SURFACE}`}>
              {showSearch && (
                <div className="relative min-w-0">
                  <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--berea-ink-muted)]">
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </span>
                  <input
                    type="search"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    placeholder="Buscar por nombre, cédula, email o teléfono…"
                    className={`${bereaFieldClass} py-2.5 pl-11 pr-4`}
                  />
                </div>
              )}
            {customers.length === 0 ? (
              <div className="px-2 py-8 text-center sm:px-4">
                <p className="text-[15px] font-semibold text-[var(--berea-ink)]">
                  {debouncedSearch.trim() ? "Ningún cliente coincide con la búsqueda" : "Sin resultados en esta página"}
                </p>
                <p className="mt-2 text-[13px] text-[var(--berea-ink-muted)]">
                  {debouncedSearch.trim() ? "Prueba con otro término o revisa la ortografía." : "Cambia de página o ajusta el filtro."}
                </p>
              </div>
            ) : (
              <>
            <div className="hidden overflow-x-auto xl:block">
              <div
                className="grid grid-cols-[minmax(200px,2fr)_minmax(72px,0.75fr)_minmax(100px,1.1fr)_minmax(88px,0.95fr)_minmax(120px,1.4fr)_minmax(96px,auto)] gap-x-6 border-b border-[var(--berea-card-border)] pb-3 text-[13px] text-[var(--berea-ink-muted)]"
                aria-hidden
              >
                <div className="min-w-0 font-semibold">Cliente</div>
                <div className="min-w-0 font-semibold">Cédula</div>
                <div className="min-w-0 font-semibold">Email</div>
                <div className="min-w-0 font-semibold">Teléfono</div>
                <div className="min-w-0 font-semibold">Dirección</div>
                <div className="min-w-0 text-right font-semibold">Acciones</div>
              </div>
              <div className="">
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
                    onMouseEnter={() => branchId && prefetchClienteDetails([c.id], branchId)}
                    className={`cursor-pointer grid grid-cols-[minmax(200px,2fr)_minmax(72px,0.75fr)_minmax(100px,1.1fr)_minmax(88px,0.95fr)_minmax(120px,1.4fr)_minmax(96px,auto)] gap-x-6 py-4 transition-colors ${
                      isSelected
                        ? "bg-[var(--shell-workspace)]"
                        : "hover:bg-[var(--shell-workspace)]/70"
                    }`}
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-[var(--shell-workspace)]">
                        <WorkspaceCharacterAvatar seed={avatarSeed} size={80} className="h-full w-full object-cover" />
                      </div>
                      <p className="truncate text-[15px] font-semibold text-[var(--berea-ink)]">{c.name}</p>
                    </div>
                    <div className="min-w-0 self-center">
                      <p className="truncate text-[14px] font-medium text-[var(--berea-ink)]">{c.cedula ? `CC ${c.cedula}` : "—"}</p>
                    </div>
                    <div className="min-w-0 self-center">
                      <p className="truncate text-[14px] font-medium text-[var(--berea-ink)]">{c.email || "—"}</p>
                    </div>
                    <div className="min-w-0 self-center">
                      <p className="truncate text-[14px] font-medium text-[var(--berea-ink)]">{c.phone || "—"}</p>
                    </div>
                    <div className="min-w-0 self-center">
                      {firstAddr ? (
                        <>
                          <p className="truncate text-[14px] font-medium text-[var(--berea-ink)]" title={firstAddr.address}>
                            {addrs.length > 1 ? `${firstAddr.label}: ${firstAddr.address}` : firstAddr.address}
                          </p>
                          {firstAddr.reference_point && (
                            <p className="mt-0.5 truncate text-[12px] text-[var(--berea-ink-muted)]" title={firstAddr.reference_point}>
                              Ref: {firstAddr.reference_point}
                            </p>
                          )}
                          {addrs.length > 1 && (
                            <p className="mt-0.5 text-[12px] text-[var(--berea-ink-muted)]">
                              +{addrs.length - 1} {addrs.length === 2 ? "dirección más" : "direcciones más"}
                            </p>
                          )}
                        </>
                      ) : (
                        <p className="text-[14px] text-[var(--berea-ink-muted)]">—</p>
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

            <div className="grid grid-cols-1 gap-4 pt-2 sm:grid-cols-2 xl:hidden">
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
                    onMouseEnter={() => branchId && prefetchClienteDetails([c.id], branchId)}
                    className={`cursor-pointer rounded-xl border border-[var(--berea-card-border)] bg-[var(--shell-workspace)] px-5 py-4 transition-colors ${
                      isSelected
                        ? "ring-2 ring-[var(--berea-accent)]/30"
                        : "hover:bg-white"
                    }`}
                  >
                    <div className="flex flex-col gap-3">
                      <div className="flex items-start gap-3">
                        <div className="h-11 w-11 shrink-0 overflow-hidden rounded-full bg-[var(--shell-workspace)]">
                          <WorkspaceCharacterAvatar seed={avatarSeed} size={88} className="h-full w-full object-cover" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--berea-ink-muted)]">Cliente</p>
                          <p className="mt-0.5 truncate text-[15px] font-semibold text-[var(--berea-ink)]">{c.name}</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between gap-2 border-t border-[var(--berea-card-border)] pt-3">
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--berea-ink-muted)]">Cédula</span>
                        <p className="text-[14px] font-medium text-[var(--berea-ink)]">{c.cedula ? `CC ${c.cedula}` : "—"}</p>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--berea-ink-muted)]">Email</span>
                        <p className="max-w-[58%] truncate text-right text-[14px] font-medium text-[var(--berea-ink)]">{c.email || "—"}</p>
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--berea-ink-muted)]">Teléfono</span>
                        <p className="text-[14px] font-medium text-[var(--berea-ink)]">{c.phone || "—"}</p>
                      </div>
                      <div className="space-y-1 border-t border-[var(--berea-card-border)] pt-3">
                        <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--berea-ink-muted)]">Dirección</span>
                        <div className="min-w-0">
                          <p className="break-words text-[14px] font-medium text-[var(--berea-ink)]" title={firstAddr?.address}>
                            {firstAddr ? (addrs.length > 1 ? `${firstAddr.label}: ${firstAddr.address}` : firstAddr.address) : "—"}
                          </p>
                          {addrs.length > 1 && (
                            <p className="mt-1 text-[12px] text-[var(--berea-ink-muted)]">
                              +{addrs.length - 1} {addrs.length === 2 ? "dirección más" : "direcciones más"}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center justify-end gap-1 border-t border-[var(--berea-card-border)] pt-3" onClick={(e) => e.stopPropagation()}>
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

export default function ClientesPage() {
  return (
    <SearchParamsBoundary>
      <CustomersPage />
    </SearchParamsBoundary>
  );
}
