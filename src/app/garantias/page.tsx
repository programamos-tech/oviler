"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useMemo } from "react";
import { useSession } from "@/app/components/SessionProvider";
import { ACTIVE_BRANCH_CHANGED_EVENT } from "@/lib/active-branch";
import { STORE_TECH_COPY } from "@/lib/store-tech-copy";

const G = STORE_TECH_COPY.garantias;
import {
  shouldShowListSkeleton,
  visibleCountFromCache,
  visibleRowsFromCache,
} from "@/lib/list-page-display";
import {
  clearGarantiasListCache,
  garantiasListCacheKey,
  getCachedGarantiasList,
  prefetchGarantiaDetails,
  setCachedGarantiasList,
} from "@/lib/garantias-detail-cache";

const PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 300;

const REPORTS_SURFACE = "berea-reports-surface";

const bereaFieldClass =
  "h-11 w-full rounded-xl border border-[var(--shell-workspace-search-border)] bg-[var(--shell-workspace-search-bg)] text-[14px] text-[var(--berea-ink)] shadow-[inset_0_0_0_0.5px_rgba(44,40,36,0.04)] outline-none transition-[border-color,box-shadow] placeholder:text-[var(--berea-ink-muted)] focus:border-[rgba(44,40,36,0.22)] focus:ring-0 dark:border-[var(--shell-nav-border)] dark:bg-[var(--shell-nav-card-bg)] dark:text-[var(--shell-nav-fg)] dark:placeholder:text-[var(--shell-nav-fg-subtle)]";

const bereaFilterLabel = "block text-[11px] font-semibold uppercase tracking-wider text-[var(--berea-ink-muted)]";

function formatDateShort(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("es-CO", { day: "2-digit", month: "short" });
}

function formatTime(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" });
}

type WarrantyRow = {
  id: string;
  warranty_type: "exchange" | "refund" | "repair";
  status: "pending" | "approved" | "rejected" | "processed";
  created_at: string;
  customers: { name: string } | null;
  products: { name: string } | null;
  sales: { invoice_number: string; created_at: string; branch_id?: string | null } | null;
};

const WARRANTY_TYPE_LABELS: Record<string, string> = {
  exchange: "Cambio",
  refund: "Devolución",
  repair: "Reparación",
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Pendiente",
  approved: "Aprobada",
  rejected: "Rechazada",
  processed: "Procesada",
};

const BEREA_STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-100 text-amber-950 ring-amber-300",
  approved: "bg-emerald-100 text-emerald-900 ring-emerald-300",
  rejected: "bg-rose-100 text-rose-900 ring-rose-300",
  processed: "bg-sky-100 text-sky-950 ring-sky-300",
};

const statusBadgeClass = (status: string) =>
  `inline-flex rounded-md px-2.5 py-1 text-[13px] font-semibold ring-1 ring-inset ${BEREA_STATUS_STYLES[status] ?? BEREA_STATUS_STYLES.pending}`;

type TypeFilter = "all" | "exchange" | "refund" | "repair";

function WarrantyFilters({
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusChange,
  typeFilter,
  onTypeChange,
}: {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  statusFilter: string;
  onStatusChange: (value: string) => void;
  typeFilter: TypeFilter;
  onTypeChange: (value: TypeFilter) => void;
}) {
  return (
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
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={G.searchPlaceholder}
          className={`${bereaFieldClass} py-2.5 pl-11 pr-4`}
        />
      </div>
      <div className="grid min-w-0 w-full grid-cols-2 gap-2 sm:gap-3 lg:w-auto lg:shrink-0 lg:gap-3">
        <div className="min-w-0 space-y-1.5">
          <label htmlFor="garantias-filter-status" className={bereaFilterLabel}>
            Estado
          </label>
          <select
            id="garantias-filter-status"
            value={statusFilter}
            onChange={(e) => onStatusChange(e.target.value)}
            className={`${bereaFieldClass} px-3 font-medium`}
          >
            <option value="all">Todas</option>
            <option value="pending">Pendientes</option>
            <option value="approved">Aprobadas</option>
            <option value="rejected">Rechazadas</option>
            <option value="processed">Procesadas</option>
          </select>
        </div>
        <div className="min-w-0 space-y-1.5">
          <label htmlFor="garantias-filter-type" className={bereaFilterLabel}>
            Tipo
          </label>
          <select
            id="garantias-filter-type"
            value={typeFilter}
            onChange={(e) => onTypeChange(e.target.value as TypeFilter)}
            className={`${bereaFieldClass} px-3 font-medium`}
          >
            <option value="all">Todos</option>
            <option value="exchange">Cambio</option>
            <option value="refund">Devolución</option>
            <option value="repair">Reparación</option>
          </select>
        </div>
      </div>
    </div>
  );
}

export default function WarrantiesPage() {
  const router = useRouter();
  const { branch, ready: sessionReady } = useSession();
  const branchId = branch?.id ?? null;
  const [warranties, setWarranties] = useState<WarrantyRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchQueryDebounced, setSearchQueryDebounced] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);
  const [activeBranchEpoch, setActiveBranchEpoch] = useState(0);

  const listCacheKey = useMemo(() => {
    if (!branchId) return null;
    return garantiasListCacheKey({
      branchId,
      page,
      search: searchQueryDebounced,
      status: statusFilter,
      type: typeFilter,
      refreshKey,
    });
  }, [branchId, page, searchQueryDebounced, statusFilter, typeFilter, refreshKey]);

  type GarantiasListBundle = { warranties: WarrantyRow[]; totalCount: number };

  const cachedList = useMemo(
    () => (listCacheKey ? (getCachedGarantiasList(listCacheKey) as GarantiasListBundle | null) : null),
    [listCacheKey]
  );
  const displayWarranties = useMemo(
    () => visibleRowsFromCache(warranties, cachedList?.warranties),
    [warranties, cachedList]
  );
  const displayTotalCount = useMemo(
    () => visibleCountFromCache(totalCount, cachedList?.totalCount),
    [totalCount, cachedList]
  );
  const showListLoading = shouldShowListSkeleton(loading, displayWarranties.length, sessionReady);

  useEffect(() => {
    const onBranch = () => {
      setActiveBranchEpoch((n) => n + 1);
      setPage(1);
    };
    window.addEventListener(ACTIVE_BRANCH_CHANGED_EVENT, onBranch);
    return () => window.removeEventListener(ACTIVE_BRANCH_CHANGED_EVENT, onBranch);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setSearchQueryDebounced(searchQuery), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [searchQuery]);

  useEffect(() => {
    setPage(1);
  }, [searchQueryDebounced, statusFilter, typeFilter]);

  useEffect(() => {
    if (!sessionReady) return;
    if (!branchId) {
      setWarranties([]);
      setTotalCount(0);
      setLoadError(null);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    let cancelled = false;
    const cacheKey = garantiasListCacheKey({
      branchId,
      page,
      search: searchQueryDebounced,
      status: statusFilter,
      type: typeFilter,
      refreshKey,
    });
    const cached = getCachedGarantiasList(cacheKey);

    type Bundle = { warranties: WarrantyRow[]; totalCount: number };

    if (cached) {
      const bundle = cached as Bundle;
      setWarranties(bundle.warranties);
      setTotalCount(bundle.totalCount);
      setLoadError(null);
      setLoading(false);
      setRefreshing(false);
      prefetchGarantiaDetails(bundle.warranties.map((w) => w.id), branchId);
      return () => {
        cancelled = true;
      };
    }

    if (warranties.length === 0) setLoading(true);
    else setRefreshing(true);
    setLoadError(null);

    (async () => {
      try {
        const params = new URLSearchParams({
          branchId,
          page: String(page),
          pageSize: String(PAGE_SIZE),
          search: searchQueryDebounced,
          status: statusFilter,
          type: typeFilter,
        });
        const res = await fetch(`/api/garantias/query-bundle?${params.toString()}`, {
          credentials: "include",
        });
        if (!res.ok) {
          const err = (await res.json().catch(() => ({}))) as { error?: string };
          throw new Error(err.error ?? "Error al cargar garantías");
        }
        const bundle = (await res.json()) as Bundle;
        setCachedGarantiasList(cacheKey, bundle);

        if (cancelled) return;
        setWarranties(bundle.warranties);
        setTotalCount(bundle.totalCount);
        prefetchGarantiaDetails(bundle.warranties.map((w) => w.id), branchId);
      } catch (e) {
        if (!cancelled) {
          setLoadError(e instanceof Error ? e.message : "Error al cargar garantías");
          setWarranties([]);
          setTotalCount(0);
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
    page,
    searchQueryDebounced,
    statusFilter,
    typeFilter,
    refreshKey,
    activeBranchEpoch,
  ]);

  const filteredWarranties = displayWarranties;

  const totalPages = Math.max(1, Math.ceil(displayTotalCount / PAGE_SIZE));
  const showPagination = !showListLoading && !loadError && displayTotalCount > PAGE_SIZE;

  const actionIconClass =
    "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[var(--berea-ink-subtle)] transition-colors hover:bg-[var(--shell-workspace)] hover:text-[var(--berea-accent)]";

  const filterProps = {
    searchQuery,
    onSearchChange: setSearchQuery,
    statusFilter,
    onStatusChange: setStatusFilter,
    typeFilter,
    onTypeChange: setTypeFilter,
  };

  return (
    <div className="berea-reports mx-auto min-w-0 max-w-[1600px] space-y-5 text-[15px] text-[var(--berea-ink)] sm:space-y-6">
      <header className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between lg:gap-6">
        <div className="min-w-0 shrink-0">
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--berea-ink)] sm:text-[1.65rem]">
            {G.title}
          </h1>
          <p className="mt-0.5 text-[14px] text-[var(--berea-ink-muted)]">
            {G.subtitle}
          </p>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2 self-start lg:self-center">
        <Link
          href="/garantias/nueva"
          className="inline-flex h-10 shrink-0 items-center gap-2 rounded-lg bg-[color:var(--shell-sidebar)] px-4 text-[13px] font-semibold text-white shadow-sm transition-colors hover:bg-[color:var(--shell-sidebar-cta-hover)]"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nueva garantía
        </Link>
        <button
          type="button"
          onClick={() => {
            clearGarantiasListCache();
            setRefreshKey((k) => k + 1);
          }}
          className={`inline-flex h-10 shrink-0 items-center gap-2 rounded-lg px-3.5 text-[13px] font-semibold text-[var(--berea-ink)] hover:bg-[var(--shell-workspace)] ${REPORTS_SURFACE}`}
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Actualizar
        </button>
        </div>
      </header>

      {loadError && (
        <div className={`rounded-xl px-6 py-10 text-center ${REPORTS_SURFACE}`}>
          <p className="text-[15px] font-semibold text-amber-900">Error al cargar garantías</p>
          <p className="mt-2 text-[13px] text-[var(--berea-ink-muted)]">{loadError}</p>
          <p className="mt-3 text-[12px] text-[var(--berea-ink-subtle)]">
            Comprueba que tu usuario tenga sucursal asignada y permisos. Si el error continúa, revisa la consola del navegador.
          </p>
        </div>
      )}

      <section className="outline-none">
        {showListLoading ? (
          <div className={`min-h-[280px] animate-pulse rounded-xl ${REPORTS_SURFACE}`} aria-hidden />
        ) : filteredWarranties.length === 0 ? (
          <div className={`space-y-6 rounded-xl p-5 sm:p-6 ${REPORTS_SURFACE}`}>
            <WarrantyFilters {...filterProps} />
            <div className="px-2 py-8 text-center sm:px-4">
              <p className="text-[15px] font-semibold text-[var(--berea-ink)]">
                {displayTotalCount === 0 && statusFilter === "all" && typeFilter === "all" && !searchQueryDebounced.trim()
                  ? G.emptyTitle
                  : G.emptyFiltered}
              </p>
              <p className="mt-2 text-[13px] text-[var(--berea-ink-muted)]">
                {displayTotalCount === 0 && statusFilter === "all" && typeFilter === "all" && !searchQueryDebounced.trim()
                  ? G.emptyHint
                  : G.emptyFilteredHint}
              </p>
              {displayTotalCount === 0 && statusFilter === "all" && typeFilter === "all" && !searchQueryDebounced.trim() && (
                <Link
                  href="/garantias/nueva"
                  className="mt-6 inline-flex h-10 items-center gap-2 rounded-lg bg-[color:var(--shell-sidebar)] px-4 text-[13px] font-semibold text-white transition-colors hover:bg-[color:var(--shell-sidebar-cta-hover)]"
                >
                  Nueva garantía
                </Link>
              )}
            </div>
          </div>
        ) : (
          <div className={`space-y-6 rounded-xl p-5 sm:p-6 ${REPORTS_SURFACE}${refreshing ? " opacity-[0.72] transition-opacity duration-200" : ""}`}>
            <WarrantyFilters {...filterProps} />

            <div className="hidden overflow-x-auto xl:block">
              <table className="w-full min-w-[880px] border-collapse text-left text-[14px] leading-relaxed">
                <thead>
                  <tr className="border-b border-[var(--berea-card-border)] text-[13px] text-[var(--berea-ink-muted)]">
                    <th className="pb-3 pr-4 font-semibold">Garantía</th>
                    <th className="pb-3 pr-4 font-semibold">Fecha</th>
                    <th className="pb-3 pr-4 font-semibold">Cliente</th>
                    <th className="pb-3 pr-4 font-semibold">Producto</th>
                    <th className="pb-3 pr-4 font-semibold">Tipo</th>
                    <th className="pb-3 pr-4 font-semibold">Estado</th>
                    <th className="pb-3 text-right font-semibold">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredWarranties.map((warranty) => (
                    <tr
                      key={warranty.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => router.push(`/garantias/${warranty.id}`)}
                      onMouseEnter={() => branchId && prefetchGarantiaDetails([warranty.id], branchId)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          router.push(`/garantias/${warranty.id}`);
                        }
                      }}
                      className="cursor-pointer transition-colors hover:bg-[var(--shell-workspace)]/70"
                    >
                      <td className="py-4 pr-4">
                        <div className="flex min-w-0 items-center gap-2.5">
                          <svg className="h-5 w-5 shrink-0 text-[var(--berea-ink-muted)]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                          </svg>
                          <span className="truncate text-[15px] font-semibold tabular-nums text-[var(--berea-ink)]">
                            #{warranty.id.slice(0, 8).toUpperCase()}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 pr-4 text-[var(--berea-ink-muted)]">
                        {formatTime(warranty.created_at)} · {formatDateShort(warranty.created_at)}
                      </td>
                      <td className="max-w-[12rem] truncate py-4 pr-4 font-medium text-[var(--berea-ink)]">
                        {warranty.customers?.name ?? "Cliente"}
                      </td>
                      <td className="max-w-[12rem] truncate py-4 pr-4 text-[var(--berea-ink-muted)]">
                        {warranty.products?.name ?? "Producto"}
                      </td>
                      <td className="py-4 pr-4 font-medium text-[var(--berea-ink)]">
                        {WARRANTY_TYPE_LABELS[warranty.warranty_type]}
                      </td>
                      <td className="py-4 pr-4">
                        <span className={statusBadgeClass(warranty.status)}>{STATUS_LABELS[warranty.status]}</span>
                      </td>
                      <td className="py-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <Link href={`/garantias/${warranty.id}`} className={actionIconClass} aria-label="Ver detalle">
                          <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="grid grid-cols-1 gap-4 pt-2 sm:grid-cols-2 xl:hidden">
              {filteredWarranties.map((warranty) => (
                <div
                  key={warranty.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => router.push(`/garantias/${warranty.id}`)}
                  onMouseEnter={() => branchId && prefetchGarantiaDetails([warranty.id], branchId)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      router.push(`/garantias/${warranty.id}`);
                    }
                  }}
                  className="cursor-pointer rounded-xl border border-[var(--berea-card-border)] bg-[var(--shell-workspace)] px-5 py-4 transition-colors hover:bg-white"
                >
                  <div className="flex flex-col gap-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate text-[15px] font-semibold tabular-nums text-[var(--berea-ink)]">
                        #{warranty.id.slice(0, 8).toUpperCase()}
                      </span>
                      <span className={statusBadgeClass(warranty.status)}>{STATUS_LABELS[warranty.status]}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className={bereaFilterLabel}>Fecha</span>
                      <span className="text-[14px] text-[var(--berea-ink-muted)]">
                        {formatTime(warranty.created_at)} · {formatDateShort(warranty.created_at)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className={bereaFilterLabel}>Cliente</span>
                      <span className="truncate text-right text-[14px] font-medium text-[var(--berea-ink)]">
                        {warranty.customers?.name ?? "Cliente"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className={bereaFilterLabel}>Producto</span>
                      <span className="truncate text-right text-[14px] font-medium text-[var(--berea-ink)]">
                        {warranty.products?.name ?? "Producto"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2 border-t border-[var(--berea-card-border)] pt-3">
                      <span className={bereaFilterLabel}>Tipo</span>
                      <span className="text-[14px] font-medium text-[var(--berea-ink)]">
                        {WARRANTY_TYPE_LABELS[warranty.warranty_type]}
                      </span>
                    </div>
                    <div className="flex justify-end pt-1" onClick={(e) => e.stopPropagation()}>
                      <Link href={`/garantias/${warranty.id}`} className={actionIconClass} aria-label="Ver detalle">
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" aria-hidden>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {showPagination && (
        <div className={`flex flex-wrap items-center justify-between gap-2 rounded-xl px-4 py-3 sm:px-5 ${REPORTS_SURFACE}`}>
          <p className="text-[13px] font-medium text-[var(--berea-ink-muted)]">
            {displayTotalCount} {displayTotalCount === 1 ? "garantía" : "garantías"} · Página {page} de {totalPages}
          </p>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className={`inline-flex h-9 w-9 items-center justify-center rounded-lg text-[var(--berea-ink-muted)] transition-colors hover:bg-[var(--shell-workspace)] disabled:pointer-events-none disabled:opacity-50 ${REPORTS_SURFACE}`}
              aria-label="Página anterior"
            >
              ‹
            </button>
            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className={`inline-flex h-9 w-9 items-center justify-center rounded-lg text-[var(--berea-ink-muted)] transition-colors hover:bg-[var(--shell-workspace)] disabled:pointer-events-none disabled:opacity-50 ${REPORTS_SURFACE}`}
              aria-label="Página siguiente"
            >
              ›
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
